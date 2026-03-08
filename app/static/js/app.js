// ============================================================================
// FurnitureERP — Sales & Expense Tracker SPA
// ============================================================================

let currentUser = null;
let currentPage = 'dashboard';
let chartInstances = {};

// ── API Helper ──────────────────────────────────────────────────────────────

async function api(url, options = {}) {
    const defaults = {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
    };
    const opts = { ...defaults, ...options };
    if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
        opts.body = JSON.stringify(opts.body);
    }
    if (opts.body instanceof FormData) {
        delete opts.headers['Content-Type'];
    }
    const res = await fetch(url, opts);
    if (res.status === 401) {
        currentUser = null;
        showLogin();
        throw new Error('Not authenticated');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
    }
    if (res.headers.get('content-type')?.includes('application/json')) {
        return res.json();
    }
    return res;
}

// ── Utility Functions ───────────────────────────────────────────────────────

function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function formatOMR(amount) {
    const num = parseFloat(amount) || 0;
    return num.toFixed(3) + ' OMR';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dtStr) {
    if (!dtStr) return '';
    const d = new Date(dtStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function monthStartStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function toast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function saleTypeBadge(type) {
    const labels = { sofa_sale: 'Sofa Sale', repair: 'Repair', service: 'Service', other: 'Other' };
    return `<span class="badge badge-${type}">${labels[type] || type}</span>`;
}

function paymentBadge(method) {
    return `<span class="badge badge-${method}">${method}</span>`;
}

function isOwner() {
    return currentUser && currentUser.role === 'owner';
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errEl.style.display = 'none';
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    try {
        const data = await api('/api/auth/login', {
            method: 'POST',
            body: { username, password },
        });
        currentUser = data.user;
        showApp();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
    return false;
}

async function handleLogout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) {}
    currentUser = null;
    showLogin();
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    // Update user info
    document.getElementById('user-fullname').textContent = currentUser.full_name;
    document.getElementById('user-role').textContent = currentUser.role;
    document.getElementById('user-avatar').textContent = currentUser.full_name.charAt(0).toUpperCase();
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    // Show/hide owner-only nav items
    document.querySelectorAll('.owner-only').forEach(el => {
        el.style.display = isOwner() ? 'flex' : 'none';
    });

    navigate('dashboard');
}

// ── Navigation ──────────────────────────────────────────────────────────────

function navigate(page) {
    currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });

    const titles = {
        dashboard: 'Dashboard',
        sales: 'Sales',
        expenses: 'Expenses',
        inventory: 'Inventory',
        reports: 'Reports',
        audit: 'Audit Log',
        users: 'User Management',
    };
    document.getElementById('page-title').textContent = titles[page] || page;

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');

    // Destroy old charts
    Object.values(chartInstances).forEach(c => c.destroy());
    chartInstances = {};

    // Load page
    const loaders = {
        dashboard: loadDashboard,
        sales: loadSales,
        expenses: loadExpenses,
        inventory: loadInventory,
        reports: loadReports,
        audit: loadAudit,
        users: loadUsers,
    };
    const content = document.getElementById('page-content');
    content.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
    if (loaders[page]) loaders[page]();

    return false;
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ── Modal ────────────────────────────────────────────────────────────────────

function openModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal(e) {
    if (e && e.target !== document.getElementById('modal-overlay')) return;
    document.getElementById('modal-overlay').style.display = 'none';
}

// ── Dashboard ───────────────────────────────────────────────────────────────

async function loadDashboard() {
    try {
        const requests = [
            api('/api/dashboard'),
            api('/api/dashboard/charts'),
        ];
        if (isOwner()) {
            requests.push(api('/api/dashboard/money-summary'));
        }
        const [data, charts, moneySummary] = await Promise.all(requests);
        renderDashboard(data, charts, moneySummary);
    } catch (err) {
        document.getElementById('page-content').innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
    }
}

