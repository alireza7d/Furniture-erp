// ============================================================================
// FurnitureERP — Single Page Application
// ============================================================================

const API = '';
let currentPage = 'dashboard';
let posCart = [];

// ── Utility Functions ───────────────────────────────────────────────────────

async function api(url, options = {}) {
    const opts = { headers: { 'Content-Type': 'application/json' }, ...options };
    if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
    const res = await fetch(API + url, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
    }
    return res.json();
}

function fmt(n) { return new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR' }).format(n || 0); }
function fmtN(n) { return new Intl.NumberFormat('en-US').format(n || 0); }
function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function toast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function badge(status) { return '<span class="badge badge-' + (status || 'draft') + '">' + escHtml(status) + '</span>'; }

function navigate(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
    document.getElementById('breadcrumb-page').textContent = pageTitle(page);
    loadPage(page);
}

function pageTitle(p) {
    const map = { dashboard: 'Dashboard', crm: 'CRM', sales: 'Sales', pos: 'Point of Sale',
        accounting: 'Accounting', inventory: 'Inventory', purchase: 'Purchase',
        manufacturing: 'Manufacturing', 'email-marketing': 'Email Marketing',
        'sms-marketing': 'SMS Marketing', contacts: 'Contacts', products: 'Products',
        todo: 'To-do' };
    return map[p] || p;
}

function openModal(title, bodyHtml, footerHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-footer').innerHTML = footerHtml || '';
    document.getElementById('modal-overlay').classList.add('show');
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('show'); }

function getFormData(formId) {
    const form = document.getElementById(formId);
    const data = {};
    form.querySelectorAll('[name]').forEach(el => {
        let val = el.value;
        if (el.type === 'number') val = parseFloat(val) || 0;
        if (el.type === 'checkbox') val = el.checked;
        data[el.name] = val;
    });
    return data;
}

// ── Page Router ─────────────────────────────────────────────────────────────

async function loadPage(page) {
    const el = document.getElementById('content');
    el.innerHTML = '<div style="text-align:center;padding:60px;">Loading...</div>';
    try {
        switch (page) {
            case 'dashboard': await renderDashboard(el); break;
            case 'crm': await renderCRM(el); break;
            case 'sales': await renderSales(el); break;
            case 'pos': await renderPOS(el); break;
            case 'accounting': await renderAccounting(el); break;
            case 'inventory': await renderInventory(el); break;
            case 'purchase': await renderPurchase(el); break;
            case 'manufacturing': await renderManufacturing(el); break;
            case 'email-marketing': await renderEmailMarketing(el); break;
            case 'sms-marketing': await renderSMSMarketing(el); break;
            case 'contacts': await renderContacts(el); break;
            case 'products': await renderProducts(el); break;
            case 'todo': await renderTodo(el); break;
            default: el.innerHTML = '<div class="empty-state"><p>Page not found</p></div>';
        }
    } catch (e) {
        el.innerHTML = '<div class="empty-state"><p>Error loading page: ' + escHtml(e.message) + '</p></div>';
    }
}

// ── Dashboard ───────────────────────────────────────────────────────────────

async function renderDashboard(el) {
    const [crm, sales, inv, pur, mfg, mkt] = await Promise.all([
        api('/api/crm/dashboard'), api('/api/sales/dashboard'), api('/api/inventory/dashboard'),
        api('/api/purchase/dashboard'), api('/api/manufacturing/dashboard'), api('/api/marketing/dashboard'),
    ]);
    el.innerHTML = '<div class="page-header"><h1 class="page-title">Dashboard</h1></div>' +
        '<div class="stats-grid">' +
            '<div class="stat-card accent"><div class="stat-label">CRM Pipeline</div><div class="stat-value">' + fmtN(crm.total_leads) + '</div><div class="stat-sub">' + crm.conversion_rate + '% conversion</div></div>' +
            '<div class="stat-card"><div class="stat-label">Sales Revenue</div><div class="stat-value">' + fmt(sales.total_revenue) + '</div><div class="stat-sub">' + fmtN(sales.total_orders) + ' orders</div></div>' +
            '<div class="stat-card success"><div class="stat-label">Inventory Value</div><div class="stat-value">' + fmt(inv.total_stock_value) + '</div><div class="stat-sub">' + fmtN(inv.total_products) + ' products</div></div>' +
            '<div class="stat-card warning"><div class="stat-label">Purchase Spent</div><div class="stat-value">' + fmt(pur.total_spent) + '</div><div class="stat-sub">' + fmtN(pur.pending_orders) + ' pending</div></div>' +
            '<div class="stat-card info"><div class="stat-label">Manufacturing</div><div class="stat-value">' + fmtN(mfg.in_progress) + ' Active</div><div class="stat-sub">' + fmtN(mfg.completed) + ' completed</div></div>' +
            '<div class="stat-card danger"><div class="stat-label">Campaigns Sent</div><div class="stat-value">' + fmtN(mkt.total_emails_sent + mkt.total_sms_sent) + '</div><div class="stat-sub">' + mkt.email_open_rate + '% open rate</div></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
            '<div class="card"><div class="card-header">CRM Pipeline</div><div class="card-body">' +
                Object.entries(crm.by_status).map(([k, v]) => '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>' + escHtml(k) + '</span><strong>' + v + '</strong></div>').join('') +
            '</div></div>' +
            '<div class="card"><div class="card-header">Sales by Status</div><div class="card-body">' +
                Object.entries(sales.by_status).map(([k, v]) => '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>' + escHtml(k) + '</span><strong>' + v + '</strong></div>').join('') +
            '</div></div>' +
            '<div class="card"><div class="card-header">Low Stock Items</div><div class="card-body">' +
                (inv.low_stock_items.length ? inv.low_stock_items.map(i => '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>' + escHtml(i.product) + '</span><span class="text-danger fw-bold">' + i.on_hand + ' units</span></div>').join('') : '<p class="text-muted">All stock levels OK</p>') +
            '</div></div>' +
            '<div class="card"><div class="card-header">Marketing Overview</div><div class="card-body">' +
                '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Email Campaigns</span><strong>' + mkt.email_campaigns + '</strong></div>' +
                '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>SMS Campaigns</span><strong>' + mkt.sms_campaigns + '</strong></div>' +
                '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Subscribers</span><strong>' + fmtN(mkt.total_subscribers) + '</strong></div>' +
                '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Email Click Rate</span><strong>' + mkt.email_click_rate + '%</strong></div>' +
            '</div></div>' +
        '</div>';
}


// ── CRM Module ──────────────────────────────────────────────────────────────

async function renderCRM(el) {
    const pipeline = await api('/api/crm/pipeline');
    const stages = ['new', 'qualified', 'proposition', 'won', 'lost'];
    const stageLabels = { new: 'New', qualified: 'Qualified', proposition: 'Proposition', won: 'Won', lost: 'Lost' };

    el.innerHTML = '<div class="page-header"><h1 class="page-title">CRM Pipeline</h1>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="showNewLeadForm()">+ New Lead</button></div></div>' +
        '<div class="kanban-board">' +
        stages.map(s => {
            const d = pipeline[s] || { leads: [], count: 0, revenue: 0 };
            return '<div class="kanban-column"><div class="kanban-column-header">' + stageLabels[s] +
                '<span class="count">' + d.count + '</span></div><div class="kanban-cards">' +
                d.leads.map(l => '<div class="kanban-card" onclick="showLeadDetail(' + l.id + ')">' +
                    '<div class="kanban-card-title">' + escHtml(l.title) + '</div>' +
                    '<div class="kanban-card-sub">' + escHtml(l.contact ? l.contact.name : 'No contact') + '</div>' +
                    '<div class="kanban-card-amount">' + fmt(l.expected_revenue) + '</div></div>'
                ).join('') +
                '</div></div>';
        }).join('') + '</div>';
}

async function showNewLeadForm() {
    const contacts = await api('/api/contacts?type=customer');
    const opts = contacts.map(c => '<option value="' + c.id + '">' + escHtml(c.name) + '</option>').join('');
    openModal('New Lead',
        '<form id="lead-form">' +
        '<div class="form-group"><label>Title</label><input name="title" class="form-control" required></div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Contact</label><select name="contact_id" class="form-control"><option value="">Select...</option>' + opts + '</select></div>' +
            '<div class="form-group"><label>Source</label><select name="source" class="form-control"><option>Website</option><option>Referral</option><option>Trade Show</option><option>Social Media</option><option>Cold Call</option></select></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Expected Revenue</label><input name="expected_revenue" type="number" class="form-control" value="0"></div>' +
            '<div class="form-group"><label>Probability %</label><input name="probability" type="number" class="form-control" value="10" min="0" max="100"></div>' +
        '</div>' +
        '<div class="form-group"><label>Notes</label><textarea name="notes" class="form-control"></textarea></div>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveLead()">Create Lead</button>'
    );
}

async function saveLead() {
    try {
        const data = getFormData('lead-form');
        if (data.contact_id) data.contact_id = parseInt(data.contact_id);
        else delete data.contact_id;
        await api('/api/crm/leads', { method: 'POST', body: data });
        closeModal();
        toast('Lead created');
        navigate('crm');
    } catch (e) { toast(e.message, 'error'); }
}

async function showLeadDetail(id) {
    const lead = await api('/api/crm/leads/' + id);
    const stages = ['new', 'qualified', 'proposition', 'won', 'lost'];
    openModal('Lead: ' + lead.title,
        '<div class="detail-grid">' +
            '<div><div class="detail-field"><div class="detail-label">Contact</div><div class="detail-value">' + escHtml(lead.contact ? lead.contact.name : 'N/A') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">' + badge(lead.status) + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Expected Revenue</div><div class="detail-value">' + fmt(lead.expected_revenue) + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Probability</div><div class="detail-value">' + lead.probability + '%</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Source</div><div class="detail-value">' + escHtml(lead.source || 'N/A') + '</div></div></div>' +
        '</div>' +
        '<hr class="divider">' +
        '<div class="form-group"><label>Move to Stage</label><select id="lead-stage" class="form-control">' +
            stages.map(s => '<option value="' + s + '"' + (s === lead.status ? ' selected' : '') + '>' + s + '</option>').join('') +
        '</select></div>' +
        (lead.activities && lead.activities.length ? '<h4 class="mt-4 mb-2">Activities</h4>' +
            lead.activities.map(a => '<div style="padding:6px 0;border-bottom:1px solid #eee;"><strong>' + escHtml(a.type) + '</strong>: ' + escHtml(a.summary) + '</div>').join('') : ''),
        '<button class="btn btn-danger btn-sm" onclick="deleteLead(' + id + ')">Delete</button>' +
        '<button class="btn btn-outline" onclick="closeModal()">Close</button>' +
        '<button class="btn btn-primary" onclick="updateLeadStage(' + id + ')">Update Stage</button>'
    );
}

async function updateLeadStage(id) {
    try {
        const status = document.getElementById('lead-stage').value;
        await api('/api/crm/leads/' + id, { method: 'PUT', body: { status } });
        closeModal();
        toast('Lead updated');
        navigate('crm');
    } catch (e) { toast(e.message, 'error'); }
}

async function deleteLead(id) {
    if (!confirm('Delete this lead?')) return;
    await api('/api/crm/leads/' + id, { method: 'DELETE' });
    closeModal();
    toast('Lead deleted');
    navigate('crm');
}


// ── Sales Module ────────────────────────────────────────────────────────────

async function renderSales(el) {
    const [orders, dash] = await Promise.all([api('/api/sales/orders'), api('/api/sales/dashboard')]);
    el.innerHTML = '<div class="page-header"><h1 class="page-title">Sales Orders</h1>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="showNewSaleOrder()">+ New Order</button></div></div>' +
        '<div class="stats-grid">' +
            '<div class="stat-card"><div class="stat-label">Total Orders</div><div class="stat-value">' + fmtN(dash.total_orders) + '</div></div>' +
            '<div class="stat-card accent"><div class="stat-label">Total Revenue</div><div class="stat-value">' + fmt(dash.total_revenue) + '</div></div>' +
            '<div class="stat-card success"><div class="stat-label">Avg Order Value</div><div class="stat-value">' + fmt(dash.avg_order_value) + '</div></div>' +
        '</div>' +
        '<div class="card"><div class="card-header">Orders</div><div class="table-wrapper"><table><thead><tr>' +
            '<th>Reference</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th>' +
        '</tr></thead><tbody>' +
        orders.map(o => '<tr onclick="showSaleOrderDetail(' + o.id + ')">' +
            '<td><strong>' + escHtml(o.reference) + '</strong></td>' +
            '<td>' + escHtml(o.customer ? o.customer.name : 'N/A') + '</td>' +
            '<td>' + escHtml(o.order_date || '') + '</td>' +
            '<td><strong>' + fmt(o.total) + '</strong></td>' +
            '<td>' + badge(o.status) + '</td>' +
            '<td><button class="btn btn-sm btn-outline" onclick="event.stopPropagation();showSaleOrderDetail(' + o.id + ')">View</button></td>' +
        '</tr>').join('') +
        '</tbody></table></div></div>';
}

async function showNewSaleOrder() {
    const [contacts, products] = await Promise.all([api('/api/contacts?type=customer'), api('/api/products')]);
    const custOpts = contacts.map(c => '<option value="' + c.id + '">' + escHtml(c.name) + '</option>').join('');
    const prodOpts = products.map(p => '<option value="' + p.id + '" data-price="' + p.sale_price + '">' + escHtml(p.name) + ' (' + fmt(p.sale_price) + ')</option>').join('');

    openModal('New Sale Order',
        '<form id="so-form">' +
        '<div class="form-group"><label>Customer</label><select name="customer_id" class="form-control" required>' + custOpts + '</select></div>' +
        '<hr class="divider"><h4 class="mb-2">Order Lines</h4>' +
        '<div id="so-lines"><div class="form-row mb-2">' +
            '<div class="form-group"><label>Product</label><select class="form-control so-product" onchange="soProductChanged(this)">' + prodOpts + '</select></div>' +
            '<div class="form-group"><label>Qty</label><input type="number" class="form-control so-qty" value="1" min="1"></div>' +
        '</div></div>' +
        '<button type="button" class="btn btn-sm btn-outline" onclick="addSOLine()">+ Add Line</button>' +
        '<div class="form-group mt-4"><label>Notes</label><textarea name="notes" class="form-control"></textarea></div>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveSaleOrder()">Create Order</button>'
    );
    window._soProdOpts = prodOpts;
}

function addSOLine() {
    const div = document.getElementById('so-lines');
    div.insertAdjacentHTML('beforeend', '<div class="form-row mb-2">' +
        '<div class="form-group"><label>Product</label><select class="form-control so-product" onchange="soProductChanged(this)">' + window._soProdOpts + '</select></div>' +
        '<div class="form-group"><label>Qty</label><input type="number" class="form-control so-qty" value="1" min="1"></div>' +
    '</div>');
}

function soProductChanged(sel) {}

async function saveSaleOrder() {
    try {
        const form = document.getElementById('so-form');
        const customer_id = parseInt(form.querySelector('[name=customer_id]').value);
        const notes = form.querySelector('[name=notes]').value;
        const prods = form.querySelectorAll('.so-product');
        const qtys = form.querySelectorAll('.so-qty');
        const lines = [];
        prods.forEach((p, i) => {
            lines.push({ product_id: parseInt(p.value), quantity: parseFloat(qtys[i].value) || 1 });
        });
        await api('/api/sales/orders', { method: 'POST', body: { customer_id, notes, lines } });
        closeModal();
        toast('Sale order created');
        navigate('sales');
    } catch (e) { toast(e.message, 'error'); }
}

async function showSaleOrderDetail(id) {
    const o = await api('/api/sales/orders/' + id);
    openModal('Order ' + o.reference,
        '<div class="detail-grid">' +
            '<div><div class="detail-field"><div class="detail-label">Customer</div><div class="detail-value">' + escHtml(o.customer ? o.customer.name : '') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">' + badge(o.status) + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Date</div><div class="detail-value">' + escHtml(o.order_date || '') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Total</div><div class="detail-value" style="font-size:18px;color:var(--primary);">' + fmt(o.total) + '</div></div></div>' +
        '</div>' +
        '<hr class="divider"><h4 class="mb-2">Lines</h4>' +
        '<table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>' +
        (o.lines || []).map(l => '<tr><td>' + escHtml(l.description || (l.product ? l.product.name : '')) + '</td><td>' + l.quantity + '</td><td>' + fmt(l.unit_price) + '</td><td>' + fmt(l.subtotal) + '</td></tr>').join('') +
        '</tbody></table>' +
        '<div style="text-align:right;margin-top:8px;"><strong>Subtotal:</strong> ' + fmt(o.subtotal) + ' | <strong>Tax:</strong> ' + fmt(o.tax) + ' | <strong>Total:</strong> ' + fmt(o.total) + '</div>',
        (o.status === 'draft' ? '<button class="btn btn-success" onclick="confirmSO(' + id + ')">Confirm</button> ' : '') +
        (o.status === 'confirmed' ? '<button class="btn btn-accent" onclick="deliverSO(' + id + ')">Deliver</button> ' : '') +
        (o.status === 'delivered' ? '<button class="btn btn-primary" onclick="invoiceSO(' + id + ')">Create Invoice</button> ' : '') +
        '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
    );
}

async function confirmSO(id) { await api('/api/sales/orders/' + id + '/confirm', { method: 'POST' }); closeModal(); toast('Order confirmed'); navigate('sales'); }
async function deliverSO(id) { await api('/api/sales/orders/' + id + '/deliver', { method: 'POST' }); closeModal(); toast('Order delivered'); navigate('sales'); }
async function invoiceSO(id) { await api('/api/sales/orders/' + id + '/invoice', { method: 'POST' }); closeModal(); toast('Invoice created'); navigate('sales'); }


// ── POS Module ──────────────────────────────────────────────────────────────

async function renderPOS(el) {
    const products = await api('/api/pos/products');
    posCart = [];
    const categoryIcons = { Sofa: '&#128715;', Table: '&#9638;', Chair: '&#9641;', Bed: '&#9644;',
        Cabinet: '&#9635;', Shelf: '&#9636;', Desk: '&#9634;', Outdoor: '&#9728;', Accessory: '&#9733;' };

    el.innerHTML = '<div class="page-header"><h1 class="page-title">Point of Sale</h1></div>' +
        '<div class="pos-layout">' +
            '<div><div style="margin-bottom:12px;"><input type="text" class="form-control" placeholder="Search products..." oninput="filterPOSProducts(this.value)"></div>' +
            '<div class="pos-products-grid" id="pos-grid">' +
            products.map(p => '<div class="pos-product-card" data-name="' + escHtml(p.name).toLowerCase() + '" onclick="addToCart(' + p.id + ',&apos;' + escHtml(p.name).replace(/'/g, '') + '&apos;,' + p.sale_price + ')">' +
                '<div class="pos-product-icon">' + (categoryIcons[p.category] || '&#9642;') + '</div>' +
                '<div class="pos-product-name">' + escHtml(p.name) + '</div>' +
                '<div class="pos-product-price">' + fmt(p.sale_price) + '</div>' +
            '</div>').join('') +
            '</div></div>' +
            '<div class="pos-cart">' +
                '<div class="pos-cart-header">Current Order</div>' +
                '<div class="pos-cart-items" id="pos-cart-items"><div class="empty-state"><p>No items yet</p></div></div>' +
                '<div class="pos-cart-footer">' +
                    '<div id="pos-totals">' +
                        '<div class="pos-totals-row"><span>Subtotal</span><span id="pos-subtotal">' + fmt(0) + '</span></div>' +
                        '<div class="pos-totals-row"><span>Tax (10%)</span><span id="pos-tax">' + fmt(0) + '</span></div>' +
                        '<div class="pos-totals-row total"><span>Total</span><span id="pos-total">' + fmt(0) + '</span></div>' +
                    '</div>' +
                    '<div class="pos-payment-buttons">' +
                        '<button class="btn btn-success" onclick="completePOSOrder(&apos;cash&apos;)">Cash</button>' +
                        '<button class="btn btn-primary" onclick="completePOSOrder(&apos;card&apos;)">Card</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
}

function filterPOSProducts(q) {
    document.querySelectorAll('.pos-product-card').forEach(c => {
        c.style.display = c.dataset.name.includes(q.toLowerCase()) ? '' : 'none';
    });
}

function addToCart(id, name, price) {
    const existing = posCart.find(i => i.id === id);
    if (existing) { existing.qty++; }
    else { posCart.push({ id, name, price, qty: 1 }); }
    renderCart();
}

function updateCartQty(id, delta) {
    const item = posCart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) posCart = posCart.filter(i => i.id !== id);
    renderCart();
}

