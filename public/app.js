/**
 * ===================================================
 * WALLET - CLIENT APPLICATION LOGIC
 * Linear / Vercel Dark Aesthetic
 * ===================================================
 */

// DOM Elements: Header & User
const userDisplay = document.getElementById('user-display');
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');

// DOM Elements: Summary Cards
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const savingsRateEl = document.getElementById('savings-rate');
const savingsProgressEl = document.getElementById('savings-progress');

// DOM Elements: Form
const form = document.getElementById('transaction-form');
const textInput = document.getElementById('text');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const btnTypeIncome = document.getElementById('btn-type-income');
const btnTypeExpense = document.getElementById('btn-type-expense');

// DOM Elements: History & Controls
const historyList = document.getElementById('list');
const historySearch = document.getElementById('history-search');
const historySort = document.getElementById('history-sort');
const filterPillAll = document.getElementById('filter-pill-all');
const filterPillIncome = document.getElementById('filter-pill-income');
const filterPillExpense = document.getElementById('filter-pill-expense');
const historyEmptyState = document.getElementById('history-empty-state');
const deleteAllBtn = document.getElementById('delete-all-btn');

// DOM Elements: Sidebar & Recycle Bin
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const yearList = document.getElementById('year-list');
const monthList = document.getElementById('month-list');

const openBinBtn = document.getElementById('open-bin-btn');
const closeBinBtn = document.getElementById('close-bin-btn');
const binModal = document.getElementById('bin-modal');
const binList = document.getElementById('bin-list');
const binEmptyMsg = document.getElementById('bin-empty-msg');

// DOM Elements: Widgets & Charts
const chartEmptyState = document.getElementById('chart-empty-state');
const breakdownEmptyState = document.getElementById('breakdown-empty-state');
const donutCenterStat = document.getElementById('donut-center-stat');
const donutTotalSpent = document.getElementById('donut-total-spent');
const categoryLegend = document.getElementById('category-legend');

const budgetStatusPill = document.getElementById('budget-status-pill');
const budgetPercentEl = document.getElementById('budget-percent');
const budgetProgressEl = document.getElementById('budget-progress');
const budgetMessageEl = document.getElementById('budget-status-message');
const highestExpenseEl = document.getElementById('highest-expense');
const avgExpenseEl = document.getElementById('avg-expense');

const recentList = document.getElementById('recent-list');
const miniCalendar = document.getElementById('mini-calendar');
const calendarFeedback = document.getElementById('calendar-selected-feedback');
const calSelectedText = document.getElementById('cal-selected-text');
const calClearBtn = document.getElementById('cal-clear-btn');

// Global State
let transactions = [];
let deletedTransactions = [];

let currentDate = new Date();
let selectedYear = currentDate.getFullYear();
let selectedMonth = currentDate.getMonth(); // 0-11, 'all', or 'lifetime'
let selectedDashboardDate = null; // 'YYYY-MM-DD' or null

let historyTypeFilter = 'all'; // 'all', 'income', 'expense'
let historySearchTerm = '';
let historySortOption = 'newest';

let chartTimeRange = 'ALL'; // 'ALL', '7D', '1M', '3M', '6M', '1Y'

let incomeExpenseChart = null;
let expenseChart = null;

const API_URL = '/api/transactions';

// Category Definitions with Icons and Harmonious Colors
const CATEGORY_MAP = {
    'Food': { icon: 'fa-utensils', color: '#FF7849', label: 'Food & Dining' },
    'Transport': { icon: 'fa-car', color: '#3B82F6', label: 'Transportation' },
    'Shopping': { icon: 'fa-bag-shopping', color: '#EC4899', label: 'Shopping' },
    'Bills': { icon: 'fa-receipt', color: '#EAB308', label: 'Bills & Utilities' },
    'Entertainment': { icon: 'fa-film', color: '#A855F7', label: 'Entertainment' },
    'Health': { icon: 'fa-heart-pulse', color: '#10B981', label: 'Health & Fitness' },
    'Investment': { icon: 'fa-arrow-trend-up', color: '#06B6D4', label: 'Investment' },
    'Salary': { icon: 'fa-briefcase', color: '#00D9C0', label: 'Salary/Income' },
    'General': { icon: 'fa-wallet', color: '#8B5CF6', label: 'General' }
};