function renderDashboard(data, charts, moneySummary) {
    const profitClass = v => v >= 0 ? 'positive' : 'negative';
    const profitSign = v => v >= 0 ? '+' : '';

    let html = `
    <div class="kpi-grid">
        <div class="kpi-card sales">
            <div class="kpi-label">Today's Sales</div>
            <div class="kpi-value">${formatOMR(data.today.sales)}</div>
        </div>
        <div class="kpi-card expenses">
            <div class="kpi-label">Today's Expenses</div>
            <div class="kpi-value">${formatOMR(data.today.expenses)}</div>
        </div>
        <div class="kpi-card profit">
            <div class="kpi-label">Today's Profit</div>
            <div class="kpi-value ${profitClass(data.today.profit)}">${profitSign(data.today.profit)}${formatOMR(data.today.profit)}</div>
        </div>
        <div class="kpi-card sales">
            <div class="kpi-label">This Month Sales</div>
            <div class="kpi-value">${formatOMR(data.month.sales)}</div>
        </div>
        <div class="kpi-card expenses">
            <div class="kpi-label">This Month Expenses</div>
            <div class="kpi-value">${formatOMR(data.month.expenses)}</div>
        </div>
        <div class="kpi-card profit">
            <div class="kpi-label">Net Profit (Month)</div>
            <div class="kpi-value ${profitClass(data.month.profit)}">${profitSign(data.month.profit)}${formatOMR(data.month.profit)}</div>
        </div>
    </div>

    ${moneySummary && moneySummary.entries && moneySummary.entries.length > 0 ? `
    <div class="card" style="margin-bottom:1.5rem;">
        <div class="card-header"><h3>Money Summary</h3></div>
        <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>Period</th><th>Description</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead>
                <tbody>
                    ${moneySummary.entries.map(e => `
                        <tr>
                            <td>${esc(e.period)}</td>
                            <td>${esc(e.description)}</td>
                            <td><span class="badge badge-${e.entry_type === 'bank_balance' ? 'bank' : e.entry_type === 'cash' ? 'cash' : 'transfer'}">${esc(e.entry_type)}</span></td>
                            <td style="text-align:right;font-weight:600">${formatOMR(e.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="kpi-grid" style="margin-top:1rem;padding:0 1rem 1rem;">
            <div class="kpi-card sales">
                <div class="kpi-label">Total Sales</div>
                <div class="kpi-value">${formatOMR(moneySummary.totals.total_sales)}</div>
            </div>
            <div class="kpi-card expenses">
                <div class="kpi-label">Total Expenses</div>
                <div class="kpi-value">${formatOMR(moneySummary.totals.total_expenses)}</div>
            </div>
            <div class="kpi-card profit">
                <div class="kpi-label">Net Profit</div>
                <div class="kpi-value ${moneySummary.totals.net_profit >= 0 ? 'positive' : 'negative'}">${moneySummary.totals.net_profit >= 0 ? '+' : ''}${formatOMR(moneySummary.totals.net_profit)}</div>
            </div>
        </div>
    </div>` : ''}

    <div class="chart-grid">
        <div class="chart-card">
            <h4>Monthly Sales vs Expenses (${new Date().getFullYear()})</h4>
            <div class="chart-wrapper"><canvas id="chart-monthly"></canvas></div>
        </div>
        <div class="chart-card">
            <h4>Expense Breakdown by Category</h4>
            <div class="chart-wrapper"><canvas id="chart-expense-pie"></canvas></div>
        </div>
        <div class="chart-card">
            <h4>Daily Cash Flow (Last 30 Days)</h4>
            <div class="chart-wrapper"><canvas id="chart-cashflow"></canvas></div>
        </div>
        <div class="chart-card">
            <h4>Monthly Profit</h4>
            <div class="chart-wrapper"><canvas id="chart-profit"></canvas></div>
        </div>
    </div>

    <div class="card">
        <div class="card-header"><h3>Recent Activity</h3></div>
        <ul class="activity-list">
            ${data.recent_activity.length === 0 ? '<li class="empty-state"><p>No recent activity</p></li>' :
              data.recent_activity.map(a => `
                <li class="activity-item">
                    <div class="activity-dot ${a.type}"></div>
                    <div class="activity-info">
                        <div class="activity-desc">${esc(a.description)}</div>
                        <div class="activity-meta">${a.type === 'sale' ? 'Sale' : 'Expense'} &middot; ${formatDate(a.date)} &middot; ${esc(a.employee || '')}</div>
                    </div>
                    <div class="activity-amount ${a.type === 'sale' ? 'amount-positive' : 'amount-negative'}">
                        ${a.type === 'sale' ? '+' : '-'}${formatOMR(a.amount)}
                    </div>
                </li>
              `).join('')}
        </ul>
    </div>`;

    document.getElementById('page-content').innerHTML = html;

    // Render charts
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Monthly Sales vs Expenses Bar Chart
    chartInstances.monthly = new Chart(document.getElementById('chart-monthly'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Sales', data: charts.monthly.map(m => m.sales), backgroundColor: '#00A09D' },
                { label: 'Expenses', data: charts.monthly.map(m => m.expenses), backgroundColor: '#dc3545' },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true } },
        }
    });

    // Expense Pie Chart
    const pieColors = ['#714B67','#00A09D','#dc3545','#ffc107','#17a2b8','#28a745','#6f42c1','#fd7e14','#20c997','#e83e8c','#6c757d','#343a40','#007bff','#795548','#9e9e9e'];
    if (charts.expense_by_category.length > 0) {
        chartInstances.pie = new Chart(document.getElementById('chart-expense-pie'), {
            type: 'doughnut',
            data: {
                labels: charts.expense_by_category.map(e => e.category),
                datasets: [{
                    data: charts.expense_by_category.map(e => e.amount),
                    backgroundColor: pieColors.slice(0, charts.expense_by_category.length),
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } },
            }
        });
    }

    // Daily Cash Flow Line Chart
    chartInstances.cashflow = new Chart(document.getElementById('chart-cashflow'), {
        type: 'line',
        data: {
            labels: charts.daily_cash_flow.map(d => d.date.slice(5)),
            datasets: [
                { label: 'Sales', data: charts.daily_cash_flow.map(d => d.sales), borderColor: '#00A09D', backgroundColor: 'rgba(0,160,157,0.1)', fill: true, tension: 0.3 },
                { label: 'Expenses', data: charts.daily_cash_flow.map(d => d.expenses), borderColor: '#dc3545', backgroundColor: 'rgba(220,53,69,0.1)', fill: true, tension: 0.3 },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true } },
        }
    });

    // Monthly Profit Bar Chart
    chartInstances.profit = new Chart(document.getElementById('chart-profit'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Profit',
                data: charts.monthly.map(m => m.profit),
                backgroundColor: charts.monthly.map(m => m.profit >= 0 ? '#28a745' : '#dc3545'),
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: false } },
        }
    });
}

// ── Sales Page ──────────────────────────────────────────────────────────────

async function loadSales() {
    const content = document.getElementById('page-content');

    let employeesHtml = '';
    if (isOwner()) {
        try {
            const emps = await api('/api/users/employees');
            employeesHtml = `
                <div class="filter-group">
                    <label>Employee</label>
                    <select id="filter-sale-employee">
                        <option value="">All Employees</option>
                        ${emps.map(e => `<option value="${e.id}">${esc(e.full_name)}</option>`).join('')}
                    </select>
                </div>`;
        } catch (e) {}
    }

    content.innerHTML = `
        <div class="filter-bar">
            <div class="filter-group">
                <label>From</label>
                <input type="date" id="filter-sale-from" value="${monthStartStr()}">
            </div>
            <div class="filter-group">
                <label>To</label>
                <input type="date" id="filter-sale-to" value="${todayStr()}">
            </div>
            <div class="filter-group">
                <label>Type</label>
                <select id="filter-sale-type">
                    <option value="">All Types</option>
                    <option value="sofa_sale">Sofa Sale</option>
                    <option value="repair">Repair</option>
                    <option value="service">Service</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Payment</label>
                <select id="filter-sale-payment">
                    <option value="">All</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="transfer">Transfer</option>
                </select>
            </div>
            ${employeesHtml}
            <div class="filter-group">
                <label>Search</label>
                <input type="text" id="filter-sale-search" placeholder="Customer or description">
            </div>
            <button class="btn btn-primary btn-sm" onclick="fetchSales()">Filter</button>
        </div>
        <div class="card">
            <div class="card-header">
                <h3>Sales Records</h3>
                <button class="btn btn-accent" onclick="openSaleForm()">+ New Sale</button>
            </div>
            <div id="sales-table-container">
                <div class="loading-center"><div class="spinner"></div></div>
            </div>
        </div>`;

    fetchSales();
}

async function fetchSales() {
    const params = new URLSearchParams();
    const from = document.getElementById('filter-sale-from')?.value;
    const to = document.getElementById('filter-sale-to')?.value;
    const type = document.getElementById('filter-sale-type')?.value;
    const payment = document.getElementById('filter-sale-payment')?.value;
    const emp = document.getElementById('filter-sale-employee')?.value;
    const search = document.getElementById('filter-sale-search')?.value;

    if (from) params.set('date_from', from);
    if (to) params.set('date_to', to);
    if (type) params.set('sale_type', type);
    if (payment) params.set('payment_method', payment);
    if (emp) params.set('employee_id', emp);
    if (search) params.set('search', search);

    try {
        const sales = await api(`/api/sales?${params}`);
        renderSalesTable(sales);
    } catch (err) {
        document.getElementById('sales-table-container').innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
    }
}

function renderSalesTable(sales) {
    if (sales.length === 0) {
        document.getElementById('sales-table-container').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">&#9650;</div>
                <h3>No sales found</h3>
                <p>Add your first sale or adjust filters</p>
            </div>`;
        return;
    }

    const total = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);

    document.getElementById('sales-table-container').innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Amount (OMR)</th>
                        <th>Payment</th>
                        ${isOwner() ? '<th>Employee</th>' : ''}
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map(s => `
                        <tr>
                            <td>${formatDate(s.date)}</td>
                            <td>${esc(s.customer_name) || '<span style="color:var(--text-muted)">-</span>'}</td>
                            <td>${saleTypeBadge(s.sale_type)}</td>
                            <td>${esc(s.description) || ''}</td>
                            <td class="amount-cell amount-positive">${formatOMR(s.amount)}</td>
                            <td>${paymentBadge(s.payment_method)}</td>
                            ${isOwner() ? `<td>${esc(s.employee_name) || ''}</td>` : ''}
                            <td>
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-outline" onclick="openSaleForm(${s.id})">Edit</button>
                                    ${isOwner() ? `<button class="btn btn-sm btn-danger" onclick="deleteSale(${s.id})">Delete</button>` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="${isOwner() ? 4 : 3}" style="text-align:right; font-weight:700">Total:</td>
                        <td class="amount-cell amount-positive" style="font-weight:700">${formatOMR(total)}</td>
                        <td colspan="${isOwner() ? 3 : 2}"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div style="margin-top:8px; font-size:13px; color:var(--text-muted)">${sales.length} record(s)</div>`;
}