function renderCart() {
    const el = document.getElementById('pos-cart-items');
    if (!posCart.length) {
        el.innerHTML = '<div class="empty-state"><p>No items yet</p></div>';
    } else {
        el.innerHTML = posCart.map(i => '<div class="pos-cart-item">' +
            '<div class="pos-cart-item-info"><div class="pos-cart-item-name">' + escHtml(i.name) + '</div>' +
            '<div class="pos-cart-item-price">' + fmt(i.price) + ' each</div></div>' +
            '<div class="pos-cart-item-qty">' +
                '<button onclick="updateCartQty(' + i.id + ',-1)">-</button>' +
                '<span>' + i.qty + '</span>' +
                '<button onclick="updateCartQty(' + i.id + ',1)">+</button>' +
            '</div>' +
            '<div class="pos-cart-item-subtotal">' + fmt(i.price * i.qty) + '</div>' +
        '</div>').join('');
    }
    const subtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
    const tax = subtotal * 0.1;
    document.getElementById('pos-subtotal').textContent = fmt(subtotal);
    document.getElementById('pos-tax').textContent = fmt(tax);
    document.getElementById('pos-total').textContent = fmt(subtotal + tax);
}

async function completePOSOrder(method) {
    if (!posCart.length) { toast('Add items to cart first', 'error'); return; }
    try {
        const lines = posCart.map(i => ({ product_id: i.id, quantity: i.qty, unit_price: i.price }));
        await api('/api/pos/orders', { method: 'POST', body: { payment_method: method, lines } });
        posCart = [];
        toast('Order completed!');
        renderCart();
    } catch (e) { toast(e.message, 'error'); }
}