function getCategoryInfo(cat) {
    return CATEGORY_MAP[cat] || { icon: 'fa-tag', color: '#9996A3', label: cat || 'General' };
}

// Currency Formatter
function formatCurrency(amount) {
    const num = Math.abs(Number(amount) || 0);
    return '₹' + num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ===================================================
// DATA FETCHING (PRESERVED BACKEND ENDPOINTS)
// ===================================================
async function getTransactions() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        transactions = data.data || [];

        await getDeletedTransactions();
        init();
    } catch (err) {
        console.error('Error fetching transactions:', err);
    }
}

async function getDeletedTransactions() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/bin`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        deletedTransactions = data.data || [];
    } catch (err) {
        console.error('Error fetching recycle bin:', err);
    }
}

// ===================================================
// SIDEBAR & RECYCLE BIN CONTROLS
// ===================================================
toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');
});

function closeSidebar() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

closeSidebarBtn.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

function renderYears() {
    yearList.innerHTML = '';
    const currentY = new Date().getFullYear();
    const years = transactions.map(t => new Date(t.date || t.createdAt).getFullYear());
    const minYear = years.length > 0 ? Math.min(...years, currentY) : currentY;

    for (let y = currentY; y >= minYear; y--) {
        const li = document.createElement('li');
        li.innerText = y;
        if (y === selectedYear) li.classList.add('active');
        li.addEventListener('click', () => {
            selectedYear = y;
            renderYears();
            syncDateInput();
            updateValues();
            renderHistoryDOM();
            closeSidebar();
        });
        yearList.appendChild(li);
    }
}

function initMonthSelection() {
    const months = monthList.querySelectorAll('li');
    months.forEach(li => {
        li.classList.remove('active');
        const monthVal = li.getAttribute('data-month');

        if (monthVal === 'lifetime' && selectedMonth === 'lifetime') {
            li.classList.add('active');
        } else if (monthVal === 'all' && selectedMonth === 'all') {
            li.classList.add('active');
        } else if (parseInt(monthVal) === selectedMonth) {
            li.classList.add('active');
        }

        li.addEventListener('click', (e) => {
            const val = li.getAttribute('data-month');
            if (val === 'lifetime') {
                selectedMonth = 'lifetime';
            } else if (val === 'all') {
                selectedMonth = 'all';
            } else {
                selectedMonth = parseInt(val);
            }

            initMonthSelection();
            syncDateInput();
            updateValues();
            renderHistoryDOM();
            closeSidebar();
        });
    });
}

// Recycle Bin UI
openBinBtn.addEventListener('click', () => {
    closeSidebar();
    renderBin();
    binModal.classList.add('active');
});

closeBinBtn.addEventListener('click', () => {
    binModal.classList.remove('active');
});

function renderBin() {
    binList.innerHTML = '';
    if (!deletedTransactions || deletedTransactions.length === 0) {
        binEmptyMsg.style.display = 'flex';
    } else {
        binEmptyMsg.style.display = 'none';
        deletedTransactions.forEach(item => {
            const isExp = item.amount < 0;
            const catInfo = getCategoryInfo(item.category);
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="hist-left">
                    <div class="hist-cat-icon ${isExp ? 'exp' : 'inc'}">
                        <i class="fa-solid ${catInfo.icon}"></i>
                    </div>
                    <div class="hist-info">
                        <h4>${escapeHTML(item.text)}</h4>
                        <div class="hist-meta">
                            <span class="hist-category-tag">${catInfo.label}</span>
                            <span>${new Date(item.date || item.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div class="hist-right">
                    <span class="hist-amount ${isExp ? 'exp' : 'inc'}">${isExp ? '-' : '+'}${formatCurrency(item.amount)}</span>
                    <div class="bin-actions">
                        <button class="restore-btn" onclick="restoreTransaction('${item._id}')" title="Restore"><i class="fa-solid fa-rotate-left"></i> Restore</button>
                        <button class="perm-delete-btn" onclick="eliminateTransaction('${item._id}')" title="Delete permanently"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            binList.appendChild(li);
        });
    }
}

// Sync Date Input default
function syncDateInput() {
    const today = new Date();
    let d = today;

    if (selectedYear !== today.getFullYear()) {
        d = new Date(selectedYear, 0, 1);
    }
    if (typeof selectedMonth === 'number') {
        if (selectedYear === today.getFullYear() && selectedMonth === today.getMonth()) {
            d = today;
        } else {
            d = new Date(selectedYear, selectedMonth, 1);
        }
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
}

// ===================================================
// ADD TRANSACTION LOGIC
// ===================================================
// Segmented Toggle Behavior
btnTypeIncome.addEventListener('click', () => {
    btnTypeIncome.classList.add('active');
    btnTypeExpense.classList.remove('active');
    btnTypeIncome.querySelector('input').checked = true;
});

btnTypeExpense.addEventListener('click', () => {
    btnTypeExpense.classList.add('active');
    btnTypeIncome.classList.remove('active');
    btnTypeExpense.querySelector('input').checked = true;
});

async function addTransaction(e) {
    e.preventDefault();

    if (textInput.value.trim() === '' || amountInput.value.trim() === '') {
        alert('Please provide a description and amount.');
        return;
    }

    if (!dateInput.value) {
        alert('Please select a date.');
        return;
    }

    const typeRadio = document.querySelector('input[name="type"]:checked');
    const type = typeRadio ? typeRadio.value : 'income';
    const amountValue = +amountInput.value;
    const finalAmount = type === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue);

    const [y, m, d] = dateInput.value.split('-').map(Number);
    const selectedDate = new Date(y, m - 1, d);

    const newTransaction = {
        text: textInput.value.trim(),
        amount: finalAmount,
        type: type,
        category: categoryInput.value,
        date: selectedDate.toISOString(),
        month: selectedDate.getMonth(),
        year: selectedDate.getFullYear()
    };

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newTransaction)
        });

        const data = await res.json();
        if (data.success && data.data) {
            transactions.push(data.data);
            updateValues();
            renderHistoryDOM();
            renderYears();

            textInput.value = '';
            amountInput.value = '';
        } else {
            alert(data.error || 'Failed to add transaction');
        }
    } catch (err) {
        console.error('Error adding transaction:', err);
    }
}

// ===================================================
// TRANSACTION ACTIONS (Soft delete, Restore, Delete Permanent)
// ===================================================
async function removeTransaction(id) {
    if (confirm('Move this transaction to the Recycle Bin?')) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const transactionToDelete = transactions.find(t => t._id === id);
            if (transactionToDelete) {
                deletedTransactions.push(transactionToDelete);
                transactions = transactions.filter(t => t._id !== id);
                updateValues();
                renderHistoryDOM();
                renderYears();
            }
        } catch (err) {
            console.error('Error deleting transaction:', err);
        }
    }
}

async function restoreTransaction(id) {
    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/restore/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const transactionToRestore = deletedTransactions.find(t => t._id === id);
        if (transactionToRestore) {
            transactions.push(transactionToRestore);
            deletedTransactions = deletedTransactions.filter(t => t._id !== id);
            updateValues();
            renderHistoryDOM();
            renderBin();
            renderYears();
        }
    } catch (err) {
        console.error('Error restoring transaction:', err);
    }
}

async function eliminateTransaction(id) {
    if (confirm('Permanently delete this transaction? This cannot be undone.')) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/permanent/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            deletedTransactions = deletedTransactions.filter(t => t._id !== id);
            renderBin();
        } catch (err) {
            console.error('Error eliminating transaction:', err);
        }
    }
}

async function deleteAllTransactions() {
    if (confirm('Are you sure you want to move ALL transactions to the Recycle Bin?')) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/all`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (data.success) {
                const active = transactions.filter(t => !t.isDeleted);
                deletedTransactions = [...deletedTransactions, ...active];
                transactions = [];
                updateValues();
                renderHistoryDOM();
                renderBin();
            }
        } catch (err) {
            console.error('Error deleting all transactions:', err);
        }
    }
}