async function openSaleForm(saleId = null) {
    let sale = null;
    if (saleId) {
        try { sale = await api(`/api/sales/${saleId}`); } catch (e) { toast(e.message, 'error'); return; }
    }

    const html = `
        <form id="sale-form" onsubmit="return saveSale(event, ${saleId || 'null'})">
            <div class="form-row">
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" name="date" value="${sale ? sale.date : todayStr()}" required>
                </div>
                <div class="form-group">
                    <label>Sale Type *</label>
                    <select name="sale_type" required>
                        <option value="sofa_sale" ${sale?.sale_type === 'sofa_sale' ? 'selected' : ''}>Sofa Sale</option>
                        <option value="repair" ${sale?.sale_type === 'repair' ? 'selected' : ''}>Repair</option>
                        <option value="service" ${sale?.sale_type === 'service' ? 'selected' : ''}>Service</option>
                        <option value="other" ${sale?.sale_type === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Customer Name (optional)</label>
                <input type="text" name="customer_name" value="${esc(sale?.customer_name || '')}" placeholder="e.g. Mohammed Al-Balushi">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" placeholder="e.g. 3-seater sofa, beige fabric">${esc(sale?.description || '')}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Amount (OMR) *</label>
                    <input type="number" name="amount" step="0.001" min="0.001" value="${sale ? sale.amount : ''}" required placeholder="0.000">
                </div>
                <div class="form-group">
                    <label>Payment Method *</label>
                    <select name="payment_method" required>
                        <option value="cash" ${sale?.payment_method === 'cash' ? 'selected' : ''}>Cash</option>
                        <option value="bank" ${sale?.payment_method === 'bank' ? 'selected' : ''}>Bank</option>
                        <option value="transfer" ${sale?.payment_method === 'transfer' ? 'selected' : ''}>Transfer</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Notes (optional)</label>
                <input type="text" name="note" value="${esc(sale?.note || '')}" placeholder="Any additional notes">
            </div>
            <div style="margin-top:20px; display:flex; gap:8px; justify-content:flex-end">
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${saleId ? 'Update Sale' : 'Add Sale'}</button>
            </div>
        </form>`;

    openModal(saleId ? 'Edit Sale' : 'New Sale', html);
}

async function saveSale(e, saleId) {
    e.preventDefault();
    const form = e.target;
    const data = {
        date: form.date.value,
        customer_name: form.customer_name.value,
        sale_type: form.sale_type.value,
        description: form.description.value,
        amount: form.amount.value,
        payment_method: form.payment_method.value,
        note: form.note.value,
    };

    try {
        if (saleId) {
            await api(`/api/sales/${saleId}`, { method: 'PUT', body: data });
            toast('Sale updated');
        } else {
            await api('/api/sales', { method: 'POST', body: data });
            toast('Sale added');
        }
        closeModal();
        fetchSales();
    } catch (err) {
        toast(err.message, 'error');
    }
    return false;
}