// ── Accounting Module ───────────────────────────────────────────────────────

async function renderAccounting(el) {
    const [dash, invoices] = await Promise.all([api('/api/accounting/dashboard'), api('/api/accounting/invoices')]);
    el.innerHTML = '<div class="page-header"><h1 class="page-title">Accounting</h1>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="showNewInvoice()">+ New Invoice</button></div></div>' +
        '<div class="stats-grid">' +
            '<div class="stat-card success"><div class="stat-label">Total Income</div><div class="stat-value">' + fmt(dash.total_income) + '</div></div>' +
            '<div class="stat-card danger"><div class="stat-label">Total Expenses</div><div class="stat-value">' + fmt(dash.total_expenses) + '</div></div>' +
            '<div class="stat-card accent"><div class="stat-label">Net Profit</div><div class="stat-value">' + fmt(dash.net_profit) + '</div></div>' +
            '<div class="stat-card warning"><div class="stat-label">Receivable</div><div class="stat-value">' + fmt(dash.accounts_receivable) + '</div></div>' +
            '<div class="stat-card info"><div class="stat-label">Payable</div><div class="stat-value">' + fmt(dash.accounts_payable) + '</div></div>' +
            '<div class="stat-card danger"><div class="stat-label">Overdue</div><div class="stat-value">' + fmtN(dash.overdue_invoices) + '</div></div>' +
        '</div>' +
        '<div class="tabs">' +
            '<div class="tab active" onclick="filterInvoices(this,&apos;all&apos;)">All</div>' +
            '<div class="tab" onclick="filterInvoices(this,&apos;customer&apos;)">Customer Invoices</div>' +
            '<div class="tab" onclick="filterInvoices(this,&apos;vendor&apos;)">Vendor Bills</div>' +
        '</div>' +
        '<div class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>Reference</th><th>Contact</th><th>Type</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th>' +
        '</tr></thead><tbody id="invoices-tbody">' +
        invoices.map(i => invoiceRow(i)).join('') +
        '</tbody></table></div></div>';
    window._allInvoices = invoices;
}

function invoiceRow(i) {
    return '<tr class="inv-row" data-type="' + i.type + '" onclick="showInvoiceDetail(' + i.id + ')">' +
        '<td><strong>' + escHtml(i.reference) + '</strong></td>' +
        '<td>' + escHtml(i.contact ? i.contact.name : '') + '</td>' +
        '<td>' + escHtml(i.type) + '</td>' +
        '<td>' + escHtml(i.invoice_date || '') + '</td>' +
        '<td>' + fmt(i.total) + '</td>' +
        '<td>' + fmt(i.amount_paid) + '</td>' +
        '<td>' + badge(i.status) + '</td></tr>';
}

function filterInvoices(tab, type) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.inv-row').forEach(r => {
        r.style.display = (type === 'all' || r.dataset.type === type) ? '' : 'none';
    });
}

async function showNewInvoice() {
    const contacts = await api('/api/contacts');
    const opts = contacts.map(c => '<option value="' + c.id + '">' + escHtml(c.name) + '</option>').join('');
    openModal('New Invoice',
        '<form id="inv-form">' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Type</label><select name="type" class="form-control"><option value="customer">Customer Invoice</option><option value="vendor">Vendor Bill</option></select></div>' +
            '<div class="form-group"><label>Contact</label><select name="contact_id" class="form-control">' + opts + '</select></div>' +
        '</div>' +
        '<hr class="divider"><h4 class="mb-2">Lines</h4>' +
        '<div id="inv-lines"><div class="form-row mb-2">' +
            '<div class="form-group"><label>Description</label><input class="form-control inv-desc"></div>' +
            '<div class="form-group"><label>Qty</label><input type="number" class="form-control inv-qty" value="1"></div>' +
            '<div class="form-group"><label>Unit Price</label><input type="number" class="form-control inv-price" value="0"></div>' +
        '</div></div>' +
        '<button type="button" class="btn btn-sm btn-outline" onclick="addInvLine()">+ Add Line</button>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveInvoice()">Create</button>'
    );
}

function addInvLine() {
    document.getElementById('inv-lines').insertAdjacentHTML('beforeend',
        '<div class="form-row mb-2">' +
            '<div class="form-group"><label>Description</label><input class="form-control inv-desc"></div>' +
            '<div class="form-group"><label>Qty</label><input type="number" class="form-control inv-qty" value="1"></div>' +
            '<div class="form-group"><label>Unit Price</label><input type="number" class="form-control inv-price" value="0"></div>' +
        '</div>');
}

async function saveInvoice() {
    try {
        const form = document.getElementById('inv-form');
        const data = {
            type: form.querySelector('[name=type]').value,
            contact_id: parseInt(form.querySelector('[name=contact_id]').value),
            lines: []
        };
        const descs = form.querySelectorAll('.inv-desc');
        const qtys = form.querySelectorAll('.inv-qty');
        const prices = form.querySelectorAll('.inv-price');
        descs.forEach((d, i) => {
            data.lines.push({ description: d.value, quantity: parseFloat(qtys[i].value) || 1, unit_price: parseFloat(prices[i].value) || 0 });
        });
        await api('/api/accounting/invoices', { method: 'POST', body: data });
        closeModal(); toast('Invoice created'); navigate('accounting');
    } catch (e) { toast(e.message, 'error'); }
}

async function showInvoiceDetail(id) {
    const inv = await api('/api/accounting/invoices/' + id);
    openModal('Invoice ' + inv.reference,
        '<div class="detail-grid">' +
            '<div><div class="detail-field"><div class="detail-label">Contact</div><div class="detail-value">' + escHtml(inv.contact ? inv.contact.name : '') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">' + badge(inv.status) + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Total</div><div class="detail-value" style="font-size:18px;">' + fmt(inv.total) + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Paid</div><div class="detail-value">' + fmt(inv.amount_paid) + '</div></div></div>' +
        '</div>' +
        '<hr class="divider"><h4 class="mb-2">Lines</h4>' +
        '<table><thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>' +
        (inv.lines || []).map(l => '<tr><td>' + escHtml(l.description) + '</td><td>' + l.quantity + '</td><td>' + fmt(l.unit_price) + '</td><td>' + fmt(l.subtotal) + '</td></tr>').join('') +
        '</tbody></table>' +
        (inv.status !== 'paid' ? '<hr class="divider"><h4 class="mb-2">Register Payment</h4>' +
            '<div class="form-row"><div class="form-group"><label>Amount</label><input type="number" id="pay-amount" class="form-control" value="' + (inv.total - inv.amount_paid).toFixed(2) + '"></div>' +
            '<div class="form-group"><label>Method</label><select id="pay-method" class="form-control"><option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="check">Check</option></select></div></div>' : ''),
        (inv.status === 'draft' ? '<button class="btn btn-accent" onclick="sendInvoice(' + id + ')">Send</button> ' : '') +
        (inv.status !== 'paid' ? '<button class="btn btn-success" onclick="payInvoice(' + id + ')">Pay</button> ' : '') +
        '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
    );
}

async function sendInvoice(id) { await api('/api/accounting/invoices/' + id + '/send', { method: 'POST' }); closeModal(); toast('Invoice sent'); navigate('accounting'); }

async function payInvoice(id) {
    try {
        const amount = parseFloat(document.getElementById('pay-amount').value);
        const method = document.getElementById('pay-method').value;
        await api('/api/accounting/invoices/' + id + '/payments', { method: 'POST', body: { amount, method } });
        closeModal(); toast('Payment registered'); navigate('accounting');
    } catch (e) { toast(e.message, 'error'); }
}


// ── Inventory Module ────────────────────────────────────────────────────────

let invTab = 'overview';

async function renderInventory(el) {
    el.innerHTML = '<div class="page-header"><h1 class="page-title">Inventory</h1>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="showStockAdjustment()">+ Stock Adjustment</button></div></div>' +
        '<div class="inv-tabs">' +
            '<button class="inv-tab' + (invTab === 'overview' ? ' active' : '') + '" onclick="invTab=\'overview\';renderInventory(document.getElementById(\'content\'))">Overview</button>' +
            '<button class="inv-tab' + (invTab === 'stock' ? ' active' : '') + '" onclick="invTab=\'stock\';renderInventory(document.getElementById(\'content\'))">Stock Levels</button>' +
            '<button class="inv-tab' + (invTab === 'moves' ? ' active' : '') + '" onclick="invTab=\'moves\';renderInventory(document.getElementById(\'content\'))">Moves History</button>' +
        '</div>' +
        '<div id="inv-content"></div>';
    const container = document.getElementById('inv-content');
    if (invTab === 'overview') await renderInvOverview(container);
    else if (invTab === 'stock') await renderInvStock(container);
    else if (invTab === 'moves') await renderInvMoves(container);
}