if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', deleteAllTransactions);
}

// ===================================================
// FILTERING & VALUE CALCULATIONS
// ===================================================
function getFilteredTransactions() {
    let filtered = [];

    // Date Filter Priority: Specific Calendar Date > Month / Year > Lifetime
    if (selectedDashboardDate) {
        filtered = transactions.filter(t => {
            const tDate = new Date(t.date || t.createdAt);
            const tY = tDate.getFullYear();
            const tM = String(tDate.getMonth() + 1).padStart(2, '0');
            const tD = String(tDate.getDate()).padStart(2, '0');
            return `${tY}-${tM}-${tD}` === selectedDashboardDate;
        });
    } else if (selectedMonth === 'lifetime') {
        filtered = transactions;
    } else {
        filtered = transactions.filter(t => {
            const tDate = new Date(t.date || t.createdAt);
            const yearMatch = tDate.getFullYear() === selectedYear;
            if (selectedMonth === 'all') {
                return yearMatch;
            } else {
                return yearMatch && tDate.getMonth() === selectedMonth;
            }
        });
    }
    return filtered;
}

function updateValues() {
    const filtered = getFilteredTransactions();

    // Determine Period Label
    let periodText = 'Lifetime Wallet';
    if (selectedDashboardDate) {
        const dObj = new Date(selectedDashboardDate + 'T00:00:00');
        periodText = dObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (selectedMonth === 'all') {
        periodText = `Entire Year ${selectedYear}`;
    } else if (typeof selectedMonth === 'number') {
        const mName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'short' });
        periodText = `${mName} ${selectedYear}`;
    }

    document.querySelectorAll('.period').forEach(el => {
        el.innerText = periodText;
    });

    const amounts = filtered.map(t => t.amount);
    const total = amounts.reduce((acc, item) => (acc += item), 0);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
    const expense = Math.abs(amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0));

    // Update Summary Elements
    balanceEl.innerText = (total < 0 ? '-' : '') + formatCurrency(total);
    incomeEl.innerText = '+' + formatCurrency(income);
    expenseEl.innerText = '-' + formatCurrency(expense);

    // Savings Rate
    const savings = income - expense;
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;
    savingsRateEl.innerText = `${savingsRate}%`;
    savingsProgressEl.style.width = `${Math.max(0, Math.min(100, savingsRate))}%`;

    // Render Sub-components
    renderCharts(filtered);
    renderStats(filtered, income, expense);
    renderRecentActivity();
    renderCalendar();
}

