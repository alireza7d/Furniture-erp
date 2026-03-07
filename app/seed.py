"""Seed the database with sample furniture company data."""
from datetime import date, datetime, timedelta
from app.database import SessionLocal
from app.models import *


def seed():
    db = SessionLocal()

    # Check if already seeded
    if db.query(Contact).first():
        print("Database already seeded.")
        db.close()
        return

    # ── Warehouse ──────────────────────────────────────────────────────────────
    wh = Warehouse(name="Main Warehouse", code="WH01", address="123 Factory Lane, Industrial District")
    showroom = Warehouse(name="Showroom", code="SHOW", address="456 Main Street, Downtown")
    db.add_all([wh, showroom])
    db.flush()

    # ── Contacts ───────────────────────────────────────────────────────────────
    customers = [
        Contact(name="Sarah Johnson", email="sarah@designstudio.com", phone="555-0101",
                mobile="555-0102", company="Design Studio Co", address="100 Oak Ave",
                city="Portland", state="OR", zip_code="97201", country="US",
                is_customer=True, notes="Interior designer, bulk orders"),
        Contact(name="Michael Chen", email="mchen@hotelgroup.com", phone="555-0201",
                mobile="555-0202", company="Pacific Hotel Group", address="200 Harbor Blvd",
                city="San Francisco", state="CA", zip_code="94105", country="US",
                is_customer=True, notes="Hotel chain, contract pricing"),
        Contact(name="Emily Rodriguez", email="emily.r@homemakers.com", phone="555-0301",
                company="Homemakers Inc", address="300 Elm St",
                city="Austin", state="TX", zip_code="78701", country="US", is_customer=True),
        Contact(name="David Kim", email="dkim@officespace.co", phone="555-0401",
                company="Office Space Solutions", address="400 Corporate Dr",
                city="Seattle", state="WA", zip_code="98101", country="US", is_customer=True),
        Contact(name="Lisa Thompson", email="lisa@homereno.com", phone="555-0501",
                company="Home Reno Plus", city="Denver", state="CO", is_customer=True),
    ]
    vendors = [
        Contact(name="Oak & Pine Lumber", email="sales@oakpine.com", phone="555-1001",
                company="Oak & Pine Lumber Co", address="1000 Timber Rd",
                city="Eugene", state="OR", zip_code="97401", country="US",
                is_customer=False, is_vendor=True, notes="Primary wood supplier"),
        Contact(name="Steel Frame Supply", email="orders@steelframe.com", phone="555-1101",
                company="Steel Frame Supply Inc", address="1100 Metal Way",
                city="Pittsburgh", state="PA", zip_code="15201", country="US",
                is_customer=False, is_vendor=True, notes="Metal frames and hardware"),
        Contact(name="Comfort Fabrics", email="hello@comfortfab.com", phone="555-1201",
                company="Comfort Fabrics Ltd", address="1200 Textile Blvd",
                city="Charlotte", state="NC", zip_code="28201", country="US",
                is_customer=False, is_vendor=True, notes="Upholstery fabric supplier"),
        Contact(name="Glass & Mirror Pro", email="info@glasspro.com", phone="555-1301",
                company="Glass & Mirror Pro", city="Phoenix", state="AZ",
                is_customer=False, is_vendor=True),
    ]
    db.add_all(customers + vendors)
    db.flush()

    # ── Products ───────────────────────────────────────────────────────────────
    products = [
        Product(name="Nordic Oak Dining Table", sku="TBL-001", category="Table",
                description="Solid oak dining table, seats 6-8", sale_price=1299.00,
                cost_price=520.00, dimensions="180x90x75 cm", material="Solid Oak",
                color="Natural", weight=45.0),
        Product(name="Modern Leather Sofa 3-Seat", sku="SOF-001", category="Sofa",
                description="Premium Italian leather sofa", sale_price=2499.00,
                cost_price=980.00, dimensions="220x90x85 cm", material="Leather + Steel Frame",
                color="Charcoal", weight=65.0),
        Product(name="Ergonomic Office Chair", sku="CHR-001", category="Chair",
                description="Adjustable ergonomic chair with lumbar support", sale_price=599.00,
                cost_price=180.00, dimensions="65x65x120 cm", material="Mesh + Steel",
                color="Black", weight=15.0),
        Product(name="Walnut Bookshelf", sku="SHF-001", category="Shelf",
                description="5-tier walnut bookshelf", sale_price=449.00,
                cost_price=150.00, dimensions="80x30x180 cm", material="Walnut Wood",
                color="Dark Walnut", weight=25.0),
        Product(name="Queen Platform Bed", sku="BED-001", category="Bed",
                description="Minimalist queen platform bed frame", sale_price=899.00,
                cost_price=320.00, dimensions="160x200x40 cm", material="Pine + Steel",
                color="White", weight=35.0),
        Product(name="Standing Desk", sku="DSK-001", category="Desk",
                description="Electric height-adjustable standing desk", sale_price=749.00,
                cost_price=280.00, dimensions="140x70x120 cm", material="Bamboo + Steel",
                color="Natural Bamboo", weight=30.0),
        Product(name="Outdoor Lounge Set", sku="OUT-001", category="Outdoor",
                description="4-piece outdoor lounge with cushions", sale_price=1899.00,
                cost_price=680.00, dimensions="Various", material="Teak + Sunbrella Fabric",
                color="Grey", weight=55.0),
        Product(name="Bedside Cabinet", sku="CAB-001", category="Cabinet",
                description="Compact bedside table with 2 drawers", sale_price=249.00,
                cost_price=75.00, dimensions="45x40x55 cm", material="MDF + Oak Veneer",
                color="Light Oak", weight=12.0),
        Product(name="Dining Chair Set (4)", sku="CHR-002", category="Chair",
                description="Set of 4 upholstered dining chairs", sale_price=799.00,
                cost_price=240.00, dimensions="45x50x90 cm each", material="Beech + Linen",
                color="Cream", weight=28.0),
        Product(name="TV Console Unit", sku="CAB-002", category="Cabinet",
                description="Low-profile media console", sale_price=599.00,
                cost_price=200.00, dimensions="160x40x50 cm", material="Walnut + Steel",
                color="Walnut", weight=22.0),
    ]
    # Raw materials
    raw_materials = [
        Product(name="Oak Lumber (per board ft)", sku="RAW-001", category="Raw Material",
                cost_price=8.50, sale_price=0, can_be_sold=False, material="Oak"),
        Product(name="Steel Tubing (per meter)", sku="RAW-002", category="Raw Material",
                cost_price=12.00, sale_price=0, can_be_sold=False, material="Steel"),
        Product(name="Upholstery Fabric (per meter)", sku="RAW-003", category="Raw Material",
                cost_price=25.00, sale_price=0, can_be_sold=False, material="Linen Blend"),
        Product(name="Screws & Hardware Kit", sku="RAW-004", category="Raw Material",
                cost_price=5.00, sale_price=0, can_be_sold=False),
        Product(name="Wood Finish (per liter)", sku="RAW-005", category="Raw Material",
                cost_price=18.00, sale_price=0, can_be_sold=False),
    ]
    db.add_all(products + raw_materials)
    db.flush()

    # ── Stock Moves (initial inventory) ────────────────────────────────────────
    for p in products:
        db.add(StockMove(product_id=p.id, warehouse_id=wh.id, type="in",
                         quantity=20, reference="INIT", notes="Initial stock"))
        db.add(StockMove(product_id=p.id, warehouse_id=showroom.id, type="in",
                         quantity=3, reference="INIT", notes="Showroom display"))
    for rm in raw_materials:
        db.add(StockMove(product_id=rm.id, warehouse_id=wh.id, type="in",
                         quantity=500, reference="INIT", notes="Initial raw material stock"))

    # ── CRM Leads ──────────────────────────────────────────────────────────────
    leads = [
        Lead(title="Hotel lobby furniture package", contact_id=customers[1].id,
             status="proposition", source="Website", expected_revenue=45000,
             probability=60, assigned_to="Sales Team", notes="20 rooms + lobby area"),
        Lead(title="Office redesign - 50 desks", contact_id=customers[3].id,
             status="qualified", source="Referral", expected_revenue=37500,
             probability=40, assigned_to="Sales Team"),
        Lead(title="Residential project - full home", contact_id=customers[0].id,
             status="won", source="Referral", expected_revenue=18000,
             probability=100, assigned_to="Sales Team"),
        Lead(title="Restaurant seating order", contact_id=customers[2].id,
             status="new", source="Trade Show", expected_revenue=12000,
             probability=20, assigned_to="Sales Team"),
        Lead(title="Home staging package", contact_id=customers[4].id,
             status="new", source="Website", expected_revenue=8500,
             probability=15, assigned_to="Sales Team"),
    ]
    db.add_all(leads)
    db.flush()

    for lead in leads:
        db.add(Activity(lead_id=lead.id, type="note", summary="Initial contact made",
                        done=True))

    # ── Sale Orders ────────────────────────────────────────────────────────────
    so1 = SaleOrder(reference="SO-00001", customer_id=customers[0].id, status="invoiced",
                    order_date=date.today() - timedelta(days=15),
                    subtotal=3847, tax=384.70, total=4231.70)
    db.add(so1)
    db.flush()
    db.add_all([
        SaleOrderLine(order_id=so1.id, product_id=products[0].id, description=products[0].name,
                      quantity=2, unit_price=1299, subtotal=2598),
        SaleOrderLine(order_id=so1.id, product_id=products[7].id, description=products[7].name,
                      quantity=4, unit_price=249, subtotal=996),
    ])

    so2 = SaleOrder(reference="SO-00002", customer_id=customers[1].id, status="confirmed",
                    order_date=date.today() - timedelta(days=3),
                    subtotal=14990, tax=1499, total=16489)
    db.add(so2)
    db.flush()
    db.add_all([
        SaleOrderLine(order_id=so2.id, product_id=products[2].id, description=products[2].name,
                      quantity=10, unit_price=599, subtotal=5990),
        SaleOrderLine(order_id=so2.id, product_id=products[5].id, description=products[5].name,
                      quantity=10, unit_price=749, subtotal=7490),
    ])

    so3 = SaleOrder(reference="SO-00003", customer_id=customers[2].id, status="draft",
                    order_date=date.today(), subtotal=2499, tax=249.90, total=2748.90)
    db.add(so3)
    db.flush()
    db.add(SaleOrderLine(order_id=so3.id, product_id=products[1].id, description=products[1].name,
                         quantity=1, unit_price=2499, subtotal=2499))

    # ── Invoices ───────────────────────────────────────────────────────────────
    inv1 = Invoice(reference="INV-00001", contact_id=customers[0].id, type="customer",
                   status="paid", invoice_date=date.today() - timedelta(days=10),
                   subtotal=3847, tax=384.70, total=4231.70, amount_paid=4231.70,
                   sale_order_id=so1.id)
    db.add(inv1)
    db.flush()
    db.add(InvoiceLine(invoice_id=inv1.id, description="Nordic Oak Dining Table x2",
                       quantity=2, unit_price=1299, subtotal=2598))
    db.add(InvoiceLine(invoice_id=inv1.id, description="Bedside Cabinet x4",
                       quantity=4, unit_price=249, subtotal=996))
    db.add(Payment(invoice_id=inv1.id, amount=4231.70, method="bank_transfer",
                   reference="TXN-20240301"))

    # ── Purchase Orders ────────────────────────────────────────────────────────
    po1 = PurchaseOrder(reference="PO-00001", vendor_id=vendors[0].id, status="received",
                        order_date=date.today() - timedelta(days=20),
                        subtotal=4250, tax=425, total=4675)
    db.add(po1)
    db.flush()
    db.add(PurchaseOrderLine(order_id=po1.id, product_id=raw_materials[0].id,
                             description="Oak Lumber", quantity=500, unit_price=8.50, subtotal=4250))

    po2 = PurchaseOrder(reference="PO-00002", vendor_id=vendors[1].id, status="sent",
                        order_date=date.today() - timedelta(days=5),
                        subtotal=1200, tax=120, total=1320)
    db.add(po2)
    db.flush()
    db.add(PurchaseOrderLine(order_id=po2.id, product_id=raw_materials[1].id,
                             description="Steel Tubing", quantity=100, unit_price=12, subtotal=1200))

    # ── BOM & Manufacturing ────────────────────────────────────────────────────
    bom1 = BillOfMaterials(product_id=products[0].id, name="Nordic Oak Dining Table BOM", quantity=1)
    db.add(bom1)
    db.flush()
    db.add_all([
        BOMLine(bom_id=bom1.id, product_id=raw_materials[0].id, quantity=30, notes="Table top + legs"),
        BOMLine(bom_id=bom1.id, product_id=raw_materials[3].id, quantity=2, notes="Assembly hardware"),
        BOMLine(bom_id=bom1.id, product_id=raw_materials[4].id, quantity=1, notes="Wood finish coat"),
    ])

    bom2 = BillOfMaterials(product_id=products[2].id, name="Ergonomic Office Chair BOM", quantity=1)
    db.add(bom2)
    db.flush()
    db.add_all([
        BOMLine(bom_id=bom2.id, product_id=raw_materials[1].id, quantity=3, notes="Frame tubing"),
        BOMLine(bom_id=bom2.id, product_id=raw_materials[2].id, quantity=2, notes="Seat + back mesh"),
        BOMLine(bom_id=bom2.id, product_id=raw_materials[3].id, quantity=1, notes="Assembly hardware"),
    ])

    mo1 = ManufacturingOrder(reference="MO-00001", bom_id=bom1.id, quantity=5,
                             status="done", planned_start=date.today() - timedelta(days=10),
                             actual_start=date.today() - timedelta(days=10),
                             actual_end=date.today() - timedelta(days=7))
    mo2 = ManufacturingOrder(reference="MO-00002", bom_id=bom2.id, quantity=10,
                             status="in_progress", planned_start=date.today() - timedelta(days=2),
                             actual_start=date.today() - timedelta(days=2))
    db.add_all([mo1, mo2])

    # ── Mailing Lists & Campaigns ──────────────────────────────────────────────
    ml1 = MailingList(name="All Customers", description="All active customers for general updates")
    ml2 = MailingList(name="VIP Clients", description="High-value clients for exclusive offers")
    db.add_all([ml1, ml2])
    db.flush()

    for c in customers:
        db.add(MailingListContact(mailing_list_id=ml1.id, contact_id=c.id))
    db.add(MailingListContact(mailing_list_id=ml2.id, contact_id=customers[0].id))
    db.add(MailingListContact(mailing_list_id=ml2.id, contact_id=customers[1].id))

    ec1 = EmailCampaign(
        name="Spring Collection Launch", subject="Introducing Our New Spring Furniture Collection",
        body_html="<h1>New Spring Collection</h1><p>Discover our latest designs...</p>",
        mailing_list_id=ml1.id, status="sent", total_sent=5, total_opened=3, total_clicked=1,
        sent_date=datetime.utcnow() - timedelta(days=5))
    ec2 = EmailCampaign(
        name="VIP Early Access Sale", subject="Exclusive 20% Off - VIP Early Access",
        body_html="<h1>VIP Exclusive</h1><p>As a valued client, enjoy 20% off...</p>",
        mailing_list_id=ml2.id, status="draft")
    db.add_all([ec1, ec2])

    sms1 = SMSCampaign(
        name="Weekend Flash Sale", message="Flash Sale! 15% off all dining furniture this weekend. Visit our showroom!",
        mailing_list_id=ml1.id, status="sent", total_sent=5, total_delivered=4, total_failed=1,
        sent_date=datetime.utcnow() - timedelta(days=2))
    db.add(sms1)

    # ── Journal Entries ────────────────────────────────────────────────────────
    db.add(JournalEntry(reference="JE-001", date=date.today() - timedelta(days=10),
                        description="Payment received from Design Studio Co",
                        debit_account="Bank", credit_account="Accounts Receivable",
                        amount=4231.70))
    db.add(JournalEntry(reference="JE-002", date=date.today() - timedelta(days=20),
                        description="Payment to Oak & Pine Lumber",
                        debit_account="Accounts Payable", credit_account="Bank",
                        amount=4675.00))

    db.commit()
    db.close()
    print("Database seeded successfully with sample furniture data!")
