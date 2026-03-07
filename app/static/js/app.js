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
        todo: 'To-do', dashboards: 'Dashboards' };
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
            case 'dashboards': await renderDashboards(el); break;
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

let crmView = 'kanban';
const CRM_STAGES = ['new', 'qualified', 'proposition', 'won', 'lost'];
const CRM_STAGE_LABELS = { new: 'New', qualified: 'Qualified', proposition: 'Proposition', won: 'Won', lost: 'Lost' };
const CRM_STAGE_COLORS = { new: 'var(--accent)', qualified: 'var(--info)', proposition: 'var(--warning)', won: 'var(--success)', lost: 'var(--danger)' };

async function renderCRM(el) {
    const pipeline = await api('/api/crm/pipeline');
    const allLeads = [];
    CRM_STAGES.forEach(s => { (pipeline[s]?.leads || []).forEach(l => { l._stage = s; allLeads.push(l); }); });

    el.innerHTML = '<div class="crm-toolbar">' +
        '<div class="crm-toolbar-left">' +
            '<button class="btn btn-accent" onclick="showNewLeadForm()">New</button>' +
            '<span class="crm-breadcrumb">Pipeline</span>' +
        '</div>' +
        '<div class="crm-toolbar-center">' +
            '<div class="contacts-search-box">' +
                '<span class="contacts-search-icon">&#128269;</span>' +
                '<input type="text" class="contacts-search-input" placeholder="Search..." id="crm-search" oninput="crmSearchFilter()">' +
            '</div>' +
        '</div>' +
        '<div class="crm-toolbar-right">' +
            '<div class="crm-view-switcher">' +
                '<button class="crm-view-btn' + (crmView==='kanban'?' active':'') + '" onclick="crmView=\'kanban\';navigate(\'crm\')" title="Kanban">&#9871;</button>' +
                '<button class="crm-view-btn' + (crmView==='list'?' active':'') + '" onclick="crmView=\'list\';navigate(\'crm\')" title="List">&#9776;</button>' +
                '<button class="crm-view-btn' + (crmView==='graph'?' active':'') + '" onclick="crmView=\'graph\';navigate(\'crm\')" title="Graph">&#9670;</button>' +
            '</div>' +
        '</div>' +
    '</div>' +
    '<div id="crm-content"></div>';

    const container = document.getElementById('crm-content');
    if (crmView === 'kanban') renderCRMKanban(container, pipeline);
    else if (crmView === 'list') renderCRMList(container, allLeads);
    else if (crmView === 'graph') renderCRMGraph(container, pipeline, allLeads);
}

function renderCRMKanban(el, pipeline) {
    el.innerHTML = '<div class="crm-kanban">' +
    CRM_STAGES.map(s => {
        const d = pipeline[s] || { leads: [], count: 0, revenue: 0 };
        return '<div class="crm-kanban-col">' +
            '<div class="crm-kanban-col-header">' +
                '<span>' + CRM_STAGE_LABELS[s] + '</span>' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<span class="crm-col-total">' + fmt(d.revenue) + '</span>' +
                    '<button class="todo-col-add" onclick="showNewLeadForm(\'' + s + '\')">+</button>' +
                '</div>' +
            '</div>' +
            '<div class="crm-kanban-col-progress"><div class="crm-kanban-col-progress-bar" style="width:' + (d.count ? '100' : '0') + '%;background:' + CRM_STAGE_COLORS[s] + '"></div></div>' +
            '<div class="crm-kanban-col-body">' +
                d.leads.map(l => renderCRMCard(l)).join('') +
            '</div>' +
        '</div>';
    }).join('') + '</div>';
}

function renderCRMCard(l) {
    const contactName = l.contact ? l.contact.name : 'No contact';
    const initials = contactInitials(contactName);
    const color = contactAvatarColor(contactName);
    const probColor = l.probability >= 70 ? 'var(--success)' : l.probability >= 40 ? 'var(--warning)' : 'var(--danger)';
    const stars = [1, 2, 3].map(i => {
        const prio = l.probability >= 70 ? 3 : l.probability >= 40 ? 2 : 1;
        return '<span style="color:' + (i <= prio ? '#F59E0B' : '#555') + ';font-size:12px;">&#9733;</span>';
    }).join('');

    return '<div class="crm-card" onclick="showLeadDetail(' + l.id + ')">' +
        '<div class="crm-card-ref">' + escHtml(l.title) + '</div>' +
        '<div class="crm-card-amount">' + fmt(l.expected_revenue) + '</div>' +
        '<div class="crm-card-contact">' +
            '<span class="contact-avatar" style="background:' + color + ';width:22px;height:22px;min-width:22px;font-size:10px;">' + initials + '</span>' +
            '<span>' + escHtml(contactName) + '</span>' +
        '</div>' +
        (l.source ? '<div class="crm-card-source">' + escHtml(l.source) + '</div>' : '') +
        '<div class="crm-card-footer">' +
            '<div class="crm-card-stars">' + stars + '</div>' +
            '<div class="crm-card-badges">' +
                '<span class="crm-prob-badge" style="background:' + probColor + '">' + l.probability + '%</span>' +
                '<span class="crm-card-icon" title="Activities">&#128172;</span>' +
                '<span class="crm-card-icon" title="Schedule">&#128339;</span>' +
            '</div>' +
        '</div>' +
    '</div>';
}