// ===================================================
// CHARTS (INCOME VS EXPENSE & EXPENSE DONUT)
// ===================================================
function renderCharts(currentTransactions) {
    // 1. Income vs Expense Trend Chart (Filterable by chartTimeRange)
    renderTrendChart(currentTransactions);

    // 2. Expense Breakdown Donut Chart
    renderExpenseBreakdown(currentTransactions);
}

function renderTrendChart(currentTransactions) {
    const canvas = document.getElementById('incomeExpenseChart');
    const ctx = canvas.getContext('2d');

    // Apply Time Range Filter for Trend Chart if specified
    let chartTransactions = [...currentTransactions];
    const now = new Date();

    if (chartTimeRange === '7D') {
        const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        chartTransactions = chartTransactions.filter(t => new Date(t.date || t.createdAt) >= cutoff);
    } else if (chartTimeRange === '1M') {
        const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        chartTransactions = chartTransactions.filter(t => new Date(t.date || t.createdAt) >= cutoff);
    } else if (chartTimeRange === '3M') {
        const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        chartTransactions = chartTransactions.filter(t => new Date(t.date || t.createdAt) >= cutoff);
    } else if (chartTimeRange === '6M') {
        const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        chartTransactions = chartTransactions.filter(t => new Date(t.date || t.createdAt) >= cutoff);
    } else if (chartTimeRange === '1Y') {
        const cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        chartTransactions = chartTransactions.filter(t => new Date(t.date || t.createdAt) >= cutoff);
    }

    const expenses = chartTransactions.filter(t => t.type === 'expense');
    const income = chartTransactions.filter(t => t.type === 'income');
    const totalIncome = income.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const totalExpense = expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);

    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    if (chartTransactions.length === 0) {
        canvas.style.display = 'none';
        chartEmptyState.style.display = 'flex';
        return;
    } else {
        canvas.style.display = 'block';
        chartEmptyState.style.display = 'none';
    }

    incomeExpenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                label: 'Amount (₹)',
                data: [totalIncome, totalExpense],
                backgroundColor: [
                    '#00D9C0',
                    '#FF5C72'
                ],
                borderRadius: 8,
                borderSkipped: false,
                barPercentage: 0.45
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#17171B',
                    titleColor: '#F4F1F8',
                    bodyColor: '#9996A3',
                    borderColor: '#30303A',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function (ctx) {
                            return ' ' + ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#66636E',
                        font: { family: 'Inter', size: 11 },
                        callback: function (val) {
                            return '₹' + val.toLocaleString('en-IN');
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#9996A3',
                        font: { family: 'Inter', size: 12, weight: '500' }
                    }
                }
            }
        }
    });
}