async function renderInvOverview(el) {
    const [cards, dash] = await Promise.all([api('/api/inventory/overview'), api('/api/inventory/dashboard')]);
    el.innerHTML = '<div class="stats-grid">' +
        '<div class="stat-card"><div class="stat-label">Total Products</div><div class="stat-value">' + fmtN(dash.total_products) + '</div></div>' +
        '<div class="stat-card accent"><div class="stat-label">Stock Value</div><div class="stat-value">' + fmt(dash.total_stock_value) + '</div></div>' +
        '<div class="stat-card warning"><div class="stat-label">Low Stock Items</div><div class="stat-value">' + dash.low_stock_items.length + '</div></div>' +
        '<div class="stat-card info"><div class="stat-label">Warehouses</div><div class="stat-value">' + fmtN(dash.warehouses) + '</div></div>' +
    '</div>' +
    '<div class="inv-overview-grid">' +
    cards.map(c => {
        const maxBar = Math.max(...c.bars, 1);
        return '<div class="inv-op-card">' +
            '<div class="inv-op-card-title" style="color:' + c.color + '">' + escHtml(c.label) + '</div>' +
            '<div class="inv-op-card-sub">' + escHtml(c.warehouse_name) + '</div>' +
            '<div class="inv-op-card-count">' + c.total + ' operation' + (c.total !== 1 ? 's' : '') + '</div>' +
            '<button class="btn-open" style="background:' + c.color + '" onclick="openInvMoves(\'' + c.type + '\',' + c.warehouse_id + ')">Open</button>' +
            '<div class="inv-op-card-chart">' +
                c.bars.map(b => '<div class="inv-op-card-bar' + (b > 0 ? ' has-data' : '') + '" style="height:' + Math.max(b / maxBar * 60, 4) + 'px;background:' + c.color + '"></div>').join('') +
            '</div>' +
        '</div>';
    }).join('') +
    '</div>';
}

async function renderInvStock(el) {
    const stock = await api('/api/inventory/stock');
    el.innerHTML = '<div class="card"><div class="card-header">Stock Levels</div><div class="table-wrapper"><table><thead><tr>' +
        '<th>SKU</th><th>Product</th><th>Category</th><th>Cost Price</th><th>Sale Price</th><th>On Hand</th><th>Value</th><th>Actions</th>' +
    '</tr></thead><tbody>' +
    stock.map(s => '<tr><td>' + escHtml(s.sku || '') + '</td><td><strong>' + escHtml(s.product_name) + '</strong></td>' +
        '<td>' + escHtml(s.category || '') + '</td>' +
        '<td>' + fmt(s.cost_price) + '</td>' +
        '<td>' + fmt(s.sale_price) + '</td>' +
        '<td><span style="color:' + (s.on_hand <= 5 ? 'var(--danger)' : 'var(--success)') + ';font-weight:600;">' + s.on_hand + '</span></td>' +
        '<td>' + fmt(s.cost_value) + '</td>' +
        '<td><button class="btn btn-outline btn-sm" onclick="editProduct(' + s.product_id + ')">Edit</button></td></tr>'
    ).join('') +
    '</tbody></table></div></div>';
}

