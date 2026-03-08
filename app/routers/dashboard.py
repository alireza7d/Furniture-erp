from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, timedelta
from decimal import Decimal

from app.database import get_db
from app.models import DailySale, DailyExpense, User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def to_float(val) -> float:
    if val is None:
        return 0.0
    return float(val)


@router.get("")
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)
    week_start = today - timedelta(days=today.weekday())

    # Build base queries with role filtering
    sales_q = db.query(DailySale)
    expenses_q = db.query(DailyExpense)
    if current_user.role == "employee":
        sales_q = sales_q.filter(DailySale.employee_id == current_user.id)
        expenses_q = expenses_q.filter(DailyExpense.employee_id == current_user.id)

    # Today's totals
    today_sales = to_float(
        sales_q.filter(DailySale.date == today)
        .with_entities(func.sum(DailySale.amount)).scalar()
    )
    today_expenses = to_float(
        expenses_q.filter(DailyExpense.date == today)
        .with_entities(func.sum(DailyExpense.amount)).scalar()
    )

    # This week
    week_sales = to_float(
        sales_q.filter(DailySale.date >= week_start)
        .with_entities(func.sum(DailySale.amount)).scalar()
    )
    week_expenses = to_float(
        expenses_q.filter(DailyExpense.date >= week_start)
        .with_entities(func.sum(DailyExpense.amount)).scalar()
    )

    # This month
    month_sales = to_float(
        sales_q.filter(DailySale.date >= month_start)
        .with_entities(func.sum(DailySale.amount)).scalar()
    )
    month_expenses = to_float(
        expenses_q.filter(DailyExpense.date >= month_start)
        .with_entities(func.sum(DailyExpense.amount)).scalar()
    )

    # This year
    year_sales = to_float(
        sales_q.filter(DailySale.date >= year_start)
        .with_entities(func.sum(DailySale.amount)).scalar()
    )
    year_expenses = to_float(
        expenses_q.filter(DailyExpense.date >= year_start)
        .with_entities(func.sum(DailyExpense.amount)).scalar()
    )

    # Recent activity (last 10 items)
    recent_sales = (
        sales_q.order_by(DailySale.created_at.desc()).limit(5).all()
    )
    recent_expenses = (
        expenses_q.order_by(DailyExpense.created_at.desc()).limit(5).all()
    )

    recent_activity = []
    for s in recent_sales:
        recent_activity.append({
            "type": "sale",
            "id": s.id,
            "date": s.date.isoformat(),
            "description": s.description or s.sale_type,
            "amount": str(s.amount),
            "employee": s.employee.full_name if s.employee else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    for e in recent_expenses:
        recent_activity.append({
            "type": "expense",
            "id": e.id,
            "date": e.date.isoformat(),
            "description": e.description or e.category,
            "amount": str(e.amount),
            "employee": e.employee.full_name if e.employee else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })
    recent_activity.sort(key=lambda x: x["created_at"] or "", reverse=True)
    recent_activity = recent_activity[:10]

    return {
        "today": {
            "sales": round(today_sales, 3),
            "expenses": round(today_expenses, 3),
            "profit": round(today_sales - today_expenses, 3),
        },
        "week": {
            "sales": round(week_sales, 3),
            "expenses": round(week_expenses, 3),
            "profit": round(week_sales - week_expenses, 3),
        },
        "month": {
            "sales": round(month_sales, 3),
            "expenses": round(month_expenses, 3),
            "profit": round(month_sales - month_expenses, 3),
        },
        "year": {
            "sales": round(year_sales, 3),
            "expenses": round(year_expenses, 3),
            "profit": round(year_sales - year_expenses, 3),
        },
        "recent_activity": recent_activity,
    }


@router.get("/charts")
def get_chart_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    year_start = today.replace(month=1, day=1)

    sales_q = db.query(DailySale)
    expenses_q = db.query(DailyExpense)
    if current_user.role == "employee":
        sales_q = sales_q.filter(DailySale.employee_id == current_user.id)
        expenses_q = expenses_q.filter(DailyExpense.employee_id == current_user.id)

    # Monthly sales vs expenses (current year)
    monthly_data = []
    for month in range(1, 13):
        m_sales = to_float(
            sales_q.filter(
                extract("year", DailySale.date) == today.year,
                extract("month", DailySale.date) == month,
            ).with_entities(func.sum(DailySale.amount)).scalar()
        )
        m_expenses = to_float(
            expenses_q.filter(
                extract("year", DailyExpense.date) == today.year,
                extract("month", DailyExpense.date) == month,
            ).with_entities(func.sum(DailyExpense.amount)).scalar()
        )
        monthly_data.append({
            "month": month,
            "sales": round(m_sales, 3),
            "expenses": round(m_expenses, 3),
            "profit": round(m_sales - m_expenses, 3),
        })

    # Expense breakdown by category (current year)
    expense_breakdown = (
        expenses_q.filter(DailyExpense.date >= year_start)
        .with_entities(DailyExpense.category, func.sum(DailyExpense.amount))
        .group_by(DailyExpense.category)
        .order_by(func.sum(DailyExpense.amount).desc())
        .all()
    )
    expense_by_category = [
        {"category": cat, "amount": round(to_float(amt), 3)}
        for cat, amt in expense_breakdown
    ]

    # Daily cash flow (last 30 days)
    thirty_days_ago = today - timedelta(days=30)
    daily_flow = []
    for i in range(30):
        d = thirty_days_ago + timedelta(days=i + 1)
        d_sales = to_float(
            sales_q.filter(DailySale.date == d)
            .with_entities(func.sum(DailySale.amount)).scalar()
        )
        d_expenses = to_float(
            expenses_q.filter(DailyExpense.date == d)
            .with_entities(func.sum(DailyExpense.amount)).scalar()
        )
        daily_flow.append({
            "date": d.isoformat(),
            "sales": round(d_sales, 3),
            "expenses": round(d_expenses, 3),
            "net": round(d_sales - d_expenses, 3),
        })

    # Top expense categories (current month)
    month_start = today.replace(day=1)
    top_categories = (
        expenses_q.filter(DailyExpense.date >= month_start)
        .with_entities(DailyExpense.category, func.sum(DailyExpense.amount))
        .group_by(DailyExpense.category)
        .order_by(func.sum(DailyExpense.amount).desc())
        .limit(5)
        .all()
    )
    top_expense_categories = [
        {"category": cat, "amount": round(to_float(amt), 3)}
        for cat, amt in top_categories
    ]

    return {
        "monthly": monthly_data,
        "expense_by_category": expense_by_category,
        "daily_cash_flow": daily_flow,
        "top_expense_categories": top_expense_categories,
    }