function renderExpenseBreakdown(currentTransactions) {
    const canvas = document.getElementById('expenseChart');
    const ctx = canvas.getContext('2d');

    const expenses = currentTransactions.filter(t => t.type === 'expense');
    const totalExpVal = expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);

    if (expenseChart) {
        expenseChart.destroy();
    }

    if (expenses.length === 0) {
        canvas.style.display = 'none';
        donutCenterStat.style.display = 'none';
        categoryLegend.innerHTML = '';
        breakdownEmptyState.style.display = 'flex';
        return;
    } else {
        canvas.style.display = 'block';
        donutCenterStat.style.display = 'block';
        breakdownEmptyState.style.display = 'none';
    }

    // Aggregate by Category
    const catTotals = {};
    expenses.forEach(t => {
        const cat = t.category || 'General';
        catTotals[cat] = (catTotals[cat] || 0) + Math.abs(t.amount);
    });

    const labels = Object.keys(catTotals);
    const data = Object.values(catTotals);
    const colors = labels.map(cat => getCategoryInfo(cat).color);

    // Update Donut Center Stat
    donutTotalSpent.innerText = formatCurrency(totalExpVal);

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#17171B',
                    titleColor: '#F4F1F8',
                    bodyColor: '#9996A3',
                    borderColor: '#30303A',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function (ctx) {
                            const val = ctx.parsed;
                            const pct = totalExpVal > 0 ? ((val / totalExpVal) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${formatCurrency(val)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });

    // Populate Legend List
    categoryLegend.innerHTML = '';
    labels.forEach((cat, idx) => {
        const amount = data[idx];
        const pct = totalExpVal > 0 ? ((amount / totalExpVal) * 100).toFixed(0) : 0;
        const info = getCategoryInfo(cat);

        const li = document.createElement('li');
        li.className = 'category-legend-item';
        li.innerHTML = `
            <div class="cat-left">
                <span class="cat-dot" style="background-color: ${info.color};"></span>
                <span>${info.label}</span>
            </div>
            <div class="cat-right">
                <span class="cat-amt">${formatCurrency(amount)}</span>
                <span class="cat-pct">${pct}%</span>
            </div>
        `;

        // Interactive: click category to filter history
        li.addEventListener('click', () => {
            historySearch.value = cat;
            historySearchTerm = cat.toLowerCase();
            renderHistoryDOM();
        });

        categoryLegend.appendChild(li);
    });
}