async function renderInvMoves(el, typeFilter, whFilter) {
    let url = '/api/inventory/moves';
    const params = [];
    if (typeFilter) params.push('type=' + typeFilter);
    if (whFilter) params.push('warehouse_id=' + whFilter);
    if (params.length) url += '?' + params.join('&');
    const moves = await api(url);
    el.innerHTML = '<div class="card"><div class="card-header">Stock Moves</div><div class="table-wrapper"><table><thead><tr>' +
        '<th>Date</th><th>Type</th><th>Product</th><th>Quantity</th><th>Reference</th><th>Notes</th>' +
    '</tr></thead><tbody>' +
    (moves.length ? moves.map(m => {
        const d = m.date ? new Date(m.date).toLocaleDateString() : '';
        const typeColors = {in:'var(--success)',out:'var(--warning)',transfer:'#8B5CF6',adjustment:'var(--info)'};
        return '<tr><td>' + d + '</td>' +
            '<td><span class="badge" style="background:' + (typeColors[m.type] || '#999') + ';color:#fff;">' + escHtml(m.type) + '</span></td>' +
            '<td>' + (m.product_id || '') + '</td>' +
            '<td><strong>' + m.quantity + '</strong></td>' +
            '<td>' + escHtml(m.reference || '') + '</td>' +
            '<td>' + escHtml(m.notes || '') + '</td></tr>';
    }).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No stock moves found</td></tr>') +
    '</tbody></table></div></div>';
}

function openInvMoves(type, whId) {
    invTab = 'moves';
    const el = document.getElementById('content');
    el.innerHTML = '<div class="page-header"><h1 class="page-title">Inventory</h1>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="showStockAdjustment()">+ Stock Adjustment</button></div></div>' +
        '<div class="inv-tabs">' +
            '<button class="inv-tab" onclick="invTab=\'overview\';renderInventory(document.getElementById(\'content\'))">Overview</button>' +
            '<button class="inv-tab" onclick="invTab=\'stock\';renderInventory(document.getElementById(\'content\'))">Stock Levels</button>' +
            '<button class="inv-tab active" onclick="invTab=\'moves\';renderInventory(document.getElementById(\'content\'))">Moves History</button>' +
        '</div>' +
        '<div id="inv-content"></div>';
    renderInvMoves(document.getElementById('inv-content'), type, whId);
}

async function showStockAdjustment() {
    const products = await api('/api/products');
    const opts = products.map(p => '<option value="' + p.id + '">' + escHtml(p.name) + '</option>').join('');
    openModal('Stock Adjustment',
        '<form id="stock-form">' +
        '<div class="form-group"><label>Product</label><select name="product_id" class="form-control">' + opts + '</select></div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Type</label><select name="type" class="form-control"><option value="in">Stock In</option><option value="out">Stock Out</option></select></div>' +
            '<div class="form-group"><label>Quantity</label><input name="quantity" type="number" class="form-control" value="1" min="1"></div>' +
        '</div>' +
        '<div class="form-group"><label>Reference</label><input name="reference" class="form-control" placeholder="e.g. ADJ-001"></div>' +
        '<div class="form-group"><label>Notes</label><textarea name="notes" class="form-control"></textarea></div>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveStockMove()">Save</button>'
    );
}

async function saveStockMove() {
    try {
        const data = getFormData('stock-form');
        data.product_id = parseInt(data.product_id);
        data.warehouse_id = 1;
        await api('/api/inventory/moves', { method: 'POST', body: data });
        closeModal(); toast('Stock updated'); navigate('inventory');
    } catch (e) { toast(e.message, 'error'); }
}

const CATEGORIES = ['Sofa','Table','Chair','Bed','Cabinet','Shelf','Desk','Outdoor','Accessory','Raw Material'];

async function editProduct(id) {
    const p = await api('/api/products/' + id);
    const catOpts = CATEGORIES.map(c => '<option value="' + c + '"' + (c === p.category ? ' selected' : '') + '>' + c + '</option>').join('');
    openModal('Edit Product',
        '<form id="edit-product-form">' +
        '<div class="form-group"><label>Name</label><input name="name" class="form-control" value="' + escHtml(p.name) + '"></div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>SKU</label><input name="sku" class="form-control" value="' + escHtml(p.sku || '') + '"></div>' +
            '<div class="form-group"><label>Category</label><select name="category" class="form-control">' + catOpts + '</select></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Cost Price</label><input name="cost_price" type="number" step="0.001" class="form-control" value="' + (p.cost_price || 0) + '"></div>' +
            '<div class="form-group"><label>Sale Price</label><input name="sale_price" type="number" step="0.001" class="form-control" value="' + (p.sale_price || 0) + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Weight (kg)</label><input name="weight" type="number" step="0.01" class="form-control" value="' + (p.weight || 0) + '"></div>' +
            '<div class="form-group"><label>Dimensions</label><input name="dimensions" class="form-control" value="' + escHtml(p.dimensions || '') + '" placeholder="e.g. 120x80x75 cm"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Material</label><input name="material" class="form-control" value="' + escHtml(p.material || '') + '"></div>' +
            '<div class="form-group"><label>Color</label><input name="color" class="form-control" value="' + escHtml(p.color || '') + '"></div>' +
        '</div>' +
        '<div class="form-group"><label>Description</label><textarea name="description" class="form-control">' + escHtml(p.description || '') + '</textarea></div>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveProduct(' + id + ')">Save</button>'
    );
}

async function saveProduct(id) {
    try {
        const data = getFormData('edit-product-form');
        data.cost_price = parseFloat(data.cost_price) || 0;
        data.sale_price = parseFloat(data.sale_price) || 0;
        data.weight = parseFloat(data.weight) || 0;
        await api('/api/products/' + id, { method: 'PUT', body: data });
        closeModal(); toast('Product updated'); navigate('inventory');
    } catch (e) { toast(e.message, 'error'); }
}

// ── Purchase Module ─────────────────────────────────────────────────────────

async function renderPurchase(el) {
    const [orders, dash] = await Promise.all([api('/api/purchase/orders'), api('/api/purchase/dashboard')]);
    el.innerHTML = '<div class="page-header"><h1 class="page-title">Purchase Orders</h1>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="showNewPO()">+ New PO</button></div></div>' +
        '<div class="stats-grid">' +
            '<div class="stat-card"><div class="stat-label">Total Orders</div><div class="stat-value">' + fmtN(dash.total_orders) + '</div></div>' +
            '<div class="stat-card accent"><div class="stat-label">Total Spent</div><div class="stat-value">' + fmt(dash.total_spent) + '</div></div>' +
            '<div class="stat-card warning"><div class="stat-label">Pending</div><div class="stat-value">' + fmtN(dash.pending_orders) + '</div></div>' +
        '</div>' +
        '<div class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>Reference</th><th>Vendor</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th>' +
        '</tr></thead><tbody>' +
        orders.map(o => '<tr onclick="showPODetail(' + o.id + ')">' +
            '<td><strong>' + escHtml(o.reference) + '</strong></td>' +
            '<td>' + escHtml(o.vendor ? o.vendor.name : '') + '</td>' +
            '<td>' + escHtml(o.order_date || '') + '</td>' +
            '<td>' + fmt(o.total) + '</td>' +
            '<td>' + badge(o.status) + '</td>' +
            '<td><button class="btn btn-sm btn-outline" onclick="event.stopPropagation();showPODetail(' + o.id + ')">View</button></td></tr>'
        ).join('') +
        '</tbody></table></div></div>';
}

async function showNewPO() {
    const [vendors, products] = await Promise.all([api('/api/contacts?type=vendor'), api('/api/products')]);
    const vendorOpts = vendors.map(v => '<option value="' + v.id + '">' + escHtml(v.name) + '</option>').join('');
    const prodOpts = products.map(p => '<option value="' + p.id + '" data-price="' + p.cost_price + '">' + escHtml(p.name) + ' (' + fmt(p.cost_price) + ')</option>').join('');
    openModal('New Purchase Order',
        '<form id="po-form">' +
        '<div class="form-group"><label>Vendor</label><select name="vendor_id" class="form-control">' + vendorOpts + '</select></div>' +
        '<hr class="divider"><h4 class="mb-2">Lines</h4>' +
        '<div id="po-lines"><div class="form-row mb-2">' +
            '<div class="form-group"><label>Product</label><select class="form-control po-product">' + prodOpts + '</select></div>' +
            '<div class="form-group"><label>Qty</label><input type="number" class="form-control po-qty" value="1" min="1"></div>' +
        '</div></div>' +
        '<button type="button" class="btn btn-sm btn-outline" onclick="addPOLine()">+ Add Line</button>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="savePO()">Create PO</button>'
    );
    window._poProdOpts = prodOpts;
}

function addPOLine() {
    document.getElementById('po-lines').insertAdjacentHTML('beforeend',
        '<div class="form-row mb-2"><div class="form-group"><label>Product</label><select class="form-control po-product">' + window._poProdOpts + '</select></div>' +
        '<div class="form-group"><label>Qty</label><input type="number" class="form-control po-qty" value="1" min="1"></div></div>');
}

async function savePO() {
    try {
        const form = document.getElementById('po-form');
        const data = { vendor_id: parseInt(form.querySelector('[name=vendor_id]').value), lines: [] };
        const prods = form.querySelectorAll('.po-product');
        const qtys = form.querySelectorAll('.po-qty');
        prods.forEach((p, i) => { data.lines.push({ product_id: parseInt(p.value), quantity: parseFloat(qtys[i].value) || 1 }); });
        await api('/api/purchase/orders', { method: 'POST', body: data });
        closeModal(); toast('Purchase order created'); navigate('purchase');
    } catch (e) { toast(e.message, 'error'); }
}

async function showPODetail(id) {
    const po = await api('/api/purchase/orders/' + id);
    openModal('PO ' + po.reference,
        '<div class="detail-grid">' +
            '<div><div class="detail-field"><div class="detail-label">Vendor</div><div class="detail-value">' + escHtml(po.vendor ? po.vendor.name : '') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">' + badge(po.status) + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Total</div><div class="detail-value" style="font-size:18px;">' + fmt(po.total) + '</div></div></div>' +
        '</div>' +
        '<hr class="divider"><h4 class="mb-2">Lines</h4>' +
        '<table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>' +
        (po.lines || []).map(l => '<tr><td>' + escHtml(l.description || (l.product ? l.product.name : '')) + '</td><td>' + l.quantity + '</td><td>' + fmt(l.unit_price) + '</td><td>' + fmt(l.subtotal) + '</td></tr>').join('') +
        '</tbody></table>',
        (po.status === 'draft' ? '<button class="btn btn-accent" onclick="sendPO(' + id + ')">Send to Vendor</button> ' : '') +
        (po.status === 'sent' ? '<button class="btn btn-success" onclick="receivePO(' + id + ')">Mark Received</button> ' : '') +
        '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
    );
}

async function sendPO(id) { await api('/api/purchase/orders/' + id + '/send', { method: 'POST' }); closeModal(); toast('PO sent'); navigate('purchase'); }
async function receivePO(id) { await api('/api/purchase/orders/' + id + '/receive', { method: 'POST' }); closeModal(); toast('PO received, stock updated, bill created'); navigate('purchase'); }


// ── Manufacturing Module ────────────────────────────────────────────────────

async function renderManufacturing(el) {
    const [orders, boms, dash] = await Promise.all([
        api('/api/manufacturing/orders'), api('/api/manufacturing/bom'), api('/api/manufacturing/dashboard')
    ]);
    el.innerHTML = '<div class="page-header"><h1 class="page-title">Manufacturing</h1>' +
        '<div class="page-actions">' +
            '<button class="btn btn-outline" onclick="showNewBOM()">+ New BOM</button>' +
            '<button class="btn btn-primary" onclick="showNewMO()">+ New MO</button>' +
        '</div></div>' +
        '<div class="stats-grid">' +
            '<div class="stat-card"><div class="stat-label">Total Orders</div><div class="stat-value">' + fmtN(dash.total_orders) + '</div></div>' +
            '<div class="stat-card warning"><div class="stat-label">In Progress</div><div class="stat-value">' + fmtN(dash.in_progress) + '</div></div>' +
            '<div class="stat-card success"><div class="stat-label">Completed</div><div class="stat-value">' + fmtN(dash.completed) + '</div></div>' +
            '<div class="stat-card info"><div class="stat-label">Active BOMs</div><div class="stat-value">' + fmtN(dash.active_boms) + '</div></div>' +
        '</div>' +
        '<div class="tabs">' +
            '<div class="tab active" onclick="showMfgTab(this,&apos;orders&apos;)">Manufacturing Orders</div>' +
            '<div class="tab" onclick="showMfgTab(this,&apos;bom&apos;)">Bills of Materials</div>' +
        '</div>' +
        '<div id="mfg-orders" class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>Reference</th><th>Product</th><th>Qty</th><th>Status</th><th>Start</th><th>Actions</th>' +
        '</tr></thead><tbody>' +
        orders.map(o => '<tr><td><strong>' + escHtml(o.reference) + '</strong></td>' +
            '<td>' + escHtml(o.bom && o.bom.product ? o.bom.product.name : '') + '</td>' +
            '<td>' + o.quantity + '</td><td>' + badge(o.status) + '</td>' +
            '<td>' + escHtml(o.actual_start || o.planned_start || '') + '</td>' +
            '<td>' +
                (o.status === 'draft' ? '<button class="btn btn-sm btn-warning" onclick="startMO(' + o.id + ')">Start</button> ' : '') +
                (o.status === 'in_progress' ? '<button class="btn btn-sm btn-success" onclick="completeMO(' + o.id + ')">Complete</button>' : '') +
            '</td></tr>'
        ).join('') +
        '</tbody></table></div></div>' +
        '<div id="mfg-bom" style="display:none;" class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>BOM Name</th><th>Product</th><th>Components</th><th>Qty</th>' +
        '</tr></thead><tbody>' +
        boms.map(b => '<tr onclick="showBOMDetail(' + b.id + ')">' +
            '<td><strong>' + escHtml(b.name) + '</strong></td>' +
            '<td>' + escHtml(b.product ? b.product.name : '') + '</td>' +
            '<td>' + (b.lines ? b.lines.length : 0) + ' items</td>' +
            '<td>' + b.quantity + '</td></tr>'
        ).join('') +
        '</tbody></table></div></div>';
}

function showMfgTab(tab, which) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('mfg-orders').style.display = which === 'orders' ? '' : 'none';
    document.getElementById('mfg-bom').style.display = which === 'bom' ? '' : 'none';
}

async function startMO(id) { await api('/api/manufacturing/orders/' + id + '/start', { method: 'POST' }); toast('MO started, materials consumed'); navigate('manufacturing'); }
async function completeMO(id) { await api('/api/manufacturing/orders/' + id + '/complete', { method: 'POST' }); toast('MO completed, products added to stock'); navigate('manufacturing'); }

async function showNewBOM() {
    const products = await api('/api/products');
    const finishedOpts = products.filter(p => p.category !== 'Raw Material').map(p => '<option value="' + p.id + '">' + escHtml(p.name) + '</option>').join('');
    const matOpts = products.map(p => '<option value="' + p.id + '">' + escHtml(p.name) + '</option>').join('');
    openModal('New Bill of Materials',
        '<form id="bom-form">' +
        '<div class="form-group"><label>Product (Output)</label><select name="product_id" class="form-control">' + finishedOpts + '</select></div>' +
        '<div class="form-group"><label>BOM Name</label><input name="name" class="form-control"></div>' +
        '<hr class="divider"><h4 class="mb-2">Components</h4>' +
        '<div id="bom-lines"><div class="form-row mb-2">' +
            '<div class="form-group"><label>Material</label><select class="form-control bom-mat">' + matOpts + '</select></div>' +
            '<div class="form-group"><label>Qty</label><input type="number" class="form-control bom-qty" value="1"></div>' +
        '</div></div>' +
        '<button type="button" class="btn btn-sm btn-outline" onclick="addBOMLine()">+ Add Component</button>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveBOM()">Create BOM</button>'
    );
    window._bomMatOpts = matOpts;
}

function addBOMLine() {
    document.getElementById('bom-lines').insertAdjacentHTML('beforeend',
        '<div class="form-row mb-2"><div class="form-group"><label>Material</label><select class="form-control bom-mat">' + window._bomMatOpts + '</select></div>' +
        '<div class="form-group"><label>Qty</label><input type="number" class="form-control bom-qty" value="1"></div></div>');
}

async function saveBOM() {
    try {
        const form = document.getElementById('bom-form');
        const data = { product_id: parseInt(form.querySelector('[name=product_id]').value), name: form.querySelector('[name=name]').value, lines: [] };
        const mats = form.querySelectorAll('.bom-mat');
        const qtys = form.querySelectorAll('.bom-qty');
        mats.forEach((m, i) => { data.lines.push({ product_id: parseInt(m.value), quantity: parseFloat(qtys[i].value) || 1 }); });
        await api('/api/manufacturing/bom', { method: 'POST', body: data });
        closeModal(); toast('BOM created'); navigate('manufacturing');
    } catch (e) { toast(e.message, 'error'); }
}

async function showBOMDetail(id) {
    const bom = await api('/api/manufacturing/bom/' + id);
    openModal('BOM: ' + bom.name,
        '<div class="detail-field"><div class="detail-label">Product</div><div class="detail-value">' + escHtml(bom.product ? bom.product.name : '') + '</div></div>' +
        '<hr class="divider"><h4 class="mb-2">Components</h4>' +
        '<table><thead><tr><th>Material</th><th>Qty</th><th>Notes</th></tr></thead><tbody>' +
        (bom.lines || []).map(l => '<tr><td>' + escHtml(l.product ? l.product.name : '') + '</td><td>' + l.quantity + '</td><td>' + escHtml(l.notes || '') + '</td></tr>').join('') +
        '</tbody></table>',
        '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
    );
}