async function deleteSale(id) {
    if (!confirm('Delete this sale record?')) return;
    try {
        await api(`/api/sales/${id}`, { method: 'DELETE' });
        toast('Sale deleted');
        fetchSales();
    } catch (err) {
        toast(err.message, 'error');
    }
}

// ── Expenses Page ───────────────────────────────────────────────────────────

async function loadExpenses() {
    const content = document.getElementById('page-content');
    let categories = [];
    try { categories = await api('/api/expenses/categories'); } catch (e) {}

    let employeesHtml = '';
    if (isOwner()) {
        try {
            const emps = await api('/api/users/employees');
            employeesHtml = `
                <div class="filter-group">
                    <label>Employee</label>
                    <select id="filter-exp-employee">
                        <option value="">All Employees</option>
                        ${emps.map(e => `<option value="${e.id}">${esc(e.full_name)}</option>`).join('')}
                    </select>
                </div>`;
        } catch (e) {}
    }

    content.innerHTML = `
        <div class="filter-bar">
            <div class="filter-group">
                <label>From</label>
                <input type="date" id="filter-exp-from" value="${monthStartStr()}">
            </div>
            <div class="filter-group">
                <label>To</label>
                <input type="date" id="filter-exp-to" value="${todayStr()}">
            </div>
            <div class="filter-group">
                <label>Category</label>
                <select id="filter-exp-category">
                    <option value="">All Categories</option>
                    ${categories.map(c => `<option value="${esc(c.value)}">${esc(c.label)}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Payment</label>
                <select id="filter-exp-payment">
                    <option value="">All</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                </select>
            </div>
            ${employeesHtml}
            <div class="filter-group">
                <label>Search</label>
                <input type="text" id="filter-exp-search" placeholder="Search description">
            </div>
            <button class="btn btn-primary btn-sm" onclick="fetchExpenses()">Filter</button>
        </div>
        <div class="card">
            <div class="card-header">
                <h3>Expense Records</h3>
                <button class="btn btn-accent" onclick="openExpenseForm()">+ New Expense</button>
            </div>
            <div id="expenses-table-container">
                <div class="loading-center"><div class="spinner"></div></div>
            </div>
        </div>`;

    // Store categories globally for the form
    window._expenseCategories = categories;
    fetchExpenses();
}

async function fetchExpenses() {
    const params = new URLSearchParams();
    const from = document.getElementById('filter-exp-from')?.value;
    const to = document.getElementById('filter-exp-to')?.value;
    const cat = document.getElementById('filter-exp-category')?.value;
    const payment = document.getElementById('filter-exp-payment')?.value;
    const emp = document.getElementById('filter-exp-employee')?.value;
    const search = document.getElementById('filter-exp-search')?.value;

    if (from) params.set('date_from', from);
    if (to) params.set('date_to', to);
    if (cat) params.set('category', cat);
    if (payment) params.set('payment_method', payment);
    if (emp) params.set('employee_id', emp);
    if (search) params.set('search', search);

    try {
        const expenses = await api(`/api/expenses?${params}`);
        renderExpensesTable(expenses);
    } catch (err) {
        document.getElementById('expenses-table-container').innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
    }
}

function renderExpensesTable(expenses) {
    if (expenses.length === 0) {
        document.getElementById('expenses-table-container').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">&#9660;</div>
                <h3>No expenses found</h3>
                <p>Add your first expense or adjust filters</p>
            </div>`;
        return;
    }

    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    document.getElementById('expenses-table-container').innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount (OMR)</th>
                        <th>Payment</th>
                        ${isOwner() ? '<th>Employee</th>' : ''}
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.map(e => `
                        <tr>
                            <td>${formatDate(e.date)}</td>
                            <td><span class="badge badge-expense">${esc(e.category)}</span></td>
                            <td>${esc(e.description) || ''}</td>
                            <td class="amount-cell amount-negative">${formatOMR(e.amount)}</td>
                            <td>${paymentBadge(e.payment_method)}</td>
                            ${isOwner() ? `<td>${esc(e.employee_name) || ''}</td>` : ''}
                            <td>
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-outline" onclick="openExpenseForm(${e.id})">Edit</button>
                                    ${isOwner() ? `<button class="btn btn-sm btn-danger" onclick="deleteExpense(${e.id})">Delete</button>` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="${isOwner() ? 3 : 2}" style="text-align:right; font-weight:700">Total:</td>
                        <td class="amount-cell amount-negative" style="font-weight:700">${formatOMR(total)}</td>
                        <td colspan="${isOwner() ? 3 : 2}"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div style="margin-top:8px; font-size:13px; color:var(--text-muted)">${expenses.length} record(s)</div>`;
}