// Time Range Selector Hook
const timeButtons = document.querySelectorAll('#chart-time-selectors .time-pill-btn');
timeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        timeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chartTimeRange = btn.getAttribute('data-range');
        renderTrendChart(getFilteredTransactions());
    });
});

// ===================================================
// WIDGETS: BUDGET HEALTH, RECENT ACTIVITY, CALENDAR
// ===================================================
function renderStats(currentTransactions, totalIncVal, totalExpVal) {
    // Budget Progress (Using Income as baseline budget)
    let budgetPercent = 0;
    if (totalIncVal > 0) {
        budgetPercent = Math.round((totalExpVal / totalIncVal) * 100);
    } else if (totalExpVal > 0) {
        budgetPercent = 100;
    }

    budgetPercentEl.innerText = `${budgetPercent}%`;
    budgetProgressEl.style.width = `${Math.min(100, budgetPercent)}%`;

    // Dynamic Status States
    if (budgetPercent <= 70) {
        budgetStatusPill.className = 'budget-status-pill status-under';
        budgetStatusPill.innerText = 'Under Control';
        budgetProgressEl.style.backgroundColor = 'var(--savings-green)';
        budgetMessageEl.innerText = `You've utilized ${budgetPercent}% of your income. Great pacing!`;
    } else if (budgetPercent <= 95) {
        budgetStatusPill.className = 'budget-status-pill status-warning';
        budgetStatusPill.innerText = 'Caution';
        budgetProgressEl.style.backgroundColor = 'var(--warning-amber)';
        budgetMessageEl.innerText = `You've utilized ${budgetPercent}% of your income. Spending is moderate.`;
    } else {
        budgetStatusPill.className = 'budget-status-pill status-over';
        budgetStatusPill.innerText = 'Over Budget';
        budgetProgressEl.style.backgroundColor = 'var(--expense-coral)';
        const overAmt = totalExpVal - totalIncVal;
        budgetMessageEl.innerText = overAmt > 0
            ? `Expenses exceeded income by ${formatCurrency(overAmt)}.`
            : `You've reached 100% of your income benchmark.`;
    }

    // Quick Stats
    const expenses = currentTransactions.filter(t => t.type === 'expense');
    const amounts = expenses.map(t => Math.abs(t.amount));
    const highest = amounts.length > 0 ? Math.max(...amounts) : 0;
    const avg = amounts.length > 0 ? (totalExpVal / amounts.length) : 0;

    highestExpenseEl.innerText = formatCurrency(highest);
    avgExpenseEl.innerText = formatCurrency(avg);
}

function renderRecentActivity() {
    const sorted = [...transactions]
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
        .slice(0, 4);

    recentList.innerHTML = '';
    if (sorted.length === 0) {
        recentList.innerHTML = `
            <li class="empty-state-card" style="padding: 20px 0;">
                <div class="empty-icon-wrap" style="width: 36px; height: 36px; font-size: 1rem;"><i class="fa-solid fa-sparkles"></i></div>
                <div class="empty-state-title" style="font-size: 0.82rem;">No recent activity</div>
                <div class="empty-state-desc">Transactions will appear here as you log them.</div>
            </li>
        `;
        return;
    }

    sorted.forEach(t => {
        const isExp = t.amount < 0;
        const catInfo = getCategoryInfo(t.category);
        const li = document.createElement('li');
        li.className = 'recent-activity-item';
        li.innerHTML = `
            <div class="rec-left">
                <div class="rec-icon ${isExp ? 'exp' : 'inc'}">
                    <i class="fa-solid ${catInfo.icon}"></i>
                </div>
                <div class="rec-details">
                    <h4>${escapeHTML(t.text)}</h4>
                    <small>${catInfo.label} · ${new Date(t.date || t.createdAt).toLocaleDateString()}</small>
                </div>
            </div>
            <span class="rec-amount ${isExp ? 'exp' : 'inc'}">
                ${isExp ? '-' : '+'}${formatCurrency(t.amount)}
            </span>
        `;
        recentList.appendChild(li);
    });
}