async function showNewMO() {
    const boms = await api('/api/manufacturing/bom');
    const opts = boms.map(b => '<option value="' + b.id + '">' + escHtml(b.name) + ' (' + escHtml(b.product ? b.product.name : '') + ')</option>').join('');
    openModal('New Manufacturing Order',
        '<form id="mo-form">' +
        '<div class="form-group"><label>Bill of Materials</label><select name="bom_id" class="form-control">' + opts + '</select></div>' +
        '<div class="form-group"><label>Quantity</label><input name="quantity" type="number" class="form-control" value="1" min="1"></div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Planned Start</label><input name="planned_start" type="date" class="form-control"></div>' +
            '<div class="form-group"><label>Planned End</label><input name="planned_end" type="date" class="form-control"></div>' +
        '</div>' +
        '<div class="form-group"><label>Notes</label><textarea name="notes" class="form-control"></textarea></div>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveMO()">Create MO</button>'
    );
}

async function saveMO() {
    try {
        const data = getFormData('mo-form');
        data.bom_id = parseInt(data.bom_id);
        if (!data.planned_start) delete data.planned_start;
        if (!data.planned_end) delete data.planned_end;
        await api('/api/manufacturing/orders', { method: 'POST', body: data });
        closeModal(); toast('Manufacturing order created'); navigate('manufacturing');
    } catch (e) { toast(e.message, 'error'); }
}


// ── Email Marketing Module ──────────────────────────────────────────────────

async function renderEmailMarketing(el) {
    const [campaigns, lists, dash] = await Promise.all([
        api('/api/marketing/email/campaigns'), api('/api/marketing/lists'), api('/api/marketing/dashboard')
    ]);
    el.innerHTML = '<div class="page-header"><h1 class="page-title">Email Marketing</h1>' +
        '<div class="page-actions">' +
            '<button class="btn btn-outline" onclick="showNewMailingList()">+ Mailing List</button>' +
            '<button class="btn btn-primary" onclick="showNewEmailCampaign()">+ New Campaign</button>' +
        '</div></div>' +
        '<div class="stats-grid">' +
            '<div class="stat-card"><div class="stat-label">Campaigns</div><div class="stat-value">' + fmtN(dash.email_campaigns) + '</div></div>' +
            '<div class="stat-card accent"><div class="stat-label">Emails Sent</div><div class="stat-value">' + fmtN(dash.total_emails_sent) + '</div></div>' +
            '<div class="stat-card success"><div class="stat-label">Open Rate</div><div class="stat-value">' + dash.email_open_rate + '%</div></div>' +
            '<div class="stat-card info"><div class="stat-label">Click Rate</div><div class="stat-value">' + dash.email_click_rate + '%</div></div>' +
        '</div>' +
        '<div class="tabs">' +
            '<div class="tab active" onclick="showEmailTab(this,&apos;campaigns&apos;)">Campaigns</div>' +
            '<div class="tab" onclick="showEmailTab(this,&apos;lists&apos;)">Mailing Lists</div>' +
        '</div>' +
        '<div id="email-campaigns" class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>Name</th><th>Subject</th><th>List</th><th>Sent</th><th>Opened</th><th>Clicked</th><th>Status</th><th>Actions</th>' +
        '</tr></thead><tbody>' +
        campaigns.map(c => '<tr>' +
            '<td><strong>' + escHtml(c.name) + '</strong></td>' +
            '<td>' + escHtml(c.subject || '') + '</td>' +
            '<td>' + escHtml(c.mailing_list ? c.mailing_list.name : '') + '</td>' +
            '<td>' + fmtN(c.total_sent) + '</td>' +
            '<td>' + fmtN(c.total_opened) + '</td>' +
            '<td>' + fmtN(c.total_clicked) + '</td>' +
            '<td>' + badge(c.status) + '</td>' +
            '<td>' + (c.status === 'draft' ?
                '<button class="btn btn-sm btn-success" onclick="sendEmailCampaign(' + c.id + ')">Send</button> ' +
                '<button class="btn btn-sm btn-outline" onclick="editEmailCampaign(' + c.id + ')">Edit</button>' : '') + '</td></tr>'
        ).join('') +
        '</tbody></table></div></div>' +
        '<div id="email-lists" style="display:none;" class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>Name</th><th>Description</th><th>Subscribers</th>' +
        '</tr></thead><tbody>' +
        lists.map(l => '<tr><td><strong>' + escHtml(l.name) + '</strong></td>' +
            '<td>' + escHtml(l.description || '') + '</td>' +
            '<td>' + fmtN(l.subscriber_count) + '</td></tr>'
        ).join('') +
        '</tbody></table></div></div>';
}

function showEmailTab(tab, which) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('email-campaigns').style.display = which === 'campaigns' ? '' : 'none';
    document.getElementById('email-lists').style.display = which === 'lists' ? '' : 'none';
}

async function showNewMailingList() {
    openModal('New Mailing List',
        '<form id="ml-form">' +
        '<div class="form-group"><label>Name</label><input name="name" class="form-control" required></div>' +
        '<div class="form-group"><label>Description</label><textarea name="description" class="form-control"></textarea></div>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveMailingList()">Create</button>'
    );
}

async function saveMailingList() {
    try {
        const data = getFormData('ml-form');
        await api('/api/marketing/lists', { method: 'POST', body: data });
        closeModal(); toast('Mailing list created'); navigate('email-marketing');
    } catch (e) { toast(e.message, 'error'); }
}

async function showNewEmailCampaign() {
    const lists = await api('/api/marketing/lists');
    const opts = lists.map(l => '<option value="' + l.id + '">' + escHtml(l.name) + ' (' + l.subscriber_count + ' subscribers)</option>').join('');
    openModal('New Email Campaign',
        '<form id="ec-form">' +
        '<div class="form-group"><label>Campaign Name</label><input name="name" class="form-control" required></div>' +
        '<div class="form-group"><label>Subject Line</label><input name="subject" class="form-control" required></div>' +
        '<div class="form-group"><label>Mailing List</label><select name="mailing_list_id" class="form-control">' + opts + '</select></div>' +
        '<div class="form-group"><label>Email Body (HTML)</label><textarea name="body_html" class="form-control" rows="6" placeholder="<h1>Hello!</h1><p>Your content here...</p>"></textarea></div>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveEmailCampaign()">Create Campaign</button>'
    );
}

async function saveEmailCampaign() {
    try {
        const data = getFormData('ec-form');
        data.mailing_list_id = parseInt(data.mailing_list_id);
        await api('/api/marketing/email/campaigns', { method: 'POST', body: data });
        closeModal(); toast('Campaign created'); navigate('email-marketing');
    } catch (e) { toast(e.message, 'error'); }
}

async function editEmailCampaign(id) {
    const c = await api('/api/marketing/email/campaigns/' + id);
    const lists = await api('/api/marketing/lists');
    const opts = lists.map(l => '<option value="' + l.id + '"' + (c.mailing_list_id === l.id ? ' selected' : '') + '>' + escHtml(l.name) + '</option>').join('');
    openModal('Edit Campaign',
        '<form id="ec-edit-form">' +
        '<div class="form-group"><label>Name</label><input name="name" class="form-control" value="' + escHtml(c.name) + '"></div>' +
        '<div class="form-group"><label>Subject</label><input name="subject" class="form-control" value="' + escHtml(c.subject || '') + '"></div>' +
        '<div class="form-group"><label>Mailing List</label><select name="mailing_list_id" class="form-control">' + opts + '</select></div>' +
        '<div class="form-group"><label>Body HTML</label><textarea name="body_html" class="form-control" rows="6">' + escHtml(c.body_html || '') + '</textarea></div>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="updateEmailCampaign(' + id + ')">Save</button>'
    );
}

async function updateEmailCampaign(id) {
    try {
        const data = getFormData('ec-edit-form');
        data.mailing_list_id = parseInt(data.mailing_list_id);
        await api('/api/marketing/email/campaigns/' + id, { method: 'PUT', body: data });
        closeModal(); toast('Campaign updated'); navigate('email-marketing');
    } catch (e) { toast(e.message, 'error'); }
}

async function sendEmailCampaign(id) {
    if (!confirm('Send this email campaign to all subscribers?')) return;
    await api('/api/marketing/email/campaigns/' + id + '/send', { method: 'POST' });
    toast('Campaign sent!'); navigate('email-marketing');
}

// ── SMS Marketing Module ────────────────────────────────────────────────────

async function renderSMSMarketing(el) {
    const [campaigns, lists, dash] = await Promise.all([
        api('/api/marketing/sms/campaigns'), api('/api/marketing/lists'), api('/api/marketing/dashboard')
    ]);
    el.innerHTML = '<div class="page-header"><h1 class="page-title">SMS Marketing</h1>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="showNewSMSCampaign()">+ New Campaign</button></div></div>' +
        '<div class="stats-grid">' +
            '<div class="stat-card"><div class="stat-label">SMS Campaigns</div><div class="stat-value">' + fmtN(dash.sms_campaigns) + '</div></div>' +
            '<div class="stat-card accent"><div class="stat-label">Total SMS Sent</div><div class="stat-value">' + fmtN(dash.total_sms_sent) + '</div></div>' +
            '<div class="stat-card info"><div class="stat-label">Subscribers</div><div class="stat-value">' + fmtN(dash.total_subscribers) + '</div></div>' +
        '</div>' +
        '<div class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>Name</th><th>Message</th><th>Sent</th><th>Delivered</th><th>Failed</th><th>Status</th><th>Actions</th>' +
        '</tr></thead><tbody>' +
        campaigns.map(c => '<tr>' +
            '<td><strong>' + escHtml(c.name) + '</strong></td>' +
            '<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(c.message) + '</td>' +
            '<td>' + fmtN(c.total_sent) + '</td><td>' + fmtN(c.total_delivered) + '</td><td>' + fmtN(c.total_failed) + '</td>' +
            '<td>' + badge(c.status) + '</td>' +
            '<td>' + (c.status === 'draft' ? '<button class="btn btn-sm btn-success" onclick="sendSMSCampaign(' + c.id + ')">Send</button>' : '') + '</td></tr>'
        ).join('') +
        '</tbody></table></div></div>';
}