async function openExpenseForm(expenseId = null) {
    let expense = null;
    if (expenseId) {
        try { expense = await api(`/api/expenses/${expenseId}`); } catch (e) { toast(e.message, 'error'); return; }
    }

    const cats = window._expenseCategories || [];

    const html = `
        <form id="expense-form" onsubmit="return saveExpense(event, ${expenseId || 'null'})">
            <div class="form-row">
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" name="date" value="${expense ? expense.date : todayStr()}" required>
                </div>
                <div class="form-group">
                    <label>Category *</label>
                    <select name="category" required>
                        <option value="">Select category</option>
                        ${cats.map(c => `<option value="${esc(c.value)}" ${expense?.category === c.value ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" placeholder="e.g. High density foam sheets for sofa repair">${esc(expense?.description || '')}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Amount (OMR) *</label>
                    <input type="number" name="amount" step="0.001" min="0.001" value="${expense ? expense.amount : ''}" required placeholder="0.000">
                </div>
                <div class="form-group">
                    <label>Payment Method *</label>
                    <select name="payment_method" required>
                        <option value="cash" ${expense?.payment_method === 'cash' ? 'selected' : ''}>Cash</option>
                        <option value="bank" ${expense?.payment_method === 'bank' ? 'selected' : ''}>Bank</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Notes (optional)</label>
                <input type="text" name="note" value="${esc(expense?.note || '')}" placeholder="Any additional notes">
            </div>
            <div style="margin-top:20px; display:flex; gap:8px; justify-content:flex-end">
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${expenseId ? 'Update Expense' : 'Add Expense'}</button>
            </div>
        </form>`;

    openModal(expenseId ? 'Edit Expense' : 'New Expense', html);
}

async function saveExpense(e, expenseId) {
    e.preventDefault();
    const form = e.target;
    const data = {
        date: form.date.value,
        category: form.category.value,
        description: form.description.value,
        amount: form.amount.value,
        payment_method: form.payment_method.value,
        note: form.note.value,
    };

    try {
        if (expenseId) {
            await api(`/api/expenses/${expenseId}`, { method: 'PUT', body: data });
            toast('Expense updated');
        } else {
            await api('/api/expenses', { method: 'POST', body: data });
            toast('Expense added');
        }
        closeModal();
        fetchExpenses();
    } catch (err) {
        toast(err.message, 'error');
    }
    return false;
}

async function deleteExpense(id) {
    if (!confirm('Delete this expense record?')) return;
    try {
        await api(`/api/expenses/${id}`, { method: 'DELETE' });
        toast('Expense deleted');
        fetchExpenses();
    } catch (err) {
        toast(err.message, 'error');
    }
}

// ── Inventory Page ──────────────────────────────────────────────────────

async function loadInventory() {
    const content = document.getElementById('page-content');

    let categories = [];
    try { categories = await api('/api/inventory/categories'); } catch (e) {}
    window._invCategories = categories;

    let summary = {};
    try { summary = await api('/api/inventory/summary'); } catch (e) {}

    content.innerHTML = `
        <div class="kpi-grid">
            <div class="kpi-card info">
                <div class="kpi-label">Total Items</div>
                <div class="kpi-value">${summary.total_items || 0}</div>
            </div>
            <div class="kpi-card sales">
                <div class="kpi-label">Available</div>
                <div class="kpi-value">${summary.available || 0}</div>
            </div>
            <div class="kpi-card profit">
                <div class="kpi-label">Sold</div>
                <div class="kpi-value">${summary.sold || 0}</div>
            </div>
            <div class="kpi-card expenses">
                <div class="kpi-label">Stock Value</div>
                <div class="kpi-value">${formatOMR(summary.total_stock_value || 0)}</div>
            </div>
        </div>
        <div class="filter-bar">
            <div class="filter-group">
                <label>Category</label>
                <select id="filter-inv-category">
                    <option value="">All Categories</option>
                    ${categories.map(c => '<option value="' + esc(c.value) + '">' + esc(c.label) + '</option>').join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>Status</label>
                <select id="filter-inv-status">
                    <option value="">All Statuses</option>
                    <option value="available">Available</option>
                    <option value="sold">Sold</option>
                    <option value="reserved">Reserved</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Location</label>
                <select id="filter-inv-location">
                    <option value="">All Locations</option>
                    <option value="shop">Shop</option>
                    <option value="workshop">Workshop</option>
                    <option value="warehouse">Warehouse</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Search</label>
                <input type="text" id="filter-inv-search" placeholder="Name or description">
            </div>
            <button class="btn btn-primary btn-sm" onclick="fetchInventory()">Filter</button>
        </div>
        <div class="card">
            <div class="card-header">
                <h3>Inventory Items</h3>
                <button class="btn btn-accent" onclick="openInventoryForm()">+ Add Item</button>
            </div>
            <div id="inventory-table-container">
                <div class="loading-center"><div class="spinner"></div></div>
            </div>
        </div>`;

    fetchInventory();
}

async function fetchInventory() {
    const params = new URLSearchParams();
    const cat = document.getElementById('filter-inv-category')?.value;
    const status = document.getElementById('filter-inv-status')?.value;
    const loc = document.getElementById('filter-inv-location')?.value;
    const search = document.getElementById('filter-inv-search')?.value;

    if (cat) params.set('category', cat);
    if (status) params.set('status', status);
    if (loc) params.set('location', loc);
    if (search) params.set('search', search);

    try {
        const items = await api('/api/inventory?' + params);
        renderInventoryTable(items);
    } catch (err) {
        document.getElementById('inventory-table-container').innerHTML = '<div class="error-msg">' + esc(err.message) + '</div>';
    }
}

function statusBadge(status) {
    const colors = { available: 'badge-cash', sold: 'badge-expense', reserved: 'badge-transfer' };
    return '<span class="badge ' + (colors[status] || '') + '">' + (status || '') + '</span>';
}

function categoryBadge(cat) {
    return '<span class="badge badge-sofa_sale">' + (cat || '') + '</span>';
}

function renderInventoryTable(items) {
    if (items.length === 0) {
        document.getElementById('inventory-table-container').innerHTML = '\
            <div class="empty-state">\
                <div class="empty-state-icon">&#9638;</div>\
                <h3>No items found</h3>\
                <p>Add your first inventory item or adjust filters</p>\
            </div>';
        return;
    }

    const totalValue = items.reduce(function(sum, i) {
        return sum + (i.status === 'available' ? parseFloat(i.selling_price) * (i.quantity || 1) : 0);
    }, 0);

    document.getElementById('inventory-table-container').innerHTML = '\
        <div class="table-container">\
            <table>\
                <thead>\
                    <tr>\
                        <th>Name</th>\
                        <th>Category</th>\
                        <th>Price (OMR)</th>\
                        <th>Qty</th>\
                        <th>Status</th>\
                        <th>Location</th>\
                        <th>Actions</th>\
                    </tr>\
                </thead>\
                <tbody>' +
                    items.map(function(i) { return '\
                        <tr>\
                            <td><strong>' + esc(i.name) + '</strong>' + (i.description ? '<br><small style="color:var(--text-muted)">' + esc(i.description) + '</small>' : '') + '</td>\
                            <td>' + categoryBadge(i.category) + '</td>\
                            <td class="amount-cell">' + formatOMR(i.selling_price) + (i.cost_price ? '<br><small style="color:var(--text-muted)">Cost: ' + formatOMR(i.cost_price) + '</small>' : '') + '</td>\
                            <td>' + (i.quantity || 1) + '</td>\
                            <td>' + statusBadge(i.status) + '</td>\
                            <td>' + esc(i.location || '-') + '</td>\
                            <td>\
                                <div class="btn-group">\
                                    <button class="btn btn-sm btn-outline" onclick="openInventoryForm(' + i.id + ')">Edit</button>' +
                                    (isOwner() ? '<button class="btn btn-sm btn-danger" onclick="deleteInventoryItem(' + i.id + ')">Delete</button>' : '') + '\
                                </div>\
                            </td>\
                        </tr>';
                    }).join('') + '\
                </tbody>\
                <tfoot>\
                    <tr>\
                        <td colspan="2" style="text-align:right; font-weight:700">Available Stock Value:</td>\
                        <td class="amount-cell" style="font-weight:700">' + formatOMR(totalValue) + '</td>\
                        <td colspan="4"></td>\
                    </tr>\
                </tfoot>\
            </table>\
        </div>\
        <div style="margin-top:8px; font-size:13px; color:var(--text-muted)">' + items.length + ' item(s)</div>';
}

async function openInventoryForm(itemId) {
    if (itemId === undefined) itemId = null;
    var item = null;
    if (itemId) {
        try { item = await api('/api/inventory/' + itemId); } catch (e) { toast(e.message, 'error'); return; }
    }

    var cats = window._invCategories || [];

    var html = '\
        <form id="inventory-form" onsubmit="return saveInventoryItem(event, ' + (itemId || 'null') + ')">\
            <div class="form-group">\
                <label>Item Name *</label>\
                <input type="text" name="name" value="' + esc(item ? item.name : '') + '" required placeholder="e.g. Picas Sofa">\
            </div>\
            <div class="form-row">\
                <div class="form-group">\
                    <label>Category *</label>\
                    <select name="category" required>' +
                        cats.map(function(c) { return '<option value="' + esc(c.value) + '"' + (item && item.category === c.value ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('') + '\
                    </select>\
                </div>\
                <div class="form-group">\
                    <label>Status</label>\
                    <select name="status">\
                        <option value="available"' + (item && item.status === 'available' ? ' selected' : !item ? ' selected' : '') + '>Available</option>\
                        <option value="sold"' + (item && item.status === 'sold' ? ' selected' : '') + '>Sold</option>\
                        <option value="reserved"' + (item && item.status === 'reserved' ? ' selected' : '') + '>Reserved</option>\
                    </select>\
                </div>\
            </div>\
            <div class="form-group">\
                <label>Description</label>\
                <textarea name="description" placeholder="e.g. 3-seater, beige fabric, modern design">' + esc(item ? item.description || '' : '') + '</textarea>\
            </div>\
            <div class="form-row">\
                <div class="form-group">\
                    <label>Selling Price (OMR) *</label>\
                    <input type="number" name="selling_price" step="0.001" min="0" value="' + (item ? item.selling_price : '') + '" required placeholder="0.000">\
                </div>\
                <div class="form-group">\
                    <label>Cost Price (OMR)</label>\
                    <input type="number" name="cost_price" step="0.001" min="0" value="' + (item && item.cost_price ? item.cost_price : '') + '" placeholder="Optional">\
                </div>\
            </div>\
            <div class="form-row">\
                <div class="form-group">\
                    <label>Quantity</label>\
                    <input type="number" name="quantity" min="1" value="' + (item ? item.quantity : 1) + '">\
                </div>\
                <div class="form-group">\
                    <label>Location</label>\
                    <select name="location">\
                        <option value="">-- Select --</option>\
                        <option value="shop"' + (item && item.location === 'shop' ? ' selected' : '') + '>Shop</option>\
                        <option value="workshop"' + (item && item.location === 'workshop' ? ' selected' : '') + '>Workshop</option>\
                        <option value="warehouse"' + (item && item.location === 'warehouse' ? ' selected' : '') + '>Warehouse</option>\
                    </select>\
                </div>\
            </div>\
            <div class="form-group">\
                <label>Notes (optional)</label>\
                <input type="text" name="note" value="' + esc(item ? item.note || '' : '') + '" placeholder="Any additional notes">\
            </div>\
            <div style="margin-top:20px; display:flex; gap:8px; justify-content:flex-end">\
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>\
                <button type="submit" class="btn btn-primary">' + (itemId ? 'Update Item' : 'Add Item') + '</button>\
            </div>\
        </form>';

    openModal(itemId ? 'Edit Item' : 'New Inventory Item', html);
}

async function saveInventoryItem(e, itemId) {
    e.preventDefault();
    var form = e.target;
    var data = {
        name: form.name.value,
        category: form.category.value,
        description: form.description.value,
        selling_price: form.selling_price.value,
        cost_price: form.cost_price.value || null,
        quantity: form.quantity.value,
        status: form.status.value,
        location: form.location.value || null,
        note: form.note.value,
    };

    try {
        if (itemId) {
            await api('/api/inventory/' + itemId, { method: 'PUT', body: data });
            toast('Item updated');
        } else {
            await api('/api/inventory', { method: 'POST', body: data });
            toast('Item added');
        }
        closeModal();
        loadInventory();
    } catch (err) {
        toast(err.message, 'error');
    }
    return false;
}

async function deleteInventoryItem(id) {
    if (!confirm('Delete this inventory item?')) return;
    try {
        await api('/api/inventory/' + id, { method: 'DELETE' });
        toast('Item deleted');
        loadInventory();
    } catch (err) {
        toast(err.message, 'error');
    }
}

// ── Reports Page ────────────────────────────────────────────────────────────

async function loadReports() {
    const content = document.getElementById('page-content');

    content.innerHTML = `
        <div class="filter-bar">
            <div class="filter-group">
                <label>From</label>
                <input type="date" id="report-from" value="${monthStartStr()}">
            </div>
            <div class="filter-group">
                <label>To</label>
                <input type="date" id="report-to" value="${todayStr()}">
            </div>
            <button class="btn btn-primary btn-sm" onclick="fetchReport()">Generate Report</button>
            <div style="margin-left:auto" class="btn-group">
                <button class="btn btn-sm btn-success" onclick="exportExcel('profit-loss')">Export P&L</button>
                <button class="btn btn-sm btn-success" onclick="exportExcel('sales')">Export Sales</button>
                <button class="btn btn-sm btn-success" onclick="exportExcel('expenses')">Export Expenses</button>
            </div>
        </div>
        <div id="report-content">
            <div class="loading-center"><div class="spinner"></div></div>
        </div>`;

    fetchReport();
}

async function fetchReport() {
    const from = document.getElementById('report-from')?.value;
    const to = document.getElementById('report-to')?.value;
    const params = new URLSearchParams();
    if (from) params.set('date_from', from);
    if (to) params.set('date_to', to);

    try {
        const [pl, cashflow, empReport] = await Promise.all([
            api(`/api/reports/profit-loss?${params}`),
            api(`/api/reports/cash-flow?${params}`),
            isOwner() ? api(`/api/reports/employee-activity?${params}`).catch(() => null) : Promise.resolve(null),
        ]);
        renderReport(pl, cashflow, empReport);
    } catch (err) {
        document.getElementById('report-content').innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
    }
}

function renderReport(pl, cashflow, empReport) {
    const profitClass = pl.net_profit >= 0 ? 'amount-positive' : 'amount-negative';

    let html = `
        <div class="report-summary">
            <div class="report-stat">
                <div class="stat-value" style="color:var(--accent)">${formatOMR(pl.total_sales)}</div>
                <div class="stat-label">Total Sales</div>
            </div>
            <div class="report-stat">
                <div class="stat-value" style="color:var(--danger)">${formatOMR(pl.total_expenses)}</div>
                <div class="stat-label">Total Expenses</div>
            </div>
            <div class="report-stat">
                <div class="stat-value ${profitClass}">${formatOMR(pl.net_profit)}</div>
                <div class="stat-label">Net Profit</div>
            </div>
        </div>

        <div class="chart-grid">
            <div class="card">
                <div class="card-header"><h3>Sales by Type</h3></div>
                ${pl.sales_by_type.length === 0 ? '<p style="color:var(--text-muted)">No sales in period</p>' : `
                <div class="table-container">
                    <table>
                        <thead><tr><th>Type</th><th>Count</th><th>Amount (OMR)</th></tr></thead>
                        <tbody>
                            ${pl.sales_by_type.map(s => `
                                <tr>
                                    <td>${saleTypeBadge(s.type)}</td>
                                    <td>${s.count}</td>
                                    <td class="amount-cell">${formatOMR(s.amount)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`}
            </div>
            <div class="card">
                <div class="card-header"><h3>Expenses by Category</h3></div>
                ${pl.expenses_by_category.length === 0 ? '<p style="color:var(--text-muted)">No expenses in period</p>' : `
                <div class="table-container">
                    <table>
                        <thead><tr><th>Category</th><th>Count</th><th>Amount (OMR)</th></tr></thead>
                        <tbody>
                            ${pl.expenses_by_category.map(e => `
                                <tr>
                                    <td>${esc(e.category)}</td>
                                    <td>${e.count}</td>
                                    <td class="amount-cell">${formatOMR(e.amount)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`}
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h3>Cash Flow by Payment Method</h3></div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px">
                <div>
                    <h4 style="font-size:14px; margin-bottom:8px; color:var(--accent)">Income</h4>
                    ${cashflow.income_by_method.length === 0 ? '<p style="color:var(--text-muted)">No data</p>' :
                      cashflow.income_by_method.map(m => `
                        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border)">
                            <span>${paymentBadge(m.method)}</span>
                            <span class="amount-cell">${formatOMR(m.amount)}</span>
                        </div>
                      `).join('')}
                </div>
                <div>
                    <h4 style="font-size:14px; margin-bottom:8px; color:var(--danger)">Expenses</h4>
                    ${cashflow.expenses_by_method.length === 0 ? '<p style="color:var(--text-muted)">No data</p>' :
                      cashflow.expenses_by_method.map(m => `
                        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border)">
                            <span>${paymentBadge(m.method)}</span>
                            <span class="amount-cell">${formatOMR(m.amount)}</span>
                        </div>
                      `).join('')}
                </div>
            </div>
        </div>`;

    // Employee activity report (owner only)
    if (empReport && empReport.employees) {
        html += `
        <div class="card">
            <div class="card-header"><h3>Employee Activity</h3></div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Role</th>
                            <th>Sales Count</th>
                            <th>Sales Total (OMR)</th>
                            <th>Expense Count</th>
                            <th>Expense Total (OMR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${empReport.employees.map(e => `
                            <tr>
                                <td>${esc(e.employee_name)}</td>
                                <td><span class="badge badge-${e.role}">${e.role}</span></td>
                                <td>${e.sales_count}</td>
                                <td class="amount-cell">${formatOMR(e.sales_total)}</td>
                                <td>${e.expenses_count}</td>
                                <td class="amount-cell">${formatOMR(e.expenses_total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    document.getElementById('report-content').innerHTML = html;
}

function exportExcel(reportType) {
    const from = document.getElementById('report-from')?.value || monthStartStr();
    const to = document.getElementById('report-to')?.value || todayStr();
    window.open(`/api/reports/export/excel?report_type=${reportType}&date_from=${from}&date_to=${to}`, '_blank');
}

// ── Audit Log Page ──────────────────────────────────────────────────────────

async function loadAudit() {
    const content = document.getElementById('page-content');

    try {
        const logs = await api('/api/audit?limit=200');
        if (logs.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">&#9881;</div>
                    <h3>No audit logs yet</h3>
                    <p>Changes to sales and expenses will appear here</p>
                </div>`;
            return;
        }

        content.innerHTML = `
            <div class="card">
                <div class="card-header"><h3>Change History</h3></div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date/Time</th>
                                <th>User</th>
                                <th>Table</th>
                                <th>Record ID</th>
                                <th>Action</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr>
                                    <td style="white-space:nowrap">${formatDateTime(log.created_at)}</td>
                                    <td>${esc(log.user_name)}</td>
                                    <td>${esc(log.table_name)}</td>
                                    <td>#${log.record_id}</td>
                                    <td><span class="audit-action ${log.action}">${log.action}</span></td>
                                    <td>
                                        <button class="btn btn-sm btn-outline" onclick="showAuditDetail(${log.id}, '${esc(log.old_values || '').replace(/'/g, "\\'")}', '${esc(log.new_values || '').replace(/'/g, "\\'")}')">View</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    } catch (err) {
        content.innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
    }
}

function showAuditDetail(id, oldVal, newVal) {
    let oldObj = null, newObj = null;
    try { oldObj = oldVal ? JSON.parse(oldVal) : null; } catch (e) {}
    try { newObj = newVal ? JSON.parse(newVal) : null; } catch (e) {}

    let html = '';
    if (oldObj) {
        html += '<h4 style="margin-bottom:8px">Previous Values:</h4><pre style="background:var(--bg); padding:12px; border-radius:4px; font-size:12px; overflow-x:auto; margin-bottom:16px">' + esc(JSON.stringify(oldObj, null, 2)) + '</pre>';
    }
    if (newObj) {
        html += '<h4 style="margin-bottom:8px">New Values:</h4><pre style="background:var(--bg); padding:12px; border-radius:4px; font-size:12px; overflow-x:auto">' + esc(JSON.stringify(newObj, null, 2)) + '</pre>';
    }
    if (!html) html = '<p>No details available</p>';

    openModal(`Audit Log #${id}`, html);
}

// ── Users Management Page ───────────────────────────────────────────────────

async function loadUsers() {
    const content = document.getElementById('page-content');

    try {
        const users = await api('/api/users');

        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Manage Users</h3>
                    <button class="btn btn-accent" onclick="openUserForm()">+ Add User</button>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr style="${!u.is_active ? 'opacity:0.5' : ''}">
                                    <td>${esc(u.full_name)}</td>
                                    <td><code>${esc(u.username)}</code></td>
                                    <td><span class="badge badge-${u.role}">${u.role}</span></td>
                                    <td>${u.is_active ? '<span style="color:var(--success)">Active</span>' : '<span style="color:var(--danger)">Inactive</span>'}</td>
                                    <td>${formatDateTime(u.created_at)}</td>
                                    <td>
                                        <div class="btn-group">
                                            <button class="btn btn-sm btn-outline" onclick="openUserForm(${u.id})">Edit</button>
                                            ${u.id !== currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="deactivateUser(${u.id}, '${esc(u.full_name)}')">${u.is_active ? 'Deactivate' : 'Already Inactive'}</button>` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    } catch (err) {
        content.innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
    }
}

async function openUserForm(userId = null) {
    let user = null;
    if (userId) {
        try {
            const users = await api('/api/users');
            user = users.find(u => u.id === userId);
        } catch (e) { toast(e.message, 'error'); return; }
    }

    const html = `
        <form id="user-form" onsubmit="return saveUser(event, ${userId || 'null'})">
            <div class="form-group">
                <label>Full Name *</label>
                <input type="text" name="full_name" value="${esc(user?.full_name || '')}" required placeholder="e.g. Ahmed Al-Rashdi">
            </div>
            <div class="form-group">
                <label>Username *</label>
                <input type="text" name="username" value="${esc(user?.username || '')}" ${userId ? 'disabled' : 'required'} placeholder="e.g. ahmed">
            </div>
            <div class="form-group">
                <label>${userId ? 'New Password (leave empty to keep current)' : 'Password *'}</label>
                <input type="password" name="password" ${userId ? '' : 'required'} minlength="4" placeholder="Min 4 characters">
            </div>
            <div class="form-group">
                <label>Role *</label>
                <select name="role" required>
                    <option value="employee" ${user?.role === 'employee' ? 'selected' : ''}>Employee</option>
                    <option value="owner" ${user?.role === 'owner' ? 'selected' : ''}>Owner</option>
                </select>
            </div>
            ${userId ? `
            <div class="form-group">
                <label>Status</label>
                <select name="is_active">
                    <option value="true" ${user?.is_active ? 'selected' : ''}>Active</option>
                    <option value="false" ${!user?.is_active ? 'selected' : ''}>Inactive</option>
                </select>
            </div>` : ''}
            <div style="margin-top:20px; display:flex; gap:8px; justify-content:flex-end">
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${userId ? 'Update User' : 'Create User'}</button>
            </div>
        </form>`;

    openModal(userId ? 'Edit User' : 'New User', html);
}

async function saveUser(e, userId) {
    e.preventDefault();
    const form = e.target;
    const data = {
        full_name: form.full_name.value,
        role: form.role.value,
    };
    if (!userId) data.username = form.username.value;
    if (form.password.value) data.password = form.password.value;
    if (userId && form.is_active) data.is_active = form.is_active.value === 'true';

    try {
        if (userId) {
            await api(`/api/users/${userId}`, { method: 'PUT', body: data });
            toast('User updated');
        } else {
            await api('/api/users', { method: 'POST', body: data });
            toast('User created');
        }
        closeModal();
        loadUsers();
    } catch (err) {
        toast(err.message, 'error');
    }
    return false;
}

async function deactivateUser(id, name) {
    if (!confirm(`Deactivate user "${name}"?`)) return;
    try {
        await api(`/api/users/${id}`, { method: 'DELETE' });
        toast(`User ${name} deactivated`);
        loadUsers();
    } catch (err) {
        toast(err.message, 'error');
    }
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
    try {
        const user = await api('/api/auth/me');
        currentUser = user;
        showApp();
    } catch (e) {
        showLogin();
    }
}

init();