function renderCalendar() {
    miniCalendar.innerHTML = '';

    // Headers: S M T W T F S
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    days.forEach(d => {
        const div = document.createElement('div');
        div.className = 'cal-head-cell';
        div.innerText = d;
        miniCalendar.appendChild(div);
    });

    const now = new Date();
    // Default to currently selected year/month or active today
    const viewYear = (typeof selectedMonth === 'number') ? selectedYear : now.getFullYear();
    const viewMonth = (typeof selectedMonth === 'number') ? selectedMonth : now.getMonth();

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Empty lead slots
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'cal-cell';
        emptyDiv.style.visibility = 'hidden';
        miniCalendar.appendChild(emptyDiv);
    }

    // Map transactions in this month to day numbers
    const dayActivity = {};
    transactions.forEach(t => {
        const d = new Date(t.date || t.createdAt);
        if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
            const dayNum = d.getDate();
            if (!dayActivity[dayNum]) dayActivity[dayNum] = { hasInc: false, hasExp: false };
            if (t.amount > 0) dayActivity[dayNum].hasInc = true;
            if (t.amount < 0) dayActivity[dayNum].hasExp = true;
        }
    });

    // Calendar Day Cells
    for (let i = 1; i <= daysInMonth; i++) {
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        cell.innerText = i;

        const mStr = String(viewMonth + 1).padStart(2, '0');
        const dStr = String(i).padStart(2, '0');
        const dateStr = `${viewYear}-${mStr}-${dStr}`;

        // Today highlight
        if (i === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear()) {
            cell.classList.add('today');
        }

        // Active selection
        if (selectedDashboardDate === dateStr) {
            cell.classList.add('active-selected');
        }

        // Add transaction dots
        if (dayActivity[i]) {
            const markerWrap = document.createElement('div');
            markerWrap.className = 'cal-marker';
            if (dayActivity[i].hasInc) {
                const dotInc = document.createElement('span');
                dotInc.className = 'cal-dot-inc';
                markerWrap.appendChild(dotInc);
            }
            if (dayActivity[i].hasExp) {
                const dotExp = document.createElement('span');
                dotExp.className = 'cal-dot-exp';
                markerWrap.appendChild(dotExp);
            }
            cell.appendChild(markerWrap);
        }

        // Click interaction: select date
        cell.addEventListener('click', () => {
            if (selectedDashboardDate === dateStr) {
                selectedDashboardDate = null;
                calendarFeedback.style.display = 'none';
            } else {
                selectedDashboardDate = dateStr;
                calSelectedText.innerText = `Filtered to: ${new Date(dateStr + 'T00:00:00').toLocaleDateString()}`;
                calendarFeedback.style.display = 'flex';
            }
            updateValues();
            renderHistoryDOM();
            renderCalendar();
        });

        miniCalendar.appendChild(cell);
    }
}

calClearBtn.addEventListener('click', () => {
    selectedDashboardDate = null;
    calendarFeedback.style.display = 'none';
    updateValues();
    renderHistoryDOM();
    renderCalendar();
});

