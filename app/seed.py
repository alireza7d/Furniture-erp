from app.database import SessionLocal
from app.models import User, DailySale, DailyExpense
from datetime import date, timedelta
from decimal import Decimal
import random


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

        db.flush()

        employees = [emp1, emp2, emp3]

        # Generate sample sales for the last 30 days
        sale_types = ["sofa_sale", "repair", "service", "other"]
        payment_methods = ["cash", "bank", "transfer"]
        customer_names = [
            "Mohammed Al-Balushi", "Fatma Al-Hinai", "Ali Al-Lawati",
            "Mariam Al-Kalbani", "Hassan Al-Zadjali", "Aisha Al-Rawahi",
            None, None,  # some without customer name
        ]
        sale_descriptions = [
            "3-seater sofa - beige fabric", "L-shaped sofa - brown leather",
            "Single sofa repair - cushion replacement", "Sofa set 3+2+1 - grey",
            "Ottoman and footrest", "Sofa cleaning service",
            "Custom sofa design consultation", "2-seater loveseat - navy blue",
            "Recliner sofa - black", "Sofa bed - convertible",
            "Armchair reupholstery", "Corner sofa unit",
        ]

        today = date.today()
        for i in range(60):
            d = today - timedelta(days=random.randint(0, 30))
            emp = random.choice(employees)
            sale = DailySale(
                date=d,
                customer_name=random.choice(customer_names),
                sale_type=random.choice(sale_types),
                description=random.choice(sale_descriptions),
                amount=Decimal(str(round(random.uniform(5, 500), 3))),
                payment_method=random.choice(payment_methods),
                employee_id=emp.id,
                created_by=emp.id,
            )
            db.add(sale)

        # Generate sample expenses for the last 30 days
        expense_categories = [
            "Foam / Sponge", "Fabric", "Glue", "Wood", "Tools",
            "Workshop Supplies", "Petrol / Transport", "Salaries",
            "Shop Rent", "Workshop Rent", "Electricity", "Water",
            "Food", "Maintenance", "Other Expenses",
        ]
        expense_descriptions = {
            "Foam / Sponge": ["High density foam sheets", "Sofa cushion foam", "Memory foam padding"],
            "Fabric": ["Velvet fabric 10m", "Leather roll", "Cotton upholstery fabric", "Linen blend"],
            "Glue": ["Industrial wood glue", "Fabric adhesive spray", "Contact cement"],
            "Wood": ["Pine planks", "Plywood sheets", "Hardwood beams", "MDF boards"],
            "Tools": ["Staple gun refills", "Cutting blade", "Sewing machine needle"],
            "Workshop Supplies": ["Sandpaper", "Screws and nails", "Paint and stain"],
            "Petrol / Transport": ["Delivery fuel", "Material pickup", "Customer delivery"],
            "Salaries": ["Monthly salary payment", "Overtime payment"],
            "Shop Rent": ["Monthly shop rent"],
            "Workshop Rent": ["Monthly workshop rent"],
            "Electricity": ["Monthly electricity bill"],
            "Water": ["Monthly water bill"],
            "Food": ["Lunch for workers", "Tea and coffee supplies"],
            "Maintenance": ["AC repair", "Tool maintenance", "Vehicle service"],
            "Other Expenses": ["Printing and stationery", "Phone recharge", "Miscellaneous"],
        }

        for i in range(45):
            d = today - timedelta(days=random.randint(0, 30))
            emp = random.choice(employees)
            cat = random.choice(expense_categories)
            desc_list = expense_descriptions.get(cat, ["General expense"])
            expense = DailyExpense(
                date=d,
                category=cat,
                description=random.choice(desc_list),
                amount=Decimal(str(round(random.uniform(1, 200), 3))),
                payment_method=random.choice(["cash", "bank"]),
                employee_id=emp.id,
                created_by=emp.id,
            )
            db.add(expense)

        db.commit()
        print("Database seeded with demo data!")
        print("  Owner login: admin / admin123")
        print("  Employee logins: ahmed/ahmed123, khalid/khalid123, said/said123")

    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
    finally:
        db.close()