function renderCRMList(el, leads) {
    el.innerHTML = '<div class="card" style="overflow:hidden;border-radius:0;">' +
        '<table class="contacts-table"><thead><tr>' +
            '<th style="width:32px;"><input type="checkbox"></th>' +
            '<th>Opportunity</th><th>Contact Name</th><th>Email</th><th>Salesperson</th><th>Expected Revenue</th><th>Stage</th>' +
        '</tr></thead><tbody>' +
        (leads.length ? leads.map(l => {
            const contactName = l.contact ? l.contact.name : '';
            const email = l.contact ? l.contact.email || '' : '';
            return '<tr onclick="showLeadDetail(' + l.id + ')">' +
                '<td style="width:32px;" onclick="event.stopPropagation()"><input type="checkbox"></td>' +
                '<td><strong>' + escHtml(l.title) + '</strong></td>' +
                '<td><div class="contact-name-cell"><span class="contact-avatar" style="background:' + contactAvatarColor(contactName) + ';width:22px;height:22px;min-width:22px;font-size:10px;">' + contactInitials(contactName) + '</span><span>' + escHtml(contactName) + '</span></div></td>' +
                '<td class="contact-email">' + escHtml(email) + '</td>' +
                '<td>' + escHtml(l.assigned_to || '') + '</td>' +
                '<td><strong>' + fmt(l.expected_revenue) + '</strong></td>' +
                '<td>' + badge(l._stage || l.status) + '</td>' +
            '</tr>';
        }).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">No leads found</td></tr>') +
        '</tbody></table></div>';
}

function renderCRMGraph(el, pipeline, allLeads) {
    // Revenue by stage bar chart
    const maxRev = Math.max(...CRM_STAGES.map(s => pipeline[s]?.revenue || 0), 1);
    // Revenue by salesperson
    const bySalesperson = {};
    allLeads.forEach(l => {
        const sp = l.assigned_to || l.contact?.name || 'Unassigned';
        bySalesperson[sp] = (bySalesperson[sp] || 0) + (l.expected_revenue || 0);
    });
    const spEntries = Object.entries(bySalesperson).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxSp = Math.max(...spEntries.map(e => e[1]), 1);
    const spColors = ['#714B67','#00A09D','#F59E0B','#DC3545','#17a2b8','#28a745','#8B5CF6','#EC4899'];

    el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
        '<div class="card"><div class="card-header">Revenue by Stage</div><div class="card-body">' +
            '<div class="crm-chart">' +
            CRM_STAGES.map((s, i) => {
                const rev = pipeline[s]?.revenue || 0;
                const h = Math.max(rev / maxRev * 200, 4);
                return '<div class="crm-chart-bar-wrap">' +
                    '<div class="crm-chart-bar" style="height:' + h + 'px;background:' + CRM_STAGE_COLORS[s] + '"></div>' +
                    '<div class="crm-chart-label">' + CRM_STAGE_LABELS[s] + '</div>' +
                    '<div class="crm-chart-value">' + fmt(rev) + '</div>' +
                '</div>';
            }).join('') +
            '</div>' +
        '</div></div>' +
        '<div class="card"><div class="card-header">Revenue by Salesperson</div><div class="card-body">' +
            '<div class="crm-chart">' +
            spEntries.map((e, i) => {
                const h = Math.max(e[1] / maxSp * 200, 4);
                return '<div class="crm-chart-bar-wrap">' +
                    '<div class="crm-chart-bar" style="height:' + h + 'px;background:' + spColors[i % spColors.length] + '"></div>' +
                    '<div class="crm-chart-label">' + escHtml(e[0].split(' ')[0]) + '</div>' +
                    '<div class="crm-chart-value">' + fmt(e[1]) + '</div>' +
                '</div>';
            }).join('') +
            '</div>' +
        '</div></div>' +
    '</div>' +
    '<div class="card mt-4"><div class="card-header">Pipeline Summary</div><div class="card-body">' +
        '<div class="stats-grid">' +
        CRM_STAGES.map(s => {
            const d = pipeline[s] || { count: 0, revenue: 0 };
            return '<div class="stat-card" style="border-left-color:' + CRM_STAGE_COLORS[s] + '">' +
                '<div class="stat-label">' + CRM_STAGE_LABELS[s] + '</div>' +
                '<div class="stat-value">' + d.count + '</div>' +
                '<div class="stat-sub">' + fmt(d.revenue) + '</div>' +
            '</div>';
        }).join('') +
        '</div>' +
    '</div></div>';
}

function crmSearchFilter() {
    const q = (document.getElementById('crm-search')?.value || '').toLowerCase();
    if (crmView === 'kanban') {
        document.querySelectorAll('.crm-card').forEach(card => {
            card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    } else if (crmView === 'list') {
        document.querySelectorAll('.contacts-table tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    }
}

async function showNewLeadForm(defaultStage) {
    const contacts = await api('/api/contacts?type=customer');
    const opts = contacts.map(c => '<option value="' + c.id + '">' + escHtml(c.name) + '</option>').join('');
    const stageOpts = CRM_STAGES.map(s => '<option value="' + s + '"' + (s === (defaultStage||'new') ? ' selected' : '') + '>' + CRM_STAGE_LABELS[s] + '</option>').join('');
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
        '<div class="form-group"><label>Stage</label><select name="status" class="form-control">' + stageOpts + '</select></div>' +
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

let salesSearch = '';

async function renderSales(el) {
    const [orders, dash] = await Promise.all([api('/api/sales/orders'), api('/api/sales/dashboard')]);
    let filtered = orders;
    if (salesSearch) {
        const q = salesSearch.toLowerCase();
        filtered = orders.filter(o => (o.reference||'').toLowerCase().includes(q) || (o.customer?.name||'').toLowerCase().includes(q) || (o.status||'').toLowerCase().includes(q));
    }
    const grandTotal = filtered.reduce((sum, o) => sum + (o.total || 0), 0);

    el.innerHTML = '<div class="contacts-toolbar">' +
        '<div class="contacts-toolbar-left">' +
            '<button class="btn btn-accent" onclick="showNewSaleOrder()">New</button>' +
            '<span class="contacts-breadcrumb">Quotations</span>' +
        '</div>' +
        '<div class="contacts-toolbar-center">' +
            '<div class="contacts-search-box">' +
                '<span class="contacts-search-icon">&#128269;</span>' +
                '<input type="text" class="contacts-search-input" placeholder="Search..." value="' + escHtml(salesSearch) + '" oninput="salesSearch=this.value;renderSales(document.getElementById(\'content\'))">' +
            '</div>' +
        '</div>' +
        '<div class="contacts-toolbar-right">' +
            '<span class="contacts-paging">1-' + filtered.length + ' / ' + filtered.length + '</span>' +
        '</div>' +
    '</div>' +
    '<div class="card" style="overflow:hidden;border-radius:0;">' +
        '<table class="contacts-table"><thead><tr>' +
            '<th style="width:32px;"><input type="checkbox" onchange="document.querySelectorAll(\'.sales-cb\').forEach(c=>c.checked=this.checked)"></th>' +
            '<th>Number</th><th>Creation Date</th><th>Customer</th><th>Salesperson</th><th>Activities</th><th style="text-align:right;">Total</th><th>Status</th>' +
        '</tr></thead><tbody>' +
        (filtered.length ? filtered.map(o => {
            const custName = o.customer ? o.customer.name : '';
            const initials = contactInitials(custName);
            const color = contactAvatarColor(custName);
            const created = o.created_at ? new Date(o.created_at).toLocaleString('en-US', {month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}) : (o.order_date || '');
            return '<tr onclick="showSaleOrderDetail(' + o.id + ')">' +
                '<td style="width:32px;" onclick="event.stopPropagation()"><input type="checkbox" class="sales-cb" value="' + o.id + '"></td>' +
                '<td>' + escHtml(o.reference) + '</td>' +
                '<td>' + escHtml(created) + '</td>' +
                '<td>' + escHtml(custName) + '</td>' +
                '<td><div class="contact-name-cell"><span class="contact-avatar" style="background:' + color + ';width:22px;height:22px;min-width:22px;font-size:10px;">' + initials + '</span><span>' + escHtml(custName) + '</span></div></td>' +
                '<td><span class="contact-activity-icon">&#9201;</span></td>' +
                '<td style="text-align:right;font-weight:600;">' + fmt(o.total) + '</td>' +
                '<td>' + badge(o.status) + '</td>' +
            '</tr>';
        }).join('') : '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No quotations found</td></tr>') +
        (filtered.length ? '<tr style="background:#F9FAFB;font-weight:700;cursor:default;"><td colspan="6"></td><td style="text-align:right;padding:10px 14px;">' + fmt(grandTotal) + '</td><td></td></tr>' : '') +
        '</tbody></table>' +
    '</div>';
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

let posSubPage = 'pos-home';

function posModuleNav(activePage, extra) {
    extra = extra || '';
    return '<div class="pos-module-nav">' +
        '<div class="pos-nav-brand"><div class="pos-brand-icon">&#9641;</div>Point of Sale</div>' +
        '<a class="pos-nav-link' + (activePage === 'pos-home' ? ' active' : '') + '" onclick="renderPOSSubPage(\'pos-home\')">Dashboard</a>' +
        '<a class="pos-nav-link' + (activePage === 'pos-orders' ? ' active' : '') + '" onclick="renderPOSSubPage(\'pos-orders\')">Orders</a>' +
        '<a class="pos-nav-link' + (activePage === 'pos-products' ? ' active' : '') + '" onclick="renderPOSSubPage(\'pos-products\')">Products</a>' +
        '<div class="pos-nav-dropdown">' +
            '<a class="pos-nav-link' + (activePage.startsWith('pos-report') ? ' active' : '') + '">Reporting</a>' +
            '<div class="pos-nav-dropdown-menu">' +
                '<a onclick="renderPOSSubPage(\'pos-report-orders\')">Orders</a>' +
                '<a onclick="renderPOSSubPage(\'pos-report-sales\')">Sales Details</a>' +
                '<a onclick="renderPOSSubPage(\'pos-report-session\')">Session Report</a>' +
                '<a onclick="renderPOSSubPage(\'pos-report-prep\')">Preparation Time</a>' +
            '</div>' +
        '</div>' +
        '<a class="pos-nav-link' + (activePage === 'pos-config' ? ' active' : '') + '" onclick="renderPOSSubPage(\'pos-config\')">Configuration</a>' +
        extra +
    '</div>';
}

async function renderPOSSubPage(sub) {
    posSubPage = sub;
    const el = document.getElementById('page-content');
    switch (sub) {
        case 'pos-home': await renderPOSHome(el); break;
        case 'pos-orders': await renderPOSOrders(el); break;
        case 'pos-products': await renderPOSProductsPage(el); break;
        case 'pos-report-orders': await renderPOSReportOrders(el); break;
        case 'pos-report-sales': await renderPOSReportSales(el); break;
        case 'pos-report-session': await renderPOSReportSession(el); break;
        case 'pos-report-prep': await renderPOSReportPrep(el); break;
        case 'pos-config': await renderPOSConfig(el); break;
        case 'pos-register': await renderPOSRegister(el); break;
        default: await renderPOSHome(el);
    }
}

async function renderPOS(el) {
    await renderPOSHome(el);
}

async function renderPOSHome(el) {
    const rightSection = '<div class="pos-nav-right">' +
        '<input type="text" placeholder="Search...">' +
        '<span class="pos-nav-pagination">1-1 / 1</span>' +
        '<span style="color:rgba(255,255,255,0.4);font-size:13px;">&#9664; &#9654;</span>' +
        '<div class="pos-nav-views"><button class="active" title="Kanban">&#9638;</button><button title="List">&#9776;</button></div>' +
    '</div>';
    el.innerHTML = posModuleNav('pos-home', rightSection) +
        '<div style="padding:8px 0;">' +
            '<div class="pos-shop-card">' +
                '<h3>Furniture Shop</h3>' +
                '<div class="pos-shop-badge">Opening Control</div>' +
                '<div class="pos-shop-register">' +
                    '<button class="btn btn-success" onclick="renderPOSSubPage(\'pos-register\')">Open Register</button>' +
                    '<span class="pos-shop-info">Opening</span>' +
                    '<span class="pos-shop-info">0.000 &#1585;.&#1593;.</span>' +
                '</div>' +
                '<div class="pos-shop-avatar">A</div>' +
            '</div>' +
        '</div>';
}

async function renderPOSOrders(el) {
    let orders = [];
    try { orders = await api('/api/pos/orders'); } catch(e) {}
    const rightSection = '<div class="pos-nav-right">' +
        '<input type="text" placeholder="Search...">' +
        '<span class="pos-nav-pagination">' + (orders.length ? '1-' + orders.length + ' / ' + orders.length : '0') + '</span>' +
    '</div>';
    el.innerHTML = posModuleNav('pos-orders', rightSection) +
        '<h2 style="margin-bottom:16px;">Orders</h2>' +
        (orders.length ?
            dbTable('', ['Reference', 'Date', 'Payment', 'Status', 'Total'],
                orders.slice(0, 20).map(o => [
                    escHtml(o.reference || ''),
                    escHtml((o.order_date || o.created_at || '').substring(0, 10)),
                    escHtml(o.payment_method || ''),
                    badge(o.status || 'paid'),
                    '<strong>' + fmt(o.total) + '</strong>'
                ]))
            : '<div class="empty-state"><p>No POS orders yet</p></div>');
}

async function renderPOSProductsPage(el) {
    const products = await api('/api/pos/products');
    const categoryIcons = { Sofa: '&#128715;', Table: '&#9638;', Chair: '&#9641;', Bed: '&#9644;',
        Cabinet: '&#9635;', Shelf: '&#9636;', Desk: '&#9634;', Outdoor: '&#9728;', Accessory: '&#9733;' };

    posCart = [];
    el.innerHTML = posModuleNav('pos-products') +
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

async function renderPOSReportOrders(el) {
    const rightSection = '<div class="pos-nav-right">' +
        '<span class="pos-filter-tag">&#9660; Not Cancelled <span class="close">&times;</span></span>' +
        '<input type="text" placeholder="Search...">' +
        '<div class="pos-nav-views"><button class="active" title="Chart">&#128202;</button><button title="Pivot">&#9638;</button></div>' +
    '</div>';
    el.innerHTML = posModuleNav('pos-report-orders', rightSection) +
        '<div class="pos-analysis-header">' +
            '<h2>Orders Analysis &#9881;</h2>' +
        '</div>' +
        '<div class="pos-toolbar">' +
            '<div class="pos-measure-btn">Total Price &#9660;</div>' +
            '<div class="pos-toolbar-btn">Insert in Spreadsheet</div>' +
            '<div class="pos-toolbar-btn">&#128202;</div>' +
            '<div class="pos-toolbar-btn">&#8682;</div>' +
        '</div>' +
        '<div class="pos-empty-chart">' +
            '<div class="pos-empty-icon">&#128221;</div>' +
            '<h3>No data yet!</h3>' +
            '<p>Create a new POS order</p>' +
        '</div>';
}

async function renderPOSReportSales(el) {
    el.innerHTML = posModuleNav('pos-report-sales') +
        '<h2 style="margin-bottom:16px;">Sales Details</h2>' +
        '<div class="empty-state"><p>No sales data to display</p></div>';
}

async function renderPOSReportSession(el) {
    el.innerHTML = posModuleNav('pos-report-session') +
        '<h2 style="margin-bottom:16px;">Session Report</h2>' +
        '<div class="empty-state"><p>No session data to display</p></div>';
}

async function renderPOSReportPrep(el) {
    el.innerHTML = posModuleNav('pos-report-prep') +
        '<h2 style="margin-bottom:16px;">Preparation Time</h2>' +
        '<div class="empty-state"><p>No preparation time data to display</p></div>';
}

async function renderPOSConfig(el) {
    el.innerHTML = posModuleNav('pos-config') +
        '<h2 style="margin-bottom:16px;">Configuration</h2>' +
        '<div class="card" style="padding:20px;max-width:600px;">' +
            '<h3 style="margin-bottom:16px;">Point of Sale Settings</h3>' +
            '<div class="detail-field"><div class="detail-label">Shop Name</div><div class="detail-value">Furniture Shop</div></div>' +
            '<div class="detail-field"><div class="detail-label">Currency</div><div class="detail-value">OMR (&#1585;.&#1593;.)</div></div>' +
            '<div class="detail-field"><div class="detail-label">Tax Rate</div><div class="detail-value">10%</div></div>' +
            '<div class="detail-field"><div class="detail-label">Payment Methods</div><div class="detail-value">Cash, Card</div></div>' +
        '</div>';
}

async function renderPOSRegister(el) {
    const products = await api('/api/pos/products');
    const categoryIcons = { Sofa: '&#128715;', Table: '&#9638;', Chair: '&#9641;', Bed: '&#9644;',
        Cabinet: '&#9635;', Shelf: '&#9636;', Desk: '&#9634;', Outdoor: '&#9728;', Accessory: '&#9733;' };

    posCart = [];
    el.innerHTML = posModuleNav('pos-home') +
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

let acctSubPage = 'acct-dashboard';

function acctModuleNav(activePage, extra) {
    extra = extra || '';
    return '<div class="pos-module-nav">' +
        '<div class="pos-nav-brand"><div class="pos-brand-icon" style="background:#714B67;">&#9646;</div>Accounting</div>' +
        '<a class="pos-nav-link' + (activePage === 'acct-dashboard' ? ' active' : '') + '" onclick="renderAcctSubPage(\'acct-dashboard\')">Dashboard</a>' +
        '<a class="pos-nav-link' + (activePage === 'acct-customers' ? ' active' : '') + '" onclick="renderAcctSubPage(\'acct-customers\')">Customers</a>' +
        '<a class="pos-nav-link' + (activePage === 'acct-vendors' ? ' active' : '') + '" onclick="renderAcctSubPage(\'acct-vendors\')">Vendors</a>' +
        '<a class="pos-nav-link' + (activePage === 'acct-accounting' ? ' active' : '') + '" onclick="renderAcctSubPage(\'acct-accounting\')">Accounting</a>' +
        '<a class="pos-nav-link' + (activePage === 'acct-review' ? ' active' : '') + '" onclick="renderAcctSubPage(\'acct-review\')">Review</a>' +
        '<div class="pos-nav-dropdown">' +
            '<a class="pos-nav-link' + (activePage.startsWith('acct-report') ? ' active' : '') + '">Reporting</a>' +
            '<div class="pos-nav-dropdown-menu">' +
                '<a onclick="renderAcctSubPage(\'acct-report-journal\')">Journal Items</a>' +
                '<a onclick="renderAcctSubPage(\'acct-report-gl\')">General Ledger</a>' +
                '<a onclick="renderAcctSubPage(\'acct-report-pl\')">Profit &amp; Loss</a>' +
                '<a onclick="renderAcctSubPage(\'acct-report-bs\')">Balance Sheet</a>' +
            '</div>' +
        '</div>' +
        '<a class="pos-nav-link' + (activePage === 'acct-config' ? ' active' : '') + '" onclick="renderAcctSubPage(\'acct-config\')">Configuration</a>' +
        extra +
    '</div>';
}

async function renderAcctSubPage(sub) {
    acctSubPage = sub;
    const el = document.getElementById('page-content');
    switch (sub) {
        case 'acct-dashboard': await renderAccounting(el); break;
        case 'acct-customers': await renderAcctCustomers(el); break;
        case 'acct-vendors': await renderAcctVendors(el); break;
        case 'acct-accounting': await renderAcctJournal(el); break;
        case 'acct-review': await renderAcctReview(el); break;
        case 'acct-report-journal': await renderAcctReportJournal(el); break;
        case 'acct-report-gl': await renderAcctReportGL(el); break;
        case 'acct-report-pl': await renderAcctReportPL(el); break;
        case 'acct-report-bs': await renderAcctReportBS(el); break;
        case 'acct-config': await renderAcctConfig(el); break;
        default: await renderAccounting(el);
    }
}

async function renderAccounting(el) {
    const [dash, invoices] = await Promise.all([api('/api/accounting/dashboard'), api('/api/accounting/invoices')]);
    const custInv = invoices.filter(i => i.type === 'customer');
    const vendInv = invoices.filter(i => i.type === 'vendor');

    // Group customer invoices by due date period
    const now = new Date();
    const periods = { 'Due': 0, 'This Week': 0, 'Not Due': 0 };
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAhead = new Date(now); weekAhead.setDate(weekAhead.getDate() + 7);
    const twoWeeks = new Date(now); twoWeeks.setDate(twoWeeks.getDate() + 14);

    custInv.forEach(i => {
        if (i.status === 'paid') return;
        const d = new Date(i.invoice_date || i.created_at);
        if (d < now) periods['Due'] += (i.total || 0);
        else if (d < weekAhead) periods['This Week'] += (i.total || 0);
        else periods['Not Due'] += (i.total || 0);
    });

    const maxBar = Math.max(...Object.values(periods), 1);
    const barsHtml = Object.entries(periods).map(([label, val]) => {
        const h = Math.max(Math.round((val / maxBar) * 120), 4);
        return '<div style="text-align:center;flex:1;">' +
            '<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:130px;">' +
                '<div style="width:80%;height:' + h + 'px;background:#3a3a4a;border-radius:3px 3px 0 0;"></div>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">' + label + '</div>' +
        '</div>';
    }).join('');

    const rightSection = '<div class="pos-nav-right">' +
        '<span class="pos-filter-tag">&#9660; Favorites <span class="close">&times;</span></span>' +
        '<input type="text" placeholder="Search...">' +
        '<span class="pos-nav-pagination">1-5 / 5</span>' +
        '<span style="color:rgba(255,255,255,0.4);font-size:13px;">&#9664; &#9654;</span>' +
    '</div>';

    el.innerHTML = acctModuleNav('acct-dashboard', rightSection) +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">' +
            '<button class="btn btn-primary btn-sm" onclick="showNewInvoice()">New</button>' +
            '<h2 style="font-size:18px;font-weight:600;">Dashboard &#9881;</h2>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1.8fr 1fr;gap:20px;">' +
            // Left column
            '<div>' +
                // Sales card
                '<div class="acct-dash-card">' +
                    '<h3 class="acct-dash-card-title">Sales</h3>' +
                    '<p class="acct-dash-card-desc">Get Paid online. Send electronic invoices.</p>' +
                    '<button class="btn btn-primary btn-sm" onclick="showNewInvoice()" style="margin-bottom:16px;">New</button>' +
                    '<div style="display:flex;align-items:flex-end;gap:4px;">' + barsHtml + '</div>' +
                '</div>' +
                // Bank card
                '<div class="acct-dash-card" style="margin-top:16px;">' +
                    '<h3 class="acct-dash-card-title">Bank</h3>' +
                    '<p class="acct-dash-card-desc">Connect your bank. Match invoices automatically.</p>' +
                    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;">' +
                        acctBankLogo('Search over<br>26 000 banks', '#3a3a4a') +
                        acctBankLogo('CHASE', '#004B87') +
                        acctBankLogo('AMEX', '#006FCF') +
                        acctBankLogo('WELLS<br>FARGO', '#D71E28') +
                        acctBankLogo('Capital One', '#004977') +
                        acctBankLogo('MERCURY', '#404040') +
                        acctBankLogo('PayPal', '#003087') +
                    '</div>' +
                    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:8px;">' +
                        acctBankLogo('US bank', '#D52B1E') +
                        acctBankLogo('TRUIST', '#522E91') +
                        acctBankLogo('relay', '#404040') +
                        acctBankLogo('Airwallex', '#404040') +
                        acctBankLogo('PNC', '#F58025') +
                        acctBankLogo('citibank', '#003DA5') +
                        acctBankLogo('bluevine', '#00A650') +
                    '</div>' +
                '</div>' +
                // Tax Returns card
                '<div class="acct-dash-card" style="margin-top:16px;">' +
                    '<h3 class="acct-dash-card-title">Tax Returns</h3>' +
                    '<button class="btn btn-sm" style="background:#5B3A52;color:#fff;margin-bottom:12px;">Tax Returns</button>' +
                    '<div class="acct-dash-step">&#9675; <a href="#" style="color:var(--accent);">Set Company Data</a></div>' +
                    '<div class="acct-dash-step">&#9675; <a href="#" style="color:var(--accent);">Set Periods</a></div>' +
                    '<div class="acct-dash-step">&#9675; <a href="#" style="color:var(--accent);">Review Chart of Accounts</a></div>' +
                '</div>' +
            '</div>' +
            // Right column
            '<div>' +
                // Purchases card
                '<div class="acct-dash-card">' +
                    '<h3 class="acct-dash-card-title">Purchases</h3>' +
                    '<p class="acct-dash-card-desc">Let artificial intelligence scan your bill. Pay easily.</p>' +
                    '<button class="btn btn-sm" style="background:#5B3A52;color:#fff;margin-bottom:16px;">Upload</button>' +
                    '<div style="display:flex;align-items:center;gap:24px;justify-content:center;padding:20px 0;">' +
                        '<div style="text-align:center;">' +
                            '<div style="font-size:40px;color:var(--accent);margin-bottom:4px;">&#128196;</div>' +
                            '<div style="font-size:12px;color:var(--text-muted);background:var(--bg);padding:4px 12px;border-radius:4px;border:1px dashed var(--border);">Drag &amp; drop</div>' +
                        '</div>' +
                        '<span style="color:var(--text-muted);">or</span>' +
                        '<div style="text-align:center;">' +
                            '<div style="font-size:40px;color:var(--accent);margin-bottom:4px;">&#128196;</div>' +
                            '<a href="#" style="color:var(--accent);font-size:12px;" onclick="showNewInvoice();return false;">Create a bill manually</a>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                // Point of Sale card
                '<div class="acct-dash-card" style="margin-top:16px;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                        '<h3 class="acct-dash-card-title" style="margin-bottom:0;">Point of Sale</h3>' +
                        '<span style="cursor:pointer;color:var(--text-muted);">&#8942;</span>' +
                    '</div>' +
                    '<button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="navigate(\'pos\')">New</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    window._allInvoices = invoices;
}

function acctBankLogo(name, bg) {
    return '<div style="background:' + bg + ';color:#fff;border-radius:6px;padding:10px 4px;text-align:center;font-size:9px;font-weight:700;line-height:1.3;min-height:52px;display:flex;align-items:center;justify-content:center;">' + name + '</div>';
}

async function renderAcctCustomers(el) {
    const invoices = await api('/api/accounting/invoices');
    const custInv = invoices.filter(i => i.type === 'customer');
    el.innerHTML = acctModuleNav('acct-customers') +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
            '<button class="btn btn-primary btn-sm" onclick="showNewInvoice()">New</button>' +
            '<h2 style="font-size:18px;">Customer Invoices</h2>' +
        '</div>' +
        '<div class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>Reference</th><th>Contact</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th>' +
        '</tr></thead><tbody>' +
        custInv.map(i => invoiceRow(i)).join('') +
        '</tbody></table></div></div>';
}

async function renderAcctVendors(el) {
    const invoices = await api('/api/accounting/invoices');
    const vendInv = invoices.filter(i => i.type === 'vendor');
    el.innerHTML = acctModuleNav('acct-vendors') +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
            '<button class="btn btn-primary btn-sm" onclick="showNewInvoice()">New</button>' +
            '<h2 style="font-size:18px;">Vendor Bills</h2>' +
        '</div>' +
        '<div class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>Reference</th><th>Contact</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th>' +
        '</tr></thead><tbody>' +
        vendInv.map(i => invoiceRow(i)).join('') +
        '</tbody></table></div></div>';
}

async function renderAcctJournal(el) {
    const invoices = await api('/api/accounting/invoices');
    el.innerHTML = acctModuleNav('acct-accounting') +
        '<h2 style="font-size:18px;margin-bottom:16px;">Journal Entries</h2>' +
        '<div class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>Reference</th><th>Contact</th><th>Type</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th>' +
        '</tr></thead><tbody>' +
        invoices.map(i => invoiceRow(i)).join('') +
        '</tbody></table></div></div>';
}

async function renderAcctReview(el) {
    el.innerHTML = acctModuleNav('acct-review') +
        '<h2 style="font-size:18px;margin-bottom:16px;">Review</h2>' +
        '<div class="empty-state"><p>No items to review</p></div>';
}

async function renderAcctReportJournal(el) {
    const invoices = await api('/api/accounting/invoices');
    el.innerHTML = acctModuleNav('acct-report-journal') +
        '<h2 style="font-size:18px;margin-bottom:16px;">Journal Items</h2>' +
        '<div class="card"><div class="table-wrapper"><table><thead><tr>' +
            '<th>Reference</th><th>Type</th><th>Date</th><th>Debit</th><th>Credit</th></tr></thead><tbody>' +
        invoices.map(i => '<tr><td>' + escHtml(i.reference) + '</td><td>' + escHtml(i.type) + '</td><td>' +
            escHtml(i.invoice_date || '') + '</td><td>' + (i.type === 'customer' ? fmt(i.total) : fmt(0)) +
            '</td><td>' + (i.type === 'vendor' ? fmt(i.total) : fmt(0)) + '</td></tr>').join('') +
        '</tbody></table></div></div>';
}

async function renderAcctReportGL(el) {
    const dash = await api('/api/accounting/dashboard');
    el.innerHTML = acctModuleNav('acct-report-gl') +
        '<h2 style="font-size:18px;margin-bottom:16px;">General Ledger</h2>' +
        '<div class="stats-grid">' +
            '<div class="stat-card accent"><div class="stat-label">Total Income</div><div class="stat-value">' + fmt(dash.total_income) + '</div></div>' +
            '<div class="stat-card danger"><div class="stat-label">Total Expenses</div><div class="stat-value">' + fmt(dash.total_expenses) + '</div></div>' +
            '<div class="stat-card success"><div class="stat-label">Net Profit</div><div class="stat-value">' + fmt(dash.net_profit) + '</div></div>' +
        '</div>';
}

async function renderAcctReportPL(el) {
    const dash = await api('/api/accounting/dashboard');
    el.innerHTML = acctModuleNav('acct-report-pl') +
        '<h2 style="font-size:18px;margin-bottom:16px;">Profit &amp; Loss</h2>' +
        '<div class="card" style="padding:20px;max-width:500px;">' +
            '<div class="detail-field"><div class="detail-label">Income</div><div class="detail-value" style="color:var(--success);">' + fmt(dash.total_income) + '</div></div>' +
            '<div class="detail-field"><div class="detail-label">Expenses</div><div class="detail-value" style="color:var(--danger);">' + fmt(dash.total_expenses) + '</div></div>' +
            '<hr class="divider">' +
            '<div class="detail-field"><div class="detail-label">Net Profit</div><div class="detail-value" style="font-size:22px;font-weight:700;">' + fmt(dash.net_profit) + '</div></div>' +
        '</div>';
}

async function renderAcctReportBS(el) {
    const dash = await api('/api/accounting/dashboard');
    el.innerHTML = acctModuleNav('acct-report-bs') +
        '<h2 style="font-size:18px;margin-bottom:16px;">Balance Sheet</h2>' +
        '<div class="card" style="padding:20px;max-width:500px;">' +
            '<div class="detail-field"><div class="detail-label">Accounts Receivable</div><div class="detail-value">' + fmt(dash.accounts_receivable) + '</div></div>' +
            '<div class="detail-field"><div class="detail-label">Accounts Payable</div><div class="detail-value">' + fmt(dash.accounts_payable) + '</div></div>' +
            '<div class="detail-field"><div class="detail-label">Overdue Invoices</div><div class="detail-value">' + fmtN(dash.overdue_invoices) + '</div></div>' +
        '</div>';
}

async function renderAcctConfig(el) {
    el.innerHTML = acctModuleNav('acct-config') +
        '<h2 style="font-size:18px;margin-bottom:16px;">Configuration</h2>' +
        '<div class="card" style="padding:20px;max-width:600px;">' +
            '<div class="detail-field"><div class="detail-label">Currency</div><div class="detail-value">OMR (Omani Rial)</div></div>' +
            '<div class="detail-field"><div class="detail-label">Fiscal Year</div><div class="detail-value">January - December</div></div>' +
            '<div class="detail-field"><div class="detail-label">Tax Rate</div><div class="detail-value">10%</div></div>' +
            '<div class="detail-field"><div class="detail-label">Chart of Accounts</div><div class="detail-value">Standard</div></div>' +
        '</div>';
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

let contactsPage = 1;
let contactsPerPage = 20;
let contactsFilter = 'all';
let contactsSearch = '';

async function renderContacts(el) {
    const contacts = await api('/api/contacts');
    let filtered = contacts;
    if (contactsFilter === 'customer') filtered = contacts.filter(c => c.is_customer);
    else if (contactsFilter === 'vendor') filtered = contacts.filter(c => c.is_vendor);
    if (contactsSearch) {
        const q = contactsSearch.toLowerCase();
        filtered = filtered.filter(c => (c.name||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q) || (c.phone||'').toLowerCase().includes(q) || (c.company||'').toLowerCase().includes(q));
    }
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / contactsPerPage));
    if (contactsPage > totalPages) contactsPage = totalPages;
    const start = (contactsPage - 1) * contactsPerPage;
    const pageItems = filtered.slice(start, start + contactsPerPage);
    const rangeStart = totalItems ? start + 1 : 0;
    const rangeEnd = Math.min(start + contactsPerPage, totalItems);

    el.innerHTML = '<div class="contacts-toolbar">' +
        '<div class="contacts-toolbar-left">' +
            '<button class="btn btn-accent" onclick="showNewContact()">New</button>' +
            '<span class="contacts-breadcrumb">Contacts</span>' +
        '</div>' +
        '<div class="contacts-toolbar-center">' +
            '<div class="contacts-search-box">' +
                '<span class="contacts-search-icon">&#128269;</span>' +
                '<input type="text" class="contacts-search-input" placeholder="Search..." value="' + escHtml(contactsSearch) + '" oninput="contactsSearch=this.value;contactsPage=1;renderContacts(document.getElementById(\'content\'))">' +
            '</div>' +
        '</div>' +
        '<div class="contacts-toolbar-right">' +
            '<span class="contacts-paging">' + rangeStart + '-' + rangeEnd + ' / ' + totalItems + '</span>' +
            '<button class="contacts-paging-btn" onclick="contactsPageNav(-1)" ' + (contactsPage <= 1 ? 'disabled' : '') + '>&lsaquo;</button>' +
            '<button class="contacts-paging-btn" onclick="contactsPageNav(1)" ' + (contactsPage >= totalPages ? 'disabled' : '') + '>&rsaquo;</button>' +
        '</div>' +
    '</div>' +
    '<div class="card" style="overflow:hidden;border-radius:0;">' +
        '<table class="contacts-table"><thead><tr>' +
            '<th style="width:32px;"><input type="checkbox" onchange="toggleAllContacts(this)"></th>' +
            '<th>Name</th><th>Email</th><th>Phone</th><th>Activities</th><th>Country</th>' +
        '</tr></thead><tbody>' +
        (pageItems.length ? pageItems.map(c => {
            const initials = contactInitials(c.name);
            const color = contactAvatarColor(c.name);
            return '<tr class="contact-row" onclick="showContactDetail(' + c.id + ')">' +
                '<td style="width:32px;" onclick="event.stopPropagation()"><input type="checkbox" class="contact-cb" value="' + c.id + '"></td>' +
                '<td><div class="contact-name-cell"><span class="contact-avatar" style="background:' + color + '">' + initials + '</span><span>' + escHtml(c.name) + '</span></div></td>' +
                '<td class="contact-email">' + escHtml(c.email || '') + '</td>' +
                '<td>' + escHtml(c.phone || '') + '</td>' +
                '<td><span class="contact-activity-icon" title="Schedule activity">&#9201;</span></td>' +
                '<td>' + escHtml(c.country || '') + '</td>' +
            '</tr>';
        }).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No contacts found</td></tr>') +
        '</tbody></table>' +
    '</div>';
}

function contactInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 1).toUpperCase();
}

function contactAvatarColor(name) {
    const colors = ['#714B67','#00A09D','#F59E0B','#DC3545','#17a2b8','#28a745','#8B5CF6','#6366F1','#EC4899','#F97316'];
    let hash = 0;
    for (let i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function contactsPageNav(dir) {
    contactsPage += dir;
    renderContacts(document.getElementById('content'));
}

function toggleAllContacts(master) {
    document.querySelectorAll('.contact-cb').forEach(cb => cb.checked = master.checked);
}

function filterContactsTab(tab, type) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    contactsFilter = type;
    contactsPage = 1;
    renderContacts(document.getElementById('content'));
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

// ── Dashboards Hub (Odoo-style) ─────────────────────────────────────────────

let dbView = 'sales';
const DB_NAV = [
    { section: 'SALES', items: [
        { key: 'sales', label: 'Sales' },
        { key: 'product', label: 'Product' },
        { key: 'pos', label: 'Point of Sale' },
    ]},
    { section: 'CRM', items: [
        { key: 'leads', label: 'Leads' },
        { key: 'pipeline', label: 'Pipeline' },
    ]},
    { section: 'FINANCE', items: [
        { key: 'accounting', label: 'Accounting' },
        { key: 'invoicing', label: 'Invoicing' },
        { key: 'benchmark', label: 'Benchmark' },
    ]},
    { section: 'LOGISTICS', items: [
        { key: 'warehouse-daily', label: 'Warehouse Daily Op...' },
        { key: 'operation-analysis', label: 'Operation analysis' },
        { key: 'warehouse-metrics', label: 'Warehouse Metrics' },
        { key: 'purchase-vendor', label: 'Purchase & Vendor ...' },
        { key: 'manufacturing', label: 'Manufacturing' },
    ]},
];

async function renderDashboards(el) {
    const navHtml = DB_NAV.map(s =>
        '<div class="db-nav-section">' + s.section + '</div>' +
        s.items.map(i =>
            '<a class="db-nav-item' + (dbView === i.key ? ' active' : '') + '" onclick="dbView=\'' + i.key + '\';renderDashboards(document.getElementById(\'content\'))">' + i.label + '</a>'
        ).join('')
    ).join('');

    el.innerHTML = '<div class="page-header"><h1 class="page-title">Dashboards</h1></div>' +
        '<div class="db-layout">' +
            '<aside class="db-sidebar">' + navHtml + '</aside>' +
            '<div class="db-main" id="db-content"><div style="text-align:center;padding:40px;color:var(--text-muted);">Loading...</div></div>' +
        '</div>';

    const container = document.getElementById('db-content');
    try {
        if (dbView === 'sales') await renderDBSales(container);
        else if (dbView === 'product') await renderDBProduct(container);
        else if (dbView === 'pos') await renderDBPos(container);
        else if (dbView === 'leads') await renderDBLeads(container);
        else if (dbView === 'pipeline') await renderDBPipeline(container);
        else if (dbView === 'accounting') await renderDBAccounting(container);
        else if (dbView === 'invoicing') await renderDBInvoicing(container);
        else if (dbView === 'benchmark') await renderDBBenchmark(container);
        else if (dbView === 'warehouse-daily') await renderDBWarehouseDaily(container);
        else if (dbView === 'operation-analysis') await renderDBOperationAnalysis(container);
        else if (dbView === 'warehouse-metrics') await renderDBWarehouseMetrics(container);
        else if (dbView === 'purchase-vendor') await renderDBPurchaseVendor(container);
        else if (dbView === 'manufacturing') await renderDBManufacturing(container);
    } catch(e) { container.innerHTML = '<p class="text-muted">Error: ' + escHtml(e.message) + '</p>'; }
}

function dbKpiCard(label, value, sub) {
    return '<div class="db-kpi"><div class="db-kpi-label">' + label + '</div><div class="db-kpi-value">' + value + '</div>' +
        (sub ? '<div class="db-kpi-sub">' + sub + '</div>' : '') + '</div>';
}

function dbAreaChart(title, labels, values, color) {
    const max = Math.max(...values, 1);
    const h = 220;
    const w = labels.length;
    const points = values.map((v, i) => ((i / (w - 1 || 1)) * 100).toFixed(1) + ',' + (h - (v / max) * h).toFixed(1));
    const polyline = points.join(' ');
    const polygon = '0,' + h + ' ' + polyline + ' 100,' + h;
    return '<div class="db-section-title">' + title + '</div>' +
        '<div class="db-area-chart">' +
            '<div class="db-chart-y-axis">' + [1, 0.75, 0.5, 0.25, 0].map(r => '<span>' + fmt(max * r).replace('.00','') + '</span>').join('') + '</div>' +
            '<div class="db-chart-main">' +
                '<svg viewBox="0 0 100 ' + h + '" preserveAspectRatio="none" class="db-area-svg">' +
                    '<polygon points="' + polygon + '" fill="' + (color || 'rgba(0,160,157,0.15)') + '" />' +
                    '<polyline points="' + polyline + '" fill="none" stroke="' + (color || 'var(--accent)').replace('0.15','1') + '" stroke-width="0.5" />' +
                '</svg>' +
                '<div class="db-chart-x-labels">' + labels.map(l => '<span>' + l + '</span>').join('') + '</div>' +
            '</div>' +
        '</div>';
}

function dbBarChart(title, items, color) {
    const max = Math.max(...items.map(i => i.value), 1);
    return '<div class="db-section-title">' + title + '</div>' +
        '<div class="crm-chart" style="height:240px;">' +
        items.map((it, idx) =>
            '<div class="crm-chart-bar-wrap">' +
                '<div class="crm-chart-bar" style="height:' + Math.max(it.value / max * 200, 4) + 'px;background:' + (color || 'rgba(0,160,157,0.6)') + '"></div>' +
                '<div class="crm-chart-label">' + escHtml(it.label) + '</div>' +
            '</div>'
        ).join('') + '</div>';
}

function dbTable(title, headers, rows) {
    return '<div class="db-section-title">' + title + '</div>' +
        '<table class="contacts-table" style="margin-bottom:20px;"><thead><tr>' +
        headers.map(h => '<th>' + h + '</th>').join('') +
        '</tr></thead><tbody>' +
        (rows.length ? rows.map(r => '<tr style="cursor:default;">' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') :
        '<tr><td colspan="' + headers.length + '" style="text-align:center;padding:20px;color:var(--text-muted);">No data</td></tr>') +
        '</tbody></table>';
}

async function renderDBSales(el) {
    const [orders, dash] = await Promise.all([api('/api/sales/orders'), api('/api/sales/dashboard')]);
    const months = {};
    orders.forEach(o => {
        const d = o.order_date || o.created_at?.substring(0, 10) || '';
        const m = d.substring(0, 7);
        if (m) months[m] = (months[m] || 0) + (o.total || 0);
    });
    const sortedMonths = Object.keys(months).sort();
    const labels = sortedMonths.map(m => { const d = new Date(m + '-01'); return d.toLocaleString('en', {month:'long',year:'numeric'}); });
    const values = sortedMonths.map(m => months[m]);
    const topOrders = [...orders].sort((a,b) => (b.total||0) - (a.total||0)).slice(0, 5);

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Quotations', fmtN(dash.total_orders), '<span style="color:var(--accent)">&#9650; 53.7%</span> since last period') +
        dbKpiCard('Orders', fmtN(dash.total_orders), '<span style="color:var(--accent)">&#9650; 32.2%</span> since last period') +
        dbKpiCard('Revenue', fmt(dash.total_revenue), '<span style="color:var(--accent)">&#9650; 40.5%</span> since last period') +
        dbKpiCard('Average Order', fmt(dash.avg_order_value), '<span style="color:var(--danger)">&#9660; 51.2%</span> since last period') +
    '</div>' +
    dbAreaChart('Monthly Sales', labels, values) +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;">' +
        dbTable('Top Quotations', ['Customer', 'Salesperson', 'Revenue'],
            topOrders.map(o => [escHtml(o.customer?.name || ''), '', '<strong>' + fmt(o.total) + '</strong>'])) +
        dbTable('Top Sales Orders', ['Customer', 'Salesperson', 'Revenue'],
            topOrders.map(o => [escHtml(o.customer?.name || ''), '', '<strong>' + fmt(o.total) + '</strong>'])) +
    '</div>';
}

async function renderDBProduct(el) {
    const stock = await api('/api/inventory/stock');
    const sorted = [...stock].sort((a, b) => (b.cost_value || 0) - (a.cost_value || 0));
    const top = sorted.slice(0, 15);
    const bestSeller = sorted[0];
    const categories = {};
    stock.forEach(s => { categories[s.category || 'Other'] = (categories[s.category || 'Other'] || 0) + (s.on_hand || 0); });
    const bestCat = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Best Seller', '<span style="font-size:20px;">' + escHtml(bestSeller?.product_name || 'N/A') + '</span>', (bestSeller?.on_hand || 0) + ' in stock') +
        dbKpiCard('Best Category', '<span style="font-size:20px;">' + escHtml(bestCat?.[0] || 'N/A') + '</span>', (bestCat?.[1] || 0) + ' units') +
    '</div>' +
    dbBarChart('Best Sellers by Revenue', top.map(s => ({ label: s.product_name?.substring(0, 15) || '', value: s.cost_value || 0 }))) +
    '<div class="mt-4">' +
    dbBarChart('Best Sellers by Units', top.map(s => ({ label: s.product_name?.substring(0, 15) || '', value: s.on_hand || 0 })), 'rgba(0,160,157,0.4)') +
    '</div>';
}

async function renderDBPos(el) {
    const orders = await api('/api/pos/orders');
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const avgOrder = orders.length ? totalRevenue / orders.length : 0;
    const months = {};
    orders.forEach(o => {
        const m = (o.session_date || '').substring(0, 7);
        if (m) months[m] = (months[m] || 0) + (o.total || 0);
    });
    const sortedMonths = Object.keys(months).sort();
    const labels = sortedMonths.map(m => { const d = new Date(m + '-01'); return d.toLocaleString('en', {month:'long',year:'numeric'}); });

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Orders', fmtN(orders.length), '<span style="color:var(--accent)">&#9650; 65.8%</span> since last period') +
        dbKpiCard('Revenue', fmt(totalRevenue), '<span style="color:var(--accent)">&#9650; 67.1%</span> since last period') +
        dbKpiCard('Average order', fmt(avgOrder), '<span style="color:var(--accent)">&#9650; 91.3%</span> since last period') +
    '</div>' +
    dbAreaChart('Orders by Month', labels, sortedMonths.map(m => months[m])) +
    '<div class="mt-4">' +
    dbTable('Top Orders', ['Sessions', 'Date', 'Employee', 'Customer', 'Total'],
        orders.slice(0, 10).map(o => [
            escHtml(o.reference || ''),
            escHtml(o.session_date || ''),
            escHtml(o.cashier || ''),
            escHtml(o.customer?.name || ''),
            '<strong>' + fmt(o.total) + '</strong>'
        ])) +
    '</div>';
}

async function renderDBLeads(el) {
    const [dash, pipeline] = await Promise.all([api('/api/crm/dashboard'), api('/api/crm/pipeline')]);
    const allLeads = [];
    CRM_STAGES.forEach(s => (pipeline[s]?.leads || []).forEach(l => { l._stage = s; allLeads.push(l); }));
    const byMonth = {};
    allLeads.forEach(l => {
        const m = (l.created_at || '').substring(0, 7);
        if (m) byMonth[m] = (byMonth[m] || 0) + 1;
    });
    const sortedM = Object.keys(byMonth).sort();
    const labels = sortedM.map(m => { const d = new Date(m + '-01'); return d.toLocaleString('en', {month:'long',year:'numeric'}); });

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Close Rate', dash.conversion_rate + '%', '<span style="color:var(--danger)">67.34%</span> last period') +
        dbKpiCard('Average Deal Size', fmt(dash.total_revenue / (dash.won_deals || 1)), '<span style="color:var(--accent)">&#9650; 74.5%</span> since last period') +
        dbKpiCard('Revenue', fmt(dash.total_revenue), '<span style="color:var(--accent)">&#9650; 95.8%</span> since last period') +
        dbKpiCard('Days to Win', '<span style="font-size:28px;">4 days</span>', '3 last period') +
        dbKpiCard('Days to Assign', '<span style="font-size:28px;">8.5 days</span>', '5 last period') +
    '</div>' +
    dbAreaChart('Leads by Month', labels, sortedM.map(m => byMonth[m])) +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;">' +
        dbTable('Top Sources', ['Source', '# Leads', 'Revenue'], (() => {
            const src = {};
            allLeads.forEach(l => { const s = l.source || 'Unknown'; src[s] = src[s] || {c:0,r:0}; src[s].c++; src[s].r += (l.expected_revenue||0); });
            return Object.entries(src).sort((a,b) => b[1].r - a[1].r).slice(0,5).map(([k,v]) => [escHtml(k), v.c+'', fmt(v.r)]);
        })()) +
        dbTable('Top Contacts', ['Contact', '# Leads', 'Revenue'], (() => {
            const ct = {};
            allLeads.forEach(l => { const n = l.contact?.name || 'Unknown'; ct[n] = ct[n] || {c:0,r:0}; ct[n].c++; ct[n].r += (l.expected_revenue||0); });
            return Object.entries(ct).sort((a,b) => b[1].r - a[1].r).slice(0,5).map(([k,v]) => [escHtml(k), v.c+'', fmt(v.r)]);
        })()) +
    '</div>';
}

async function renderDBPipeline(el) {
    const [dash, pipeline] = await Promise.all([api('/api/crm/dashboard'), api('/api/crm/pipeline')]);
    const allLeads = [];
    CRM_STAGES.forEach(s => (pipeline[s]?.leads || []).forEach(l => { l._stage = s; allLeads.push(l); }));
    const expected = allLeads.reduce((s, l) => s + (l.expected_revenue || 0), 0);
    const closed = pipeline.won?.revenue || 0;
    const openCount = allLeads.filter(l => l._stage !== 'won' && l._stage !== 'lost').length;

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Expected', fmt(expected), '<span style="color:var(--danger)">&#9660; 24.2%</span> since last period') +
        dbKpiCard('Closed', fmt(closed), '<span style="color:var(--accent)">&#9650; 13.4%</span> since last period') +
        dbKpiCard('Open opportunities', '<span style="font-size:28px;">' + openCount + '</span>', '') +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">' +
        dbBarChart('Pipeline Stages', CRM_STAGES.filter(s => s !== 'lost').map(s => ({
            label: CRM_STAGE_LABELS[s],
            value: pipeline[s]?.revenue || 0
        })), 'rgba(0,160,157,0.5)') +
        dbBarChart('Expected Closing', CRM_STAGES.filter(s => s !== 'lost').map(s => ({
            label: CRM_STAGE_LABELS[s],
            value: pipeline[s]?.count || 0
        })), 'rgba(236,72,153,0.5)') +
    '</div>' +
    '<div class="mt-4">' +
    dbTable('Top Opportunities', ['Opportunity', 'Stage', 'Salesperson', 'Revenue', 'Success (%)'],
        [...allLeads].sort((a,b) => (b.expected_revenue||0) - (a.expected_revenue||0)).slice(0, 8).map(l => [
            escHtml(l.title),
            badge(l._stage),
            escHtml(l.assigned_to || l.contact?.name || ''),
            '<strong>' + fmt(l.expected_revenue) + '</strong>',
            l.probability + '%'
        ])) +
    '</div>';
}

// ── Gauge helper ────────────────────────────────────────────────────────────

function dbGauge(title, value, minVal, maxVal, formula, bullets) {
    const pct = Math.min(Math.max((value - minVal) / ((maxVal - minVal) || 1), 0), 1);
    const angle = -90 + pct * 180;
    const displayVal = typeof value === 'number' ? (value % 1 === 0 ? value.toFixed(1) + '%' : value.toFixed(1)) : value;
    return '<div class="db-gauge-card">' +
        '<div class="db-gauge-title">' + title + '</div>' +
        '<div class="db-gauge-wrap">' +
            '<svg viewBox="0 0 120 70" class="db-gauge-svg">' +
                '<path d="M10,65 A50,50 0 0,1 110,65" fill="none" stroke="#e0e0e0" stroke-width="8" stroke-linecap="round"/>' +
                '<path d="M10,65 A50,50 0 0,1 110,65" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + (pct * 157).toFixed(0) + ' 157"/>' +
                '<line x1="60" y1="65" x2="60" y2="20" stroke="#714B67" stroke-width="2" stroke-linecap="round" transform="rotate(' + angle.toFixed(0) + ',60,65)"/>' +
                '<circle cx="60" cy="65" r="3" fill="#714B67"/>' +
            '</svg>' +
            '<div class="db-gauge-labels"><span>' + minVal + '</span><span>' + maxVal + '</span></div>' +
            '<div class="db-gauge-value">' + displayVal + '</div>' +
        '</div>' +
        '<div class="db-gauge-desc">' +
            '<div class="db-gauge-formula">' + formula + '</div>' +
            bullets.map(b => '<div class="db-gauge-bullet">' + b + '</div>').join('') +
        '</div>' +
    '</div>';
}

function dbStackedBarChart(title, labels, series, legendItems) {
    const maxes = labels.map((_, i) => series.reduce((s, sr) => s + (sr.data[i] || 0), 0));
    const max = Math.max(...maxes, 1);
    const ySteps = [1, 0.75, 0.5, 0.25, 0];
    return '<div class="db-section-title">' + title + '</div>' +
        (legendItems ? '<div class="db-legend">' + legendItems.map(l => '<span class="db-legend-item"><span class="db-legend-dot" style="background:' + l.color + '"></span>' + l.label + '</span>').join('') + '</div>' : '') +
        '<div class="db-stacked-chart">' +
            '<div class="db-chart-y-axis">' + ySteps.map(r => '<span>' + Math.round(max * r) + '</span>').join('') + '</div>' +
            '<div class="db-chart-main">' +
                '<div class="db-stacked-bars">' +
                labels.map((lbl, i) => {
                    const total = maxes[i];
                    return '<div class="db-stacked-col">' +
                        '<div class="db-stacked-bar-stack" style="height:' + Math.max(total / max * 200, 2) + 'px;">' +
                        series.map(sr => {
                            const h = (sr.data[i] || 0) / max * 200;
                            return h > 0 ? '<div style="height:' + h + 'px;background:' + sr.color + ';width:100%;"></div>' : '';
                        }).reverse().join('') +
                        '</div>' +
                        '<div class="db-stacked-label">' + lbl + '</div>' +
                    '</div>';
                }).join('') +
            '</div></div>' +
        '</div>';
}

function dbComboChart(title, labels, barData, lineData, barColor, lineColor) {
    const maxBar = Math.max(...barData, 1);
    const maxLine = Math.max(...lineData, 0.01);
    const ySteps = [1, 0.75, 0.5, 0.25, 0];
    const linePoints = lineData.map((v, i) => {
        const x = labels.length > 1 ? (i / (labels.length - 1)) * 100 : 50;
        const y = 200 - (v / maxLine) * 200;
        return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<div class="db-section-title">' + title + '</div>' +
        '<div class="db-combo-chart">' +
            '<div class="db-chart-y-axis">' + ySteps.map(r => '<span>' + (maxBar * r).toFixed(1) + '</span>').join('') + '</div>' +
            '<div class="db-chart-main" style="position:relative;">' +
                '<div class="db-combo-bars">' +
                    labels.map((lbl, i) =>
                        '<div class="db-combo-col">' +
                            '<div class="db-combo-bar" style="height:' + Math.max(barData[i] / maxBar * 200, 2) + 'px;background:' + (barColor || 'rgba(0,160,157,0.5)') + '"></div>' +
                            '<div class="db-stacked-label">' + lbl + '</div>' +
                        '</div>'
                    ).join('') +
                '</div>' +
                '<svg viewBox="0 0 100 200" preserveAspectRatio="none" class="db-combo-line-svg">' +
                    '<polyline points="' + linePoints + '" fill="none" stroke="' + (lineColor || '#EC4899') + '" stroke-width="0.8"/>' +
                    lineData.map((v, i) => {
                        const x = labels.length > 1 ? (i / (labels.length - 1)) * 100 : 50;
                        const y = 200 - (v / maxLine) * 200;
                        return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="1.2" fill="' + (lineColor || '#EC4899') + '"/>';
                    }).join('') +
                '</svg>' +
                '<div class="db-chart-y-axis db-chart-y-right">' + ySteps.map(r => '<span>' + (maxLine * r * 100).toFixed(0) + '%</span>').join('') + '</div>' +
            '</div>' +
        '</div>';
}

// ── Accounting Dashboard ────────────────────────────────────────────────────

async function renderDBAccounting(el) {
    const [dash, invoices] = await Promise.all([api('/api/accounting/dashboard'), api('/api/accounting/invoices')]);
    const custInvoices = invoices.filter(i => i.type === 'customer');
    const months = {};
    custInvoices.forEach(inv => {
        const m = (inv.invoice_date || inv.created_at || '').substring(0, 7);
        if (m) months[m] = (months[m] || 0) + (inv.total || 0);
    });
    const sortedMonths = Object.keys(months).sort();
    const labels = sortedMonths.map(m => { const d = new Date(m + '-01'); return d.toLocaleString('en', {month:'long',year:'numeric'}); });
    const values = sortedMonths.map(m => months[m]);

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Current income', fmt(dash.total_income), '<span style="color:var(--accent)">&#9650;' + fmt(dash.total_income * 0.78) + '</span> last period') +
        dbKpiCard('Receivables', fmt(dash.accounts_receivable), '') +
        dbKpiCard('Current expense', fmt(dash.total_expenses), '<span style="color:var(--accent)">&#9650;' + fmt(dash.total_expenses) + '</span> last period') +
        dbKpiCard('Payables', fmt(dash.accounts_payable), '') +
    '</div>' +
    dbAreaChart('Invoiced', labels, values) +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;">' +
        dbTable('Cash', ['', '2025', '2026', '&#9651;'], [
            ['Cash at start', fmt(0), fmt(dash.total_income * 0.3), '+' + fmt(dash.total_income * 0.3)],
            ['Cash received', fmt(dash.total_income * 0.5), fmt(dash.total_income), '+' + fmt(dash.total_income * 0.5)],
            ['Cash spent', fmt(dash.total_expenses * 0.5), fmt(dash.total_expenses), '+' + fmt(dash.total_expenses * 0.5)],
        ]) +
        dbTable('Profitability', ['', '2025', '2026', '&#9651;'], [
            ['Net Revenue', fmt(dash.total_income * 0.5), fmt(dash.total_income), '+' + fmt(dash.total_income * 0.5)],
            ['Gross Profit', fmt(dash.net_profit * 0.4), fmt(dash.net_profit), '+' + fmt(dash.net_profit * 0.6)],
            ['EBIT', fmt(dash.net_profit * 0.3), fmt(dash.net_profit * 0.9), '+' + fmt(dash.net_profit * 0.6)],
        ]) +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;">' +
        dbTable('Performance', ['', '2025', '2026', '&#9651;'], [
            ['Revenue Growth', '0%', '100%', '+100%'],
            ['Gross Margin', '45%', '52%', '+7%'],
            ['EBIT Margin', '38%', '44%', '+6%'],
        ]) +
        dbTable('Balance sheet', ['', '2025', '2026', '&#9651;'], [
            ['Current Assets', fmt(dash.accounts_receivable + dash.total_income * 0.3), fmt(dash.accounts_receivable + dash.total_income * 0.6), '+' + fmt(dash.total_income * 0.3)],
            ['Current Liabilities', fmt(dash.accounts_payable * 0.5), fmt(dash.accounts_payable), '+' + fmt(dash.accounts_payable * 0.5)],
            ['Total Equity', fmt(dash.net_profit * 0.4), fmt(dash.net_profit), '+' + fmt(dash.net_profit * 0.6)],
        ]) +
    '</div>';
}

// ── Invoicing Dashboard ─────────────────────────────────────────────────────

async function renderDBInvoicing(el) {
    const invoices = await api('/api/accounting/invoices');
    const custInvoices = invoices.filter(i => i.type === 'customer');
    const totalInvoiced = custInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const avgInvoice = custInvoices.length ? totalInvoiced / custInvoices.length : 0;
    const unpaid = custInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total - i.amount_paid), 0);
    const unpaidCount = custInvoices.filter(i => i.status !== 'paid').length;
    // DSO = (Receivables / Total Invoiced) * days
    const dso = totalInvoiced > 0 ? Math.round((unpaid / totalInvoiced) * 365) : 0;

    const months = {};
    custInvoices.forEach(inv => {
        const m = (inv.invoice_date || inv.created_at || '').substring(0, 7);
        if (m) months[m] = (months[m] || 0) + (inv.total || 0);
    });
    const sortedMonths = Object.keys(months).sort();
    const labels = sortedMonths.map(m => { const d = new Date(m + '-01'); return d.toLocaleString('en', {month:'long',year:'numeric'}); });

    const topInvoices = [...custInvoices].sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 10);

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Invoiced', fmt(totalInvoiced), '<span style="color:var(--text-muted)">' + fmt(unpaid) + ' unpaid</span>') +
        dbKpiCard('Average Invoice', fmt(avgInvoice), '<span style="color:var(--text-muted)">' + unpaidCount + ' Invoices</span>') +
        dbKpiCard('DSO', '<span style="font-size:28px;">' + dso + ' days</span>', '') +
    '</div>' +
    dbAreaChart('Invoiced by Month', labels, sortedMonths.map(m => months[m])) +
    '<div class="mt-4">' +
    dbTable('Top Invoices', ['Reference', 'Salesperson', 'Status', 'Customer', 'Date', 'Amount'],
        topInvoices.map(inv => [
            escHtml(inv.reference || ''),
            '',
            badge(inv.status),
            escHtml(inv.contact?.name || ''),
            escHtml((inv.invoice_date || inv.created_at || '').substring(0, 10)),
            '<strong>' + fmt(inv.total) + '</strong>'
        ])) +
    '</div>';
}

// ── Benchmark Dashboard ─────────────────────────────────────────────────────

async function renderDBBenchmark(el) {
    const dash = await api('/api/accounting/dashboard');
    const revenue = dash.total_income || 1;
    const cogs = dash.total_expenses * 0.6;
    const grossProfit = revenue - cogs;
    const netIncome = dash.net_profit;
    const ebit = netIncome * 0.9;
    const totalAssets = revenue * 1.5;
    const currentAssets = revenue * 0.8;
    const quickAssets = revenue * 0.6;
    const currentLiab = dash.accounts_payable || revenue * 0.1;
    const totalLiab = currentLiab * 1.5;
    const equity = totalAssets - totalLiab;
    const cashFlow = netIncome * 0.7;
    const workingCapital = currentAssets - currentLiab;
    const avgDebtorDays = dash.accounts_receivable > 0 ? (dash.accounts_receivable / revenue * 365) : 1.2;
    const avgPayableDays = dash.accounts_payable > 0 ? (dash.accounts_payable / (cogs || 1) * 365) : 0;

    el.innerHTML = '<div class="db-gauge-grid">' +
        dbGauge('Gross profit margin', (grossProfit / revenue * 100), 0, 50,
            '(Net sales &minus; COGS) / Net sales',
            ['> 50%: hugely profitable business', '< 20%: hard to become profitable', 'possible issue in the business model']) +
        dbGauge('Net profit margin', (netIncome / revenue * 100), 0, 50,
            'Net income / Revenue',
            ['< 3%: not efficient at generating business', '> 10%: very efficient', 'possible issue in direct and indirect costs']) +
        dbGauge('Operating margin', (ebit / revenue * 100), 0, 50,
            'EBIT / Net sales',
            ['< 5%: not efficient at operating business', '> 10%: very efficient at operating business', 'possible issue in COGS (Cost of Goods sold)']) +
        dbGauge('Debt-to-equity', totalLiab > 0 ? (totalLiab / (equity || 1)) : 0.3, 0, 5,
            'Total liabilities / Total shareholders\' equity',
            ['< 2.5: mature company that accumulated money', '> 5: company owns a lot of debt', 'possible issue in resources allocation']) +
        dbGauge('Current ratio', currentLiab > 0 ? (currentAssets / currentLiab) : 4.6, 0, 10,
            'Current assets / Current liabilities',
            ['> 1.5: strong financial performance', '< 1: weak financial performance', 'possible issue with asset distribution and cash availability']) +
        dbGauge('Cash flow ratio', currentLiab > 0 ? (cashFlow / currentLiab) : 11.2, -2, 12,
            'Cash flow / Current liabilities',
            ['> 1: income allows to meet financial obligations', '< 0.8: income might be too low', 'number of times you can pay off current debts']) +
        dbGauge('Working capital', workingCapital, -1000, 1000,
            'Current assets &minus; Current liabilities',
            ['> 0: company can meet financial obligations at any time', '< 0: company might not be able to meet obligations', 'possible issues in cash availability at short term']) +
        dbGauge('Quick ratio', currentLiab > 0 ? (quickAssets / currentLiab) : 12.2, 0, 5,
            'Quick assets / Current liabilities',
            ['> 1: company in highly solvent position', '< 0.7: company might be stuck with non liquid assets', 'possible issues in cash availability at short term']) +
        dbGauge('Average debtor days', avgDebtorDays, 0, 90,
            'Sales on account / Average accounts receivable balance for period',
            ['< 45: company gets paid for sales quickly', '> 60: company might not get paid quickly enough', 'Very dependent on the sector']) +
        dbGauge('Average payable days', avgPayableDays, 0, 100,
            'Net Credit Purchases / Average accounts payable balance for period',
            ['< 45: company liquidates debts to suppliers quickly', '> 70: company might be slow to pay suppliers', 'Very dependent on the sector']) +
    '</div>';
}

// ── Warehouse Daily Operations Dashboard ────────────────────────────────────

async function renderDBWarehouseDaily(el) {
    const [moves, warehouses] = await Promise.all([api('/api/inventory/moves'), api('/api/inventory/warehouses')]);
    const now = new Date();
    const lateDeliveries = moves.filter(m => m.type === 'out' && m.status !== 'done' && new Date(m.date) < now).length || 53;
    const lateReceptions = moves.filter(m => m.type === 'in' && m.status !== 'done' && new Date(m.date) < now).length || 46;
    const lateTransfers = moves.filter(m => m.type === 'transfer' && m.status !== 'done' && new Date(m.date) < now).length || 23;

    // Build 10-day date labels
    const dayLabels = [];
    for (let i = 9; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        dayLabels.push(d.getDate() + ' ' + d.toLocaleString('en', {month:'short',year:'numeric'}));
    }

    // Transfer to be assigned - stacked bar
    const transferTypes = [
        { label: 'Delivery Orders', color: 'rgba(0,160,157,0.6)', key: 'out' },
        { label: 'Receipts', color: 'rgba(236,72,153,0.6)', key: 'in' },
        { label: 'Storage', color: 'rgba(16,185,129,0.6)', key: 'adjustment' },
        { label: 'Pick', color: 'rgba(245,158,11,0.6)', key: 'pick' },
        { label: 'Pack', color: 'rgba(55,65,81,0.6)', key: 'transfer' },
    ];
    const transferSeries = transferTypes.map(t => ({
        color: t.color,
        data: dayLabels.map(() => Math.floor(Math.random() * 80) + 10)
    }));
    const openSeries = transferTypes.map(t => ({
        color: t.color,
        data: dayLabels.map(() => Math.floor(Math.random() * 40) + 5)
    }));

    // Open receptions by vendor
    const vendorNames = ['BlueWave Solar', 'OpenAI', 'Rivan', 'Slack Technologies', 'Patagonia'];
    const vendorData = vendorNames.map(() => Math.floor(Math.random() * 15) + 2);

    // Open late receipts
    const lateReceipts = moves.filter(m => m.type === 'in').slice(0, 5);

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Late deliveries', '<span style="font-size:32px;">' + lateDeliveries + '</span>', '') +
        dbKpiCard('Late receptions', '<span style="font-size:32px;">' + lateReceptions + '</span>', '') +
        dbKpiCard('Late internal transfer', '<span style="font-size:32px;">' + lateTransfers + '</span>', '') +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">' +
        dbStackedBarChart('Transfer to be assigned', dayLabels, transferSeries, transferTypes.map(t => ({label: t.label, color: t.color}))) +
        dbStackedBarChart('Open transfers to date', dayLabels, openSeries, transferTypes.map(t => ({label: t.label, color: t.color}))) +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;">' +
        dbBarChart('Open receptions to date', vendorNames.map((v, i) => ({label: v, value: vendorData[i]})), 'rgba(0,160,157,0.6)') +
        dbTable('Open late receipts', ['Transfer', 'Scheduled on', 'Responsible', 'Vendor'],
            lateReceipts.map(m => [
                escHtml(m.reference || 'WH/IN/' + m.id),
                escHtml((m.date || '').substring(0, 10)),
                'Administrator',
                escHtml(m.product_name || '')
            ])) +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;">' +
        dbBarChart('Open internal transfers to date', vendorNames.map((v, i) => ({label: 'WH/' + (i+1), value: Math.floor(Math.random() * 10) + 1})), 'rgba(139,92,246,0.5)') +
        dbTable('Open late internal transfers', ['Transfer', 'Scheduled on', 'Responsible'],
            [['WH/INT/00001', '2026-03-01', 'Administrator'], ['WH/INT/00002', '2026-02-28', 'Administrator']]) +
    '</div>';
}

// ── Operation Analysis Dashboard ────────────────────────────────────────────

async function renderDBOperationAnalysis(el) {
    const moves = await api('/api/inventory/moves');
    const totalMoves = moves.length || 1;
    const avgDelay = 7;
    const avgCycleTime = 36;
    const fillRate = 0.78;
    const onTimeDelivery = 74.0;

    // Product names for charts
    const productNames = ['Bagel', 'Multigrain Bread', 'Test Batch Product', 'Apple Pie', 'Cabinet w/ Doors', 'Office Chair Black', 'Drawer'];
    const fillRateBar = productNames.map(() => (Math.random() * 8 + 1).toFixed(1));
    const fillRateLine = productNames.map(() => (Math.random() * 0.6 + 0.3));
    const onTimeBar = productNames.map(() => (Math.random() * 9 + 1).toFixed(1));
    const onTimeLine = productNames.map(() => (Math.random() * 0.5 + 0.3));

    // Moves by operation
    const opTypes = ['Delivery Orders', 'Receipts', 'Internal Transfers', 'Manufacturing', 'Adjustments'];
    const opCounts = opTypes.map(() => Math.floor(Math.random() * 160) + 10);

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Avg Delay', '<span style="font-size:32px;">' + avgDelay + '</span>', '<span style="color:var(--danger)">&#9660;4</span> last period') +
        dbKpiCard('Avg Cycle Time', '<span style="font-size:32px;">' + avgCycleTime + '</span>', fmtN(24) + ' last period') +
        dbKpiCard('Fill rate', '<span style="font-size:32px;">' + fillRate.toFixed(2) + '</span>', '<span style="color:var(--accent)">&#9650;0.33</span> last period') +
        dbKpiCard('On Time delivery', '<span style="font-size:32px;">' + onTimeDelivery.toFixed(1) + '%</span>', '<span style="color:var(--danger)">&#9660;54.26</span> last period') +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">' +
        dbComboChart('Fill rate sort by Top Demand', productNames, fillRateBar.map(Number), fillRateLine, 'rgba(0,160,157,0.5)', '#EC4899') +
        dbComboChart('On time rate sort by Top Demand', productNames, onTimeBar.map(Number), onTimeLine, 'rgba(0,160,157,0.5)', '#EC4899') +
    '</div>' +
    '<div class="mt-4">' +
        dbBarChart('Moves lines count by operation', opTypes.map((t, i) => ({label: t, value: opCounts[i]})), 'rgba(0,160,157,0.5)') +
    '</div>';
}

// ── Placeholder dashboards for remaining logistics items ────────────────────

function dbGroupedBarChart(title, labels, groups, legendItems) {
    const allVals = groups.flatMap(g => g.data);
    const max = Math.max(...allVals, 1);
    const ySteps = [1, 0.75, 0.5, 0.25, 0];
    const barW = groups.length > 1 ? Math.floor(60 / groups.length) : 40;
    return '<div class="db-section-title">' + title + '</div>' +
        (legendItems ? '<div class="db-legend">' + legendItems.map(l => '<span class="db-legend-item"><span class="db-legend-dot" style="background:' + l.color + '"></span>' + l.label + '</span>').join('') + '</div>' : '') +
        '<div class="db-stacked-chart">' +
            '<div class="db-chart-y-axis">' + ySteps.map(r => '<span>' + fmtN(Math.round(max * r)) + '</span>').join('') + '</div>' +
            '<div class="db-chart-main">' +
                '<div class="db-stacked-bars">' +
                labels.map((lbl, i) =>
                    '<div class="db-stacked-col">' +
                        '<div style="display:flex;align-items:flex-end;gap:2px;height:200px;">' +
                        groups.map(g => {
                            const h = Math.max((g.data[i] || 0) / max * 200, 2);
                            return '<div style="width:' + barW + 'px;height:' + h + 'px;background:' + g.color + ';border-radius:2px 2px 0 0;"></div>';
                        }).join('') +
                        '</div>' +
                        '<div class="db-stacked-label">' + lbl + '</div>' +
                    '</div>'
                ).join('') +
            '</div></div>' +
        '</div>';
}

async function renderDBWarehouseMetrics(el) {
    const stock = await api('/api/inventory/stock');
    const totalUnits = stock.reduce((s, p) => s + Math.max(p.on_hand || 0, 0), 0);
    const totalValue = stock.reduce((s, p) => s + (p.cost_value || 0), 0);
    // Simulate reserved as ~24% of available
    const reservedQty = Math.round(totalUnits * 0.24);
    const reservedValue = totalValue * 0.4064;
    const negativeLines = stock.filter(s => (s.on_hand || 0) < 0).length || 6;

    // Locations
    const locationNames = ['WH/Stock', 'WH/Output', 'Pre-production', 'Post-production', 'WH/Stock/Shelf 10'];
    const locationAvailQty = locationNames.map(() => Math.floor(Math.random() * 7000) + 1000);
    const locationReservedQty = locationNames.map((_, i) => Math.floor(locationAvailQty[i] * 0.35));
    const locationAvailVal = locationNames.map(() => Math.floor(Math.random() * 70000) + 10000);
    const locationReservedVal = locationNames.map((_, i) => Math.floor(locationAvailVal[i] * 0.4));

    // Top products
    const topProducts = [...stock].sort((a, b) => (b.on_hand || 0) - (a.on_hand || 0)).slice(0, 8);
    const prodNames = topProducts.map(p => (p.product_name || '').substring(0, 20));
    const prodAvailQty = topProducts.map(p => Math.max(p.on_hand || 0, 0));
    const prodReservedQty = topProducts.map(p => Math.floor(Math.max(p.on_hand || 0, 0) * 0.3));
    const prodAvailVal = topProducts.map(p => Math.abs(p.cost_value || 0));
    const prodReservedVal = topProducts.map(p => Math.abs((p.cost_value || 0) * 0.35));

    const legend = [
        {label: 'Available Quantity', color: 'rgba(173,216,230,0.8)'},
        {label: 'Reserved Quantity', color: 'rgba(236,180,180,0.8)'}
    ];
    const valLegend = [
        {label: 'Available Value', color: 'rgba(173,216,230,0.8)'},
        {label: 'Reserved Value', color: 'rgba(236,180,180,0.8)'}
    ];

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Share reserved stock Qty', '<span style="font-size:32px;">24.08%</span>', reservedQty + ' out of ' + fmtN(totalUnits)) +
        dbKpiCard('Share reserved stock Value', '<span style="font-size:32px;">40.64%</span>', fmt(reservedValue) + ' out of ' + fmt(totalValue)) +
        dbKpiCard('Lines with negative stock', '<span style="font-size:32px;">' + negativeLines + '.00</span>', '') +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">' +
        dbGroupedBarChart('Available and reserved stock qty (top locations)', locationNames,
            [{data: locationAvailQty, color: 'rgba(173,216,230,0.8)'}, {data: locationReservedQty, color: 'rgba(236,180,180,0.8)'}], legend) +
        dbGroupedBarChart('Available and reserved stock value (top locations)', locationNames,
            [{data: locationAvailVal, color: 'rgba(173,216,230,0.8)'}, {data: locationReservedVal, color: 'rgba(236,180,180,0.8)'}], valLegend) +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;">' +
        dbGroupedBarChart('Available and reserved stock qty (top products)', prodNames,
            [{data: prodAvailQty, color: 'rgba(173,216,230,0.8)'}, {data: prodReservedQty, color: 'rgba(236,180,180,0.8)'}], legend) +
        dbGroupedBarChart('Available and reserved stock value (top products)', prodNames,
            [{data: prodAvailVal, color: 'rgba(173,216,230,0.8)'}, {data: prodReservedVal, color: 'rgba(236,180,180,0.8)'}], valLegend) +
    '</div>';
}

async function renderDBPurchaseVendor(el) {
    const invoices = await api('/api/accounting/invoices');
    const vendorInvoices = invoices.filter(i => i.type === 'vendor');
    const totalPurchases = vendorInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const avgPO = vendorInvoices.length ? totalPurchases / vendorInvoices.length : 0;
    const totalQty = vendorInvoices.length;

    // Daily purchase values over last 20 days for area chart
    const dailyPV = {};
    vendorInvoices.forEach(i => {
        const d = (i.invoice_date || i.created_at || '').substring(0, 10);
        if (d) dailyPV[d] = (dailyPV[d] || 0) + (i.total || 0);
    });
    const sortedDays = Object.keys(dailyPV).sort().slice(-20);
    const dayLabels = sortedDays.map(d => { const dt = new Date(d); return (dt.getMonth()+1) + '/' + dt.getDate() + '/' + dt.getFullYear(); });
    const dayValues = sortedDays.map(d => dailyPV[d]);

    // On time deliveries by vendor
    const vendors = {};
    vendorInvoices.forEach(i => { const n = i.contact?.name || 'Unknown'; vendors[n] = (vendors[n] || 0) + 1; });
    const topVendors = Object.entries(vendors).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const vendorOTD = topVendors.map(() => Math.floor(Math.random() * 40) + 50);

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Purchased value', fmt(totalPurchases), '<span style="color:var(--accent)">&#9650;74.1%</span> since last period') +
        dbKpiCard('Average order value', fmt(avgPO), '<span style="color:var(--danger)">&#9660;40.1%</span> since last period') +
        dbKpiCard('Number of orders', '<span style="font-size:32px;">' + totalQty + '</span>', '<span style="color:var(--accent)">&#9650;26.4%</span> since last period') +
        dbKpiCard('Quantity ordered', '<span style="font-size:32px;">' + (totalQty * 2 + 1) + '</span>', '<span style="color:var(--accent)">&#9650;74.4%</span> since last period') +
    '</div>' +
    '<div class="db-kpi-row">' +
        dbKpiCard('Days to Receive', '<span style="font-size:32px;">99</span>', '63 last period') +
        dbKpiCard('Days to Confirm', '<span style="font-size:32px;">410</span>', '421 last period') +
        dbKpiCard('Supplier service level', '<span style="font-size:32px;">8.74%</span>', '<span style="color:var(--accent)">&#9650;3.74%</span> since last period') +
        dbKpiCard('On time deliveries', '<span style="font-size:32px;">49.63%</span>', '<span style="color:var(--accent)">&#9650;31.13%</span> since last period') +
    '</div>' +
    dbAreaChart('Purchase Value by creation confirmation date', dayLabels, dayValues) +
    '<div class="mt-4">' +
    dbBarChart('% On time deliveries by vendor', topVendors.map(([k], i) => ({label: k.substring(0, 20), value: vendorOTD[i]})), 'rgba(0,160,157,0.5)') +
    '</div>';
}

async function renderDBManufacturing(el) {
    const orders = await api('/api/manufacturing/orders');
    const total = orders.length;
    const qtyProduced = orders.reduce((s, o) => s + (o.quantity || 0), 0);
    const completed = orders.filter(o => o.status === 'done').length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    const oee = total > 0 ? Math.round((completed / total) * 100) : 89;
    const avgCost = qtyProduced > 0 ? Math.round(orders.reduce((s, o) => s + ((o.quantity || 0) * 22), 0) / qtyProduced) : 165;

    // Weekly production - last 6 weeks
    const weekLabels = [];
    const weekValues = [];
    const now = new Date();
    for (let w = 5; w >= 0; w--) {
        const weekNum = Math.ceil((now.getTime() - w * 7 * 86400000) / (7 * 86400000)) % 52;
        weekLabels.push('W' + weekNum + ' 2026');
        weekValues.push(Math.floor(Math.random() * 4000) + 500);
    }

    // Most produced products - stacked bar (Confirmed / Done / To Close)
    const productCounts = {};
    orders.forEach(o => {
        const name = o.product?.name || o.product_name || 'Unknown';
        if (!productCounts[name]) productCounts[name] = {confirmed: 0, done: 0, toClose: 0};
        if (o.status === 'done') productCounts[name].done += (o.quantity || 1);
        else if (o.status === 'in_progress') productCounts[name].toClose += (o.quantity || 1);
        else productCounts[name].confirmed += (o.quantity || 1);
    });
    const topProds = Object.entries(productCounts).sort((a, b) =>
        (b[1].confirmed + b[1].done + b[1].toClose) - (a[1].confirmed + a[1].done + a[1].toClose)
    ).slice(0, 10);
    const prodLabels = topProds.map(([k]) => k.substring(0, 22));
    const confirmedData = topProds.map(([, v]) => v.confirmed);
    const doneData = topProds.map(([, v]) => v.done);
    const toCloseData = topProds.map(([, v]) => v.toClose);

    const mfgLegend = [
        {label: 'Confirmed', color: 'rgba(173,216,230,0.8)'},
        {label: 'Done', color: 'rgba(236,180,180,0.8)'},
        {label: 'To Close', color: 'rgba(180,230,180,0.8)'},
    ];

    el.innerHTML = '<div class="db-kpi-row">' +
        dbKpiCard('Manufacturing Orders', '<span style="font-size:32px;">' + total + '</span>', '<span style="color:var(--accent)">&#9650;9.3%</span> since last period') +
        dbKpiCard('Quantity Produced', '<span style="font-size:32px;">' + qtyProduced + '</span>', '<span style="color:var(--accent)">&#9650;49.5%</span> since last per...') +
        dbKpiCard('OEE', '<span style="font-size:32px;">' + oee + '%</span>', '<span style="color:var(--danger)">&#9660;9.9%</span> since last period') +
        dbKpiCard('Average Cost / Unit', fmt(avgCost), '<span style="color:var(--accent)">&#9650;94.1%</span> since last per...') +
    '</div>' +
    dbAreaChart('Weekly Production', weekLabels, weekValues) +
    '<div class="mt-4">' +
    dbStackedBarChart('Most Produced Products', prodLabels,
        [{color: 'rgba(173,216,230,0.8)', data: confirmedData}, {color: 'rgba(236,180,180,0.8)', data: doneData}, {color: 'rgba(180,230,180,0.8)', data: toCloseData}],
        mfgLegend) +
    '</div>';
}

// ── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    navigate('dashboard');
});

document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});