// ===================================================
// HISTORY LIST (SEARCH, FILTERS, SORT)
// ===================================================
function renderHistoryDOM() {
    let listData = getFilteredTransactions();

    // 1. Search Query Filter
    if (historySearchTerm) {
        listData = listData.filter(t =>
            (t.text && t.text.toLowerCase().includes(historySearchTerm)) ||
            (t.category && t.category.toLowerCase().includes(historySearchTerm))
        );
    }

    // 2. Type Filter (All, Income, Expense)
    if (historyTypeFilter === 'income') {
        listData = listData.filter(t => t.amount > 0);
    } else if (historyTypeFilter === 'expense') {
        listData = listData.filter(t => t.amount < 0);
    }

    // 3. Sorting
    listData.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        if (historySortOption === 'newest') return dateB - dateA;
        if (historySortOption === 'oldest') return dateA - dateB;
        if (historySortOption === 'highest') return Math.abs(b.amount) - Math.abs(a.amount);
        if (historySortOption === 'lowest') return Math.abs(a.amount) - Math.abs(b.amount);
        return 0;
    });

    // 4. Render Items
    historyList.innerHTML = '';
    if (listData.length === 0) {
        historyEmptyState.style.display = 'flex';
    } else {
        historyEmptyState.style.display = 'none';
        listData.forEach(transaction => {
            const isExp = transaction.amount < 0;
            const catInfo = getCategoryInfo(transaction.category);
            const tDate = new Date(transaction.date || transaction.createdAt);

            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="hist-left">
                    <div class="hist-cat-icon ${isExp ? 'exp' : 'inc'}">
                        <i class="fa-solid ${catInfo.icon}"></i>
                    </div>
                    <div class="hist-info">
                        <h4>${escapeHTML(transaction.text)}</h4>
                        <div class="hist-meta">
                            <span class="hist-category-tag">${catInfo.label}</span>
                            <span>${tDate.toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div class="hist-right">
                    <span class="hist-amount ${isExp ? 'exp' : 'inc'}">
                        ${isExp ? '-' : '+'}${formatCurrency(transaction.amount)}
                    </span>
                    <button class="hist-delete-btn" onclick="removeTransaction('${transaction._id}')" title="Move to Recycle Bin">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            historyList.appendChild(li);
        });
    }
}

// History Controls Event Listeners
historySearch.addEventListener('input', (e) => {
    historySearchTerm = e.target.value.toLowerCase().trim();
    renderHistoryDOM();
});

historySort.addEventListener('change', (e) => {
    historySortOption = e.target.value;
    renderHistoryDOM();
});

function setHistoryTypeFilter(type) {
    historyTypeFilter = type;
    filterPillAll.classList.toggle('active', type === 'all');
    filterPillIncome.classList.toggle('active', type === 'income');
    filterPillExpense.classList.toggle('active', type === 'expense');
    renderHistoryDOM();
}

filterPillAll.addEventListener('click', () => setHistoryTypeFilter('all'));
filterPillIncome.addEventListener('click', () => setHistoryTypeFilter('income'));
filterPillExpense.addEventListener('click', () => setHistoryTypeFilter('expense'));

// Click Summary Cards to Filter History
document.getElementById('card-filter-balance').addEventListener('click', () => setHistoryTypeFilter('all'));
document.getElementById('card-filter-income').addEventListener('click', () => setHistoryTypeFilter('income'));
document.getElementById('card-filter-expense').addEventListener('click', () => setHistoryTypeFilter('expense'));

// Helper to escape HTML and prevent injection
function escapeHTML(str) {
    return String(str || '').replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

// User Profile & Dropdown
const loggedUser = JSON.parse(localStorage.getItem('user'));
if (loggedUser && userDisplay) {
    userDisplay.innerText = `Hello, ${loggedUser.username || 'Himanshu'}`;
}

if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });

    window.addEventListener('click', (e) => {
        if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });
}

// Form Submission
form.addEventListener('submit', addTransaction);

// App Initialization
function init() {
    renderYears();
    initMonthSelection();
    syncDateInput();
    updateValues();
    renderHistoryDOM();
}

// Initial Kickoff
getTransactions();