async function showNewSMSCampaign() {
    const lists = await api('/api/marketing/lists');
    const opts = lists.map(l => '<option value="' + l.id + '">' + escHtml(l.name) + ' (' + l.subscriber_count + ')</option>').join('');
    openModal('New SMS Campaign',
        '<form id="sms-form">' +
        '<div class="form-group"><label>Campaign Name</label><input name="name" class="form-control" required></div>' +
        '<div class="form-group"><label>Mailing List</label><select name="mailing_list_id" class="form-control">' + opts + '</select></div>' +
        '<div class="form-group"><label>Message</label><textarea name="message" class="form-control" rows="4" maxlength="160" oninput="document.getElementById(&apos;sms-count&apos;).textContent=this.value.length+&apos;/160&apos;"></textarea><div class="sms-char-count" id="sms-count">0/160</div></div>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveSMSCampaign()">Create</button>'
    );
}

async function saveSMSCampaign() {
    try {
        const data = getFormData('sms-form');
        data.mailing_list_id = parseInt(data.mailing_list_id);
        await api('/api/marketing/sms/campaigns', { method: 'POST', body: data });
        closeModal(); toast('SMS campaign created'); navigate('sms-marketing');
    } catch (e) { toast(e.message, 'error'); }
}

async function sendSMSCampaign(id) {
    if (!confirm('Send this SMS campaign?')) return;
    await api('/api/marketing/sms/campaigns/' + id + '/send', { method: 'POST' });
    toast('SMS campaign sent!'); navigate('sms-marketing');
}


// ── Contacts Module ─────────────────────────────────────────────────────────

async function renderContacts(el) {
    const contacts = await api('/api/contacts');
    el.innerHTML = '<div class="page-header"><h1 class="page-title">Contacts</h1>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="showNewContact()">+ New Contact</button></div></div>' +
        '<div class="tabs">' +
            '<div class="tab active" onclick="filterContactsTab(this,&apos;all&apos;)">All</div>' +
            '<div class="tab" onclick="filterContactsTab(this,&apos;customer&apos;)">Customers</div>' +
            '<div class="tab" onclick="filterContactsTab(this,&apos;vendor&apos;)">Vendors</div>' +
        '</div>' +
        '<div class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>City</th><th>Type</th>' +
        '</tr></thead><tbody id="contacts-tbody">' +
        contacts.map(c => '<tr class="contact-row" data-cust="' + c.is_customer + '" data-vend="' + c.is_vendor + '" onclick="showContactDetail(' + c.id + ')">' +
            '<td><strong>' + escHtml(c.name) + '</strong></td>' +
            '<td>' + escHtml(c.company || '') + '</td>' +
            '<td>' + escHtml(c.email || '') + '</td>' +
            '<td>' + escHtml(c.phone || '') + '</td>' +
            '<td>' + escHtml(c.city || '') + '</td>' +
            '<td>' + (c.is_customer ? '<span class="badge badge-confirmed">Customer</span> ' : '') + (c.is_vendor ? '<span class="badge badge-proposition">Vendor</span>' : '') + '</td></tr>'
        ).join('') +
        '</tbody></table></div></div>';
}

function filterContactsTab(tab, type) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.contact-row').forEach(r => {
        if (type === 'all') r.style.display = '';
        else if (type === 'customer') r.style.display = r.dataset.cust === 'True' ? '' : 'none';
        else r.style.display = r.dataset.vend === 'True' ? '' : 'none';
    });
}

async function showNewContact() {
    openModal('New Contact',
        '<form id="contact-form">' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Name</label><input name="name" class="form-control" required></div>' +
            '<div class="form-group"><label>Company</label><input name="company" class="form-control"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Email</label><input name="email" type="email" class="form-control"></div>' +
            '<div class="form-group"><label>Phone</label><input name="phone" class="form-control"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Mobile</label><input name="mobile" class="form-control"></div>' +
            '<div class="form-group"><label>City</label><input name="city" class="form-control"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>State</label><input name="state" class="form-control"></div>' +
            '<div class="form-group"><label>Country</label><input name="country" class="form-control" value="US"></div>' +
        '</div>' +
        '<div class="form-group"><label>Address</label><textarea name="address" class="form-control"></textarea></div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label><input type="checkbox" name="is_customer" checked> Customer</label></div>' +
            '<div class="form-group"><label><input type="checkbox" name="is_vendor"> Vendor</label></div>' +
        '</div>' +
        '<div class="form-group"><label>Notes</label><textarea name="notes" class="form-control"></textarea></div>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveContact()">Create</button>'
    );
}

async function saveContact() {
    try {
        const data = getFormData('contact-form');
        await api('/api/contacts', { method: 'POST', body: data });
        closeModal(); toast('Contact created'); navigate('contacts');
    } catch (e) { toast(e.message, 'error'); }
}

async function showContactDetail(id) {
    const c = await api('/api/contacts/' + id);
    openModal(c.name,
        '<div class="detail-grid">' +
            '<div><div class="detail-field"><div class="detail-label">Company</div><div class="detail-value">' + escHtml(c.company || 'N/A') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Email</div><div class="detail-value">' + escHtml(c.email || 'N/A') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Phone</div><div class="detail-value">' + escHtml(c.phone || 'N/A') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Mobile</div><div class="detail-value">' + escHtml(c.mobile || 'N/A') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">City</div><div class="detail-value">' + escHtml(c.city || '') + ', ' + escHtml(c.state || '') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Type</div><div class="detail-value">' +
                (c.is_customer ? '<span class="badge badge-confirmed">Customer</span> ' : '') +
                (c.is_vendor ? '<span class="badge badge-proposition">Vendor</span>' : '') + '</div></div></div>' +
        '</div>' +
        (c.address ? '<div class="detail-field mt-2"><div class="detail-label">Address</div><div class="detail-value">' + escHtml(c.address) + '</div></div>' : '') +
        (c.notes ? '<div class="detail-field mt-2"><div class="detail-label">Notes</div><div class="detail-value">' + escHtml(c.notes) + '</div></div>' : ''),
        '<button class="btn btn-danger btn-sm" onclick="deleteContact(' + id + ')">Delete</button>' +
        '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
    );
}

async function deleteContact(id) {
    if (!confirm('Delete this contact?')) return;
    try {
        await api('/api/contacts/' + id, { method: 'DELETE' });
        closeModal(); toast('Contact deleted'); navigate('contacts');
    } catch (e) { toast(e.message, 'error'); }
}

// ── Products Module ─────────────────────────────────────────────────────────

async function renderProducts(el) {
    const products = await api('/api/products');
    const categories = ['All', 'Sofa', 'Table', 'Chair', 'Bed', 'Cabinet', 'Shelf', 'Desk', 'Outdoor', 'Accessory', 'Raw Material'];
    el.innerHTML = '<div class="page-header"><h1 class="page-title">Products</h1>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="showNewProduct()">+ New Product</button></div></div>' +
        '<div class="tabs">' +
        categories.map((c, i) => '<div class="tab' + (i === 0 ? ' active' : '') + '" onclick="filterProducts(this,&apos;' + c + '&apos;)">'+c+'</div>').join('') +
        '</div>' +
        '<div class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>SKU</th><th>Name</th><th>Category</th><th>Material</th><th>Sale Price</th><th>Cost</th><th>Dimensions</th>' +
        '</tr></thead><tbody id="products-tbody">' +
        products.map(p => '<tr class="prod-row" data-cat="' + escHtml(p.category || '') + '" onclick="showProductDetail(' + p.id + ')">' +
            '<td>' + escHtml(p.sku || '') + '</td>' +
            '<td><strong>' + escHtml(p.name) + '</strong></td>' +
            '<td>' + escHtml(p.category || '') + '</td>' +
            '<td>' + escHtml(p.material || '') + '</td>' +
            '<td>' + fmt(p.sale_price) + '</td>' +
            '<td>' + fmt(p.cost_price) + '</td>' +
            '<td>' + escHtml(p.dimensions || '') + '</td></tr>'
        ).join('') +
        '</tbody></table></div></div>';
}

function filterProducts(tab, cat) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.prod-row').forEach(r => {
        r.style.display = (cat === 'All' || r.dataset.cat === cat) ? '' : 'none';
    });
}

async function showNewProduct() {
    const categories = ['Sofa', 'Table', 'Chair', 'Bed', 'Cabinet', 'Shelf', 'Desk', 'Outdoor', 'Accessory', 'Raw Material'];
    openModal('New Product',
        '<form id="product-form">' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Name</label><input name="name" class="form-control" required></div>' +
            '<div class="form-group"><label>SKU</label><input name="sku" class="form-control" required></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Category</label><select name="category" class="form-control">' + categories.map(c => '<option>' + c + '</option>').join('') + '</select></div>' +
            '<div class="form-group"><label>Material</label><input name="material" class="form-control"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Sale Price</label><input name="sale_price" type="number" class="form-control" step="0.01" value="0"></div>' +
            '<div class="form-group"><label>Cost Price</label><input name="cost_price" type="number" class="form-control" step="0.01" value="0"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Dimensions</label><input name="dimensions" class="form-control" placeholder="e.g. 120x80x75 cm"></div>' +
            '<div class="form-group"><label>Color</label><input name="color" class="form-control"></div>' +
        '</div>' +
        '<div class="form-group"><label>Description</label><textarea name="description" class="form-control"></textarea></div>' +
        '</form>',
        '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="saveProduct()">Create</button>'
    );
}

async function saveProduct() {
    try {
        const data = getFormData('product-form');
        await api('/api/products', { method: 'POST', body: data });
        closeModal(); toast('Product created'); navigate('products');
    } catch (e) { toast(e.message, 'error'); }
}

