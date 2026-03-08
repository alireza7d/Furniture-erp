from app.database import SessionLocal
from app.models import User, DailySale, DailyExpense, MoneySummary
from datetime import date
from decimal import Decimal


def seed():
    db = SessionLocal()
    try:
        # Only seed if no users exist
        if db.query(User).count() > 0:
            return

        # Create owner
        owner = User(
            username="admin",
            full_name="Shop Owner",
            role="owner",
        )
        owner.set_password("admin123")
        db.add(owner)

        # Create employees
        emp1 = User(
            username="ahmed",
            full_name="Ahmed Al-Rashdi",
            role="employee",
        )
        emp1.set_password("ahmed123")
        db.add(emp1)

        emp2 = User(
            username="khalid",
            full_name="Khalid Al-Harthi",
            role="employee",
        )
        emp2.set_password("khalid123")
        db.add(emp2)

        emp3 = User(
            username="said",
            full_name="Said Al-Busaidi",
            role="employee",
        )
        emp3.set_password("said123")
        db.add(emp3)

        bakhtar = User(
            username="bakhtar",
            full_name="Bakhtar",
            role="owner",
        )
        bakhtar.set_password("bakhtar123")
        db.add(bakhtar)

        db.flush()

        # ── Real Sales Data (Jan-Feb 2026) ────────────────────────────────────
        sales_data = [
            {
                "date": date(2026, 1, 28),
                "customer_name": "Osman",
                "sale_type": "repair",
                "description": "Sofa repair for customer Osman",
                "amount": Decimal("190.000"),
                "payment_method": "cash",
            },
            {
                "date": date(2026, 2, 4),
                "customer_name": "Osman",
                "sale_type": "service",
                "description": "Install 3 items for Osman",
                "amount": Decimal("150.000"),
                "payment_method": "cash",
            },
            {
                "date": date(2026, 2, 2),
                "customer_name": "Louret",
                "sale_type": "service",
                "description": "Install 4 items for Louret",
                "amount": Decimal("620.000"),
                "payment_method": "cash",
            },
            {
                "date": date(2026, 2, 22),
                "customer_name": None,
                "sale_type": "service",
                "description": "Install screen / protector",
                "amount": Decimal("450.000"),
                "payment_method": "cash",
            },
            {
                "date": date(2026, 2, 22),
                "customer_name": None,
                "sale_type": "service",
                "description": "Install protector (another)",
                "amount": Decimal("530.000"),
                "payment_method": "cash",
            },
            {
                "date": date(2026, 1, 24),
                "customer_name": None,
                "sale_type": "service",
                "description": "Install item for customer",
                "amount": Decimal("350.000"),
                "payment_method": "cash",
            },
            {
                "date": date(2026, 1, 26),
                "customer_name": None,
                "sale_type": "sofa_sale",
                "description": "Sale of item (shop)",
                "amount": Decimal("90.000"),
                "payment_method": "cash",
            },
        ]

        for s in sales_data:
            sale = DailySale(
                date=s["date"],
                customer_name=s["customer_name"],
                sale_type=s["sale_type"],
                description=s["description"],
                amount=s["amount"],
                payment_method=s["payment_method"],
                employee_id=owner.id,
                created_by=owner.id,
            )
            db.add(sale)

        # ── Real Workshop & Shop Expenses ──────────────────────────────────────
        workshop_expenses = [
            {"date": date(2026, 1, 30), "category": "Tools", "description": "Work table", "amount": Decimal("25.000")},
            {"date": date(2026, 2, 2), "category": "Workshop Supplies", "description": "Workshop materials", "amount": Decimal("30.000")},
            {"date": date(2026, 2, 2), "category": "Glue", "description": "Glue", "amount": Decimal("1.000")},
            {"date": date(2026, 2, 3), "category": "Foam / Sponge", "description": "Sponge", "amount": Decimal("4.000")},
            {"date": date(2026, 2, 10), "category": "Tools", "description": "Repair equipment", "amount": Decimal("7.400")},
            {"date": date(2026, 2, 11), "category": "Workshop Supplies", "description": "Purchase materials", "amount": Decimal("62.685")},
            {"date": date(2026, 2, 10), "category": "Food", "description": "Food", "amount": Decimal("2.000")},
            {"date": date(2026, 2, 11), "category": "Workshop Supplies", "description": "Cable / materials", "amount": Decimal("19.250")},
            {"date": date(2026, 2, 11), "category": "Tools", "description": "Gas tools", "amount": Decimal("4.500")},
        ]

        # ── Real Car / Transport Expenses ──────────────────────────────────────
        transport_expenses = [
            {"date": date(2026, 2, 23), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("9.200")},
            {"date": date(2026, 2, 13), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("9.100")},
            {"date": date(2026, 2, 19), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("9.000")},
            {"date": date(2026, 2, 16), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("9.300")},
            {"date": date(2026, 2, 9), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("9.600")},
            {"date": date(2026, 2, 5), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("48.200")},
            {"date": date(2026, 2, 2), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("8.800")},
            {"date": date(2026, 1, 28), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("9.100")},
            {"date": date(2026, 1, 26), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("9.000")},
            {"date": date(2026, 1, 22), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("48.300")},
            {"date": date(2026, 3, 3), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("11.200")},
            {"date": date(2026, 3, 1), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("9.000")},
            {"date": date(2026, 2, 25), "category": "Petrol / Transport", "description": "Petrol", "amount": Decimal("9.400")},
        ]

        # ── Real Other Expenses ────────────────────────────────────────────────
        other_expenses = [
            {"date": date(2026, 2, 1), "category": "Water", "description": "Water for shop", "amount": Decimal("3.600")},
            {"date": date(2026, 2, 5), "category": "Maintenance", "description": "Repair cost", "amount": Decimal("48.200")},
            {"date": date(2026, 2, 1), "category": "Shop Rent", "description": "Shop rent", "amount": Decimal("160.000")},
            {"date": date(2026, 3, 1), "category": "Workshop Rent", "description": "Workshop rent (March)", "amount": Decimal("280.000")},
            {"date": date(2026, 2, 28), "category": "Salaries", "description": "February salaries", "amount": Decimal("280.000")},
            {"date": date(2026, 1, 31), "category": "Salaries", "description": "Salary (10 days January)", "amount": Decimal("93.300")},
            {"date": date(2026, 2, 1), "category": "Electricity", "description": "Electricity", "amount": Decimal("20.000")},
            {"date": date(2026, 2, 8), "category": "Workshop Supplies", "description": "Cable", "amount": Decimal("6.000")},
            {"date": date(2026, 2, 12), "category": "Workshop Supplies", "description": "Paint & materials", "amount": Decimal("50.000")},
            {"date": date(2026, 2, 6), "category": "Other Expenses", "description": "Notebook / office", "amount": Decimal("1.500")},
            {"date": date(2026, 2, 7), "category": "Tools", "description": "Tools", "amount": Decimal("3.400")},
            {"date": date(2026, 2, 15), "category": "Maintenance", "description": "Repair payment", "amount": Decimal("138.200")},
            {"date": date(2026, 2, 14), "category": "Workshop Supplies", "description": "Gas & cable", "amount": Decimal("95.000")},
            {"date": date(2026, 2, 18), "category": "Maintenance", "description": "Refrigerator repair", "amount": Decimal("7.600")},
            {"date": date(2026, 2, 6), "category": "Other Expenses", "description": "Pen", "amount": Decimal("2.600")},
        ]

        # Add all expenses
        all_expenses = workshop_expenses + transport_expenses + other_expenses
        for e in all_expenses:
            expense = DailyExpense(
                date=e["date"],
                category=e["category"],
                description=e["description"],
                amount=e["amount"],
                payment_method="cash",
                employee_id=owner.id,
                created_by=owner.id,
            )
            db.add(expense)

        # ── Money Summary Data ──────────────────────────────────────────────
        money_summary_data = [
            {
                "period": "10 days Jan + Feb 2026",
                "description": "Bank balance (10 days Jan + Feb)",
                "amount": Decimal("3921.215"),
                "entry_type": "bank_balance",
            },
            {
                "period": "10 days Jan + Feb 2026",
                "description": "Cash outside bank",
                "amount": Decimal("2305.215"),
                "entry_type": "cash",
            },
            {
                "period": "January 2026",
                "description": "Money received for 10 days",
                "amount": Decimal("416.000"),
                "entry_type": "received",
            },
            {
                "period": "February 2026",
                "description": "February cash",
                "amount": Decimal("1250.000"),
                "entry_type": "received",
            },
        ]

        for m in money_summary_data:
            summary = MoneySummary(
                period=m["period"],
                description=m["description"],
                amount=m["amount"],
                entry_type=m["entry_type"],
                created_by=owner.id,
            )
            db.add(summary)

        db.commit()
        print("Database seeded with real business data!")
        print("  Sales: 7 records, total 2,380.000 OMR")
        print("  Expenses: 37 records")
        print("    Workshop: 155.835 OMR")
        print("    Transport: 188.200 OMR (13 petrol entries)")
        print("    Other: 1,189.400 OMR")
        print("  Owner login: admin / admin123")
        print("  Employee logins: ahmed/ahmed123, khalid/khalid123, said/said123")
        print("  Owner login (Bakhtar): bakhtar/bakhtar123")

    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
    finally:
        db.close()

    # Ensure Bakhtar has owner role (even if already seeded)
    db2 = SessionLocal()
    try:
        bakhtar_user = db2.query(User).filter(User.username == "bakhtar").first()
        if bakhtar_user and bakhtar_user.role != "owner":
            bakhtar_user.role = "owner"
            db2.commit()
            print("  Updated Bakhtar to owner role")
    except Exception as e:
        db2.rollback()
        print(f"Bakhtar role update error: {e}")
    finally:
        db2.close()