async function showProductDetail(id) {
    const p = await api('/api/products/' + id);
    const stock = await api('/api/products/' + id + '/stock');
    openModal(p.name,
        '<div class="detail-grid">' +
            '<div><div class="detail-field"><div class="detail-label">SKU</div><div class="detail-value">' + escHtml(p.sku) + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Category</div><div class="detail-value">' + escHtml(p.category) + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Sale Price</div><div class="detail-value" style="font-size:18px;color:var(--primary);">' + fmt(p.sale_price) + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Cost Price</div><div class="detail-value">' + fmt(p.cost_price) + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Material</div><div class="detail-value">' + escHtml(p.material || 'N/A') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Dimensions</div><div class="detail-value">' + escHtml(p.dimensions || 'N/A') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Color</div><div class="detail-value">' + escHtml(p.color || 'N/A') + '</div></div></div>' +
            '<div><div class="detail-field"><div class="detail-label">Stock On Hand</div><div class="detail-value" style="font-size:18px;font-weight:700;">' + stock.on_hand + '</div></div></div>' +
        '</div>' +
        (p.description ? '<div class="detail-field mt-4"><div class="detail-label">Description</div><div class="detail-value">' + escHtml(p.description) + '</div></div>' : ''),
        '<button class="btn btn-danger btn-sm" onclick="deleteProduct(' + id + ')">Archive</button>' +
        '<button class="btn btn-outline" onclick="closeModal()">Close</button>'
    );
}

async function deleteProduct(id) {
    if (!confirm('Archive this product?')) return;
    await api('/api/products/' + id, { method: 'DELETE' });
    closeModal(); toast('Product archived'); navigate('products');
}

// ── To-do Module ────────────────────────────────────────────────────────────

const TODO_STAGES = [
    { key: 'inbox', label: 'Inbox' },
    { key: 'today', label: 'Today' },
    { key: 'this_week', label: 'This Week' },
    { key: 'this_month', label: 'This Month' },
    { key: 'later', label: 'Later' },
];
const TODO_CLOSED = [
    { key: 'done', label: 'Done' },
    { key: 'cancelled', label: 'Cancelled' },
];

async function renderTodo(el) {
    const todos = await api('/api/todo/');
    const byStage = {};
    [...TODO_STAGES, ...TODO_CLOSED].forEach(s => byStage[s.key] = []);
    todos.forEach(t => {
        if (byStage[t.stage]) byStage[t.stage].push(t);
        else byStage['inbox'].push(t);
    });

    el.innerHTML = '<div class="page-header">' +
        '<h1 class="page-title">To-do</h1>' +
        '<div class="page-actions">' +
            '<button class="btn btn-primary" onclick="showNewTodo(\'inbox\')">New</button>' +
            '<span style="font-size:12px;color:var(--text-muted);margin-left:8px;">To-dos</span>' +
        '</div></div>' +
        '<div class="card" style="overflow:hidden;">' +
        '<div class="todo-board">' +
        TODO_STAGES.map(s => {
            const items = byStage[s.key];
            return '<div class="todo-column" data-stage="' + s.key + '">' +
                '<div class="todo-col-header">' +
                    '<span>' + s.label + '</span>' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                        '<span class="count' + (items.length ? ' has-items' : '') + '">' + items.length + '</span>' +
                        '<button class="todo-col-add" onclick="showNewTodo(\'' + s.key + '\')" title="Add">+</button>' +
                    '</div>' +
                '</div>' +
                '<div class="todo-col-progress"><div class="todo-col-progress-bar" style="width:' + (items.length ? '100' : '0') + '%"></div></div>' +
                '<div class="todo-col-body">' +
                    items.map(t => renderTodoCard(t)).join('') +
                '</div>' +
            '</div>';
        }).join('') +
        TODO_CLOSED.map(s => {
            const items = byStage[s.key];
            return '<div class="todo-column-collapsed" onclick="showClosedTodos(\'' + s.key + '\',\'' + s.label + '\')" title="' + s.label + ' (' + items.length + ')">' +
                '<div class="todo-col-collapsed-count">' + items.length + '</div>' +
                '<div class="todo-col-collapsed-label">' + s.label + '</div>' +
            '</div>';
        }).join('') +
        '</div></div>';
}

function renderTodoCard(t) {
    const stars = [1, 2, 3].map(i =>
        '<button class="todo-star' + (i <= (t.priority || 0) ? ' filled' : '') + '" onclick="event.stopPropagation();setTodoPriority(' + t.id + ',' + i + ')">' +
        (i <= (t.priority || 0) ? '&#9733;' : '&#9734;') + '</button>'
    ).join('');
    let deadlineHtml = '';
    if (t.deadline) {
        const dl = new Date(t.deadline);
        const now = new Date(); now.setHours(0,0,0,0);
        const overdue = dl < now;
        deadlineHtml = '<div class="todo-card-deadline' + (overdue ? ' overdue' : '') + '">' + dl.toLocaleDateString() + '</div>';
    }
    return '<div class="todo-card" onclick="showEditTodo(' + t.id + ')">' +
        '<div class="todo-card-title">' + escHtml(t.title) + '</div>' +
        deadlineHtml +
        '<div class="todo-card-footer">' +
            '<div class="todo-stars">' + stars + '</div>' +
            '<div class="todo-card-actions">' +
                '<button title="Schedule" onclick="event.stopPropagation();showScheduleTodo(' + t.id + ')">&#128339;</button>' +
                '<button class="btn-done" title="Mark done" onclick="event.stopPropagation();moveTodo(' + t.id + ',\'done\')">&#9745;</button>' +
            '</div>' +
        '</div>' +
    '</div>';
}

function showNewTodo(stage) {
    openModal('New To-do', '<form id="todo-form">' +
        '<div class="form-group"><label>Title</label><input name="title" class="form-control" required placeholder="e.g. Review quarterly report"></div>' +
        '<div class="form-group"><label>Description</label><textarea name="description" class="form-control" rows="3"></textarea></div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Stage</label><select name="stage" class="form-control">' +
                TODO_STAGES.map(s => '<option value="' + s.key + '"' + (s.key === stage ? ' selected' : '') + '>' + s.label + '</option>').join('') +
            '</select></div>' +
            '<div class="form-group"><label>Deadline</label><input name="deadline" type="date" class="form-control"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Priority</label><select name="priority" class="form-control">' +
                '<option value="0">None</option><option value="1">Low</option><option value="2">Medium</option><option value="3">High</option>' +
            '</select></div>' +
            '<div class="form-group"><label>Assigned To</label><input name="assigned_to" class="form-control" placeholder="e.g. Administrator"></div>' +
        '</div>' +
    '</form>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="saveTodo()">Create</button>');
}

async function saveTodo() {
    const data = getFormData('todo-form');
    data.priority = parseInt(data.priority) || 0;
    if (!data.deadline) delete data.deadline;
    await api('/api/todo/', { method: 'POST', body: data });
    closeModal(); toast('To-do created'); navigate('todo');
}

async function showEditTodo(id) {
    const todos = await api('/api/todo/');
    const t = todos.find(x => x.id === id);
    if (!t) return;
    openModal('Edit To-do', '<form id="todo-form">' +
        '<div class="form-group"><label>Title</label><input name="title" class="form-control" value="' + escHtml(t.title) + '"></div>' +
        '<div class="form-group"><label>Description</label><textarea name="description" class="form-control" rows="3">' + escHtml(t.description || '') + '</textarea></div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Stage</label><select name="stage" class="form-control">' +
                [...TODO_STAGES, ...TODO_CLOSED].map(s => '<option value="' + s.key + '"' + (s.key === t.stage ? ' selected' : '') + '>' + s.label + '</option>').join('') +
            '</select></div>' +
            '<div class="form-group"><label>Deadline</label><input name="deadline" type="date" class="form-control" value="' + (t.deadline || '') + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group"><label>Priority</label><select name="priority" class="form-control">' +
                [0,1,2,3].map(i => '<option value="' + i + '"' + (i === t.priority ? ' selected' : '') + '>' + ['None','Low','Medium','High'][i] + '</option>').join('') +
            '</select></div>' +
            '<div class="form-group"><label>Assigned To</label><input name="assigned_to" class="form-control" value="' + escHtml(t.assigned_to || '') + '"></div>' +
        '</div>' +
    '</form>',
    '<button class="btn btn-danger" onclick="deleteTodo(' + id + ')" style="margin-right:auto;">Delete</button>' +
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="updateTodo(' + id + ')">Save</button>');
}

async function updateTodo(id) {
    const data = getFormData('todo-form');
    data.priority = parseInt(data.priority) || 0;
    if (!data.deadline) data.deadline = null;
    await api('/api/todo/' + id, { method: 'PUT', body: data });
    closeModal(); toast('To-do updated'); navigate('todo');
}

async function deleteTodo(id) {
    await api('/api/todo/' + id, { method: 'DELETE' });
    closeModal(); toast('To-do deleted'); navigate('todo');
}

async function setTodoPriority(id, priority) {
    const todos = await api('/api/todo/');
    const t = todos.find(x => x.id === id);
    const newP = (t && t.priority === priority) ? 0 : priority;
    await api('/api/todo/' + id, { method: 'PUT', body: { priority: newP } });
    navigate('todo');
}

async function moveTodo(id, stage) {
    await api('/api/todo/' + id, { method: 'PUT', body: { stage: stage } });
    toast(stage === 'done' ? 'Marked as done!' : 'Moved to ' + stage);
    navigate('todo');
}

function showScheduleTodo(id) {
    openModal('Schedule To-do', '<form id="schedule-form">' +
        '<div class="form-group"><label>Move to</label><select name="stage" class="form-control">' +
            TODO_STAGES.map(s => '<option value="' + s.key + '">' + s.label + '</option>').join('') +
        '</select></div>' +
        '<div class="form-group"><label>Deadline</label><input name="deadline" type="date" class="form-control"></div>' +
    '</form>',
    '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="applyScheduleTodo(' + id + ')">Apply</button>');
}

async function applyScheduleTodo(id) {
    const data = getFormData('schedule-form');
    if (!data.deadline) delete data.deadline;
    await api('/api/todo/' + id, { method: 'PUT', body: data });
    closeModal(); toast('Scheduled'); navigate('todo');
}

function showClosedTodos(stage, label) {
    api('/api/todo/?stage=' + stage).then(todos => {
        openModal(label + ' (' + todos.length + ')', todos.length ?
            '<div style="max-height:400px;overflow-y:auto;">' +
            todos.map(t => '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">' +
                '<span style="font-size:13.5px;">' + escHtml(t.title) + '</span>' +
                '<button class="btn btn-outline btn-sm" onclick="moveTodo(' + t.id + ',\'inbox\');closeModal();">Reopen</button>' +
            '</div>').join('') +
            '</div>' :
            '<p class="text-muted" style="text-align:center;padding:20px;">No items</p>',
        '<button class="btn btn-outline" onclick="closeModal()">Close</button>');
    });
}

// ── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    navigate('dashboard');
});

document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});
