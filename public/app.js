/**
 * ===================================================
 * WALLET - CLIENT APPLICATION LOGIC
 * Linear / Vercel Dark Aesthetic
 * ===================================================
 */

// DOM Elements: Header & User
const userDisplay = document.getElementById('user-display');
const userAvatarInitial = document.getElementById('user-avatar-initial');
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const headerSearchInput = document.getElementById('header-search-input');
const openAccountBtn = document.getElementById('open-account-btn');
const openBinFromMenu = document.getElementById('open-bin-from-menu');

// Account Modal Elements
const accountModal = document.getElementById('account-modal');
const closeAccountBtn = document.getElementById('close-account-btn');
const modalAvatarInitial = document.getElementById('modal-avatar-initial');
const modalUsername = document.getElementById('modal-username');
const modalEmail = document.getElementById('modal-email');
const dropdownUsername = document.getElementById('dropdown-username');
const dropdownEmail = document.getElementById('dropdown-email');

// DOM Elements: Summary Cards
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const savingsRateEl = document.getElementById('savings-rate');
const savingsCirclePath = document.getElementById('savings-circle-path');
const savingsRingText = document.getElementById('savings-ring-text');
const cardSubIncome = document.getElementById('card-sub-income');
const cardSubExpense = document.getElementById('card-sub-expense');

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
const yearSelect = document.getElementById('year-select');
const monthList = document.getElementById('month-list');
const periodLifetime = document.getElementById('period-lifetime');
const periodEntireYear = document.getElementById('period-entire-year');
const sideTypeAll = document.getElementById('side-type-all');
const sideTypeInc = document.getElementById('side-type-inc');
const sideTypeExp = document.getElementById('side-type-exp');
const sidebarCategorySelect = document.getElementById('sidebar-category-select');

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

const budgetTargetDisplay = document.getElementById('budget-target-display');
const budgetPercentEl = document.getElementById('budget-percent');
const budgetProgressEl = document.getElementById('budget-progress');
const budgetRemainingText = document.getElementById('budget-remaining-text');
const budgetStatusPill = document.getElementById('budget-status-pill');
const budgetStatusMessage = document.getElementById('budget-status-message');

const recentList = document.getElementById('recent-list');
const miniCalendar = document.getElementById('mini-calendar');
const calMonthTitle = document.getElementById('cal-month-title');
const calPrevMonth = document.getElementById('cal-prev-month');
const calNextMonth = document.getElementById('cal-next-month');
const dayBreakdownTitle = document.getElementById('day-breakdown-title');
const dayTransactionsList = document.getElementById('day-transactions-list');
const dayTransTotal = document.getElementById('day-trans-total');

// Global Application State
let transactions = [];
let deletedTransactions = [];

let currentDate = new Date();
let selectedYear = currentDate.getFullYear();
let selectedMonth = currentDate.getMonth(); // 0-11, 'all', or 'lifetime'
let selectedDashboardDate = null; // 'YYYY-MM-DD' or null

// Calendar view month & year
let calViewYear = currentDate.getFullYear();
let calViewMonth = currentDate.getMonth();

let historyTypeFilter = 'all'; // 'all', 'income', 'expense'
let historySearchTerm = '';
let historySortOption = 'newest';
let sidebarCategoryFilter = '';

let chartTimeRange = '1Y'; // '7D', '1M', '3M', '6M', '1Y', 'ALL'

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
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// Date Formatter: "Sep 5, 2026"
function formatDateMedium(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
// USER PROFILE & ACCOUNT MODAL
// ===================================================
function initUserProfile() {
    const user = JSON.parse(localStorage.getItem('user')) || { username: 'Himanshu', email: 'user@example.com' };
    const initial = (user.username ? user.username.charAt(0) : 'H').toUpperCase();

    if (userDisplay) userDisplay.innerText = `Hello, ${user.username}`;
    if (userAvatarInitial) userAvatarInitial.innerText = initial;
    if (modalAvatarInitial) modalAvatarInitial.innerText = initial;
    if (modalUsername) modalUsername.innerText = user.username;
    if (modalEmail) modalEmail.innerText = user.email || 'user@example.com';
    if (dropdownUsername) dropdownUsername.innerText = user.username;
    if (dropdownEmail) dropdownEmail.innerText = user.email || 'user@example.com';
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

// Open / Close Manage Account Modal
if (openAccountBtn) {
    openAccountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        userDropdown.classList.remove('show');
        accountModal.classList.add('active');
    });
}
if (closeAccountBtn) {
    closeAccountBtn.addEventListener('click', () => {
        accountModal.classList.remove('active');
    });
}
if (openBinFromMenu) {
    openBinFromMenu.addEventListener('click', (e) => {
        e.preventDefault();
        userDropdown.classList.remove('show');
        renderBin();
        binModal.classList.add('active');
    });
}

// Header Search syncs with History Search
if (headerSearchInput) {
    headerSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        historySearch.value = val;
        historySearchTerm = val.toLowerCase().trim();
        renderHistoryDOM();
    });
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
    if (!yearSelect) return;
    yearSelect.innerHTML = '';
    const currentY = new Date().getFullYear();
    const years = transactions.map(t => new Date(t.date || t.createdAt).getFullYear());
    const minYear = years.length > 0 ? Math.min(...years, currentY) : currentY;

    for (let y = currentY; y >= minYear; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.innerText = y;
        if (y === selectedYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    yearSelect.addEventListener('change', (e) => {
        selectedYear = parseInt(e.target.value);
        calViewYear = selectedYear;
        updateValues();
        renderHistoryDOM();
    });
}

function initPeriodAndMonthSelection() {
    if (periodLifetime) {
        periodLifetime.addEventListener('click', () => {
            periodLifetime.classList.add('active');
            periodEntireYear.classList.remove('active');
            selectedMonth = 'lifetime';
            clearMonthActiveUI();
            updateValues();
            renderHistoryDOM();
        });
    }

    if (periodEntireYear) {
        periodEntireYear.addEventListener('click', () => {
            periodEntireYear.classList.add('active');
            periodLifetime.classList.remove('active');
            selectedMonth = 'all';
            clearMonthActiveUI();
            const allItem = monthList.querySelector('li[data-month="all"]');
            if (allItem) allItem.classList.add('active');
            updateValues();
            renderHistoryDOM();
        });
    }

    const months = monthList.querySelectorAll('li');
    months.forEach(li => {
        li.addEventListener('click', (e) => {
            clearMonthActiveUI();
            li.classList.add('active');
            const val = li.getAttribute('data-month');

            periodLifetime.classList.remove('active');
            periodEntireYear.classList.remove('active');

            if (val === 'all') {
                selectedMonth = 'all';
                periodEntireYear.classList.add('active');
            } else {
                selectedMonth = parseInt(val);
                calViewMonth = selectedMonth;
            }

            updateValues();
            renderHistoryDOM();
        });
    });
}

function clearMonthActiveUI() {
    const months = monthList.querySelectorAll('li');
    months.forEach(li => li.classList.remove('active'));
}

// Sidebar Transaction Type Filters
if (sideTypeAll && sideTypeInc && sideTypeExp) {
    sideTypeAll.addEventListener('click', () => {
        sideTypeAll.classList.add('active');
        sideTypeInc.classList.remove('active');
        sideTypeExp.classList.remove('active');
        setHistoryTypeFilter('all');
    });
    sideTypeInc.addEventListener('click', () => {
        sideTypeInc.classList.add('active');
        sideTypeAll.classList.remove('active');
        sideTypeExp.classList.remove('active');
        setHistoryTypeFilter('income');
    });
    sideTypeExp.addEventListener('click', () => {
        sideTypeExp.classList.add('active');
        sideTypeAll.classList.remove('active');
        sideTypeInc.classList.remove('active');
        setHistoryTypeFilter('expense');
    });
}

if (sidebarCategorySelect) {
    sidebarCategorySelect.addEventListener('change', (e) => {
        sidebarCategoryFilter = e.target.value.toLowerCase().trim();
        renderHistoryDOM();
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
            const row = document.createElement('div');
            row.className = 'history-table-row';
            row.style.gridTemplateColumns = '85px 1.5fr 1fr 100px 110px';
            row.innerHTML = `
                <div class="h-col-date">${formatDateMedium(item.date || item.createdAt)}</div>
                <div class="h-col-desc">
                    <div class="h-desc-icon ${isExp ? 'exp' : 'inc'}"><i class="fa-solid ${catInfo.icon}"></i></div>
                    <span class="h-desc-text">${escapeHTML(item.text)}</span>
                </div>
                <div class="h-col-cat">${catInfo.label}</div>
                <div class="h-col-amount ${isExp ? 'exp' : 'inc'}">${isExp ? '-' : '+'}${formatCurrency(item.amount)}</div>
                <div class="h-col-actions">
                    <button class="restore-btn" onclick="restoreTransaction('${item._id}')" title="Restore"><i class="fa-solid fa-rotate-left"></i> Restore</button>
                    <button class="perm-delete-btn" onclick="eliminateTransaction('${item._id}')" title="Delete permanently"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            binList.appendChild(row);
        });
    }
}

// Sync Date Input default
function syncDateInput() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
}

// ===================================================
// ADD TRANSACTION LOGIC
// ===================================================
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
// TRANSACTION ACTIONS (Soft delete, Restore, Permanent Delete)
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
    if (confirm('Are you sure you want to move ALL active transactions to the Recycle Bin?')) {
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
// FILTERING & SUMMARY CARD VALUE CALCULATIONS
// ===================================================
function getFilteredTransactions() {
    let filtered = [];

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

    const amounts = filtered.map(t => t.amount);
    const total = amounts.reduce((acc, item) => (acc += item), 0);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
    const expense = Math.abs(amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0));

    // Update Top Summary Cards
    balanceEl.innerText = (total < 0 ? '-' : '') + formatCurrency(total);
    incomeEl.innerText = '+' + formatCurrency(income);
    expenseEl.innerText = '-' + formatCurrency(expense);

    if (cardSubIncome) cardSubIncome.innerText = formatCurrency(income);
    if (cardSubExpense) cardSubExpense.innerText = formatCurrency(expense);

    // Savings Rate Percentage & Circular SVG Progress
    const savings = income - expense;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
    const clampedSavings = Math.max(0, Math.min(100, savingsRate));

    savingsRateEl.innerText = `${savingsRate}%`;
    if (savingsRingText) savingsRingText.innerText = `${clampedSavings}%`;
    if (savingsCirclePath) {
        savingsCirclePath.setAttribute('stroke-dasharray', `${clampedSavings}, 100`);
    }

    // Render Sub-components
    renderCharts(filtered);
    renderBudgetHealth(filtered, income, expense);
    renderRecentActivity();
    renderCalendar();
    renderDailyBreakdown(selectedDashboardDate || new Date().toISOString().split('T')[0]);
}

// ===================================================
// CHARTS: INCOME VS EXPENSE (SMOOTH CURVE) & DONUT
// ===================================================
function renderCharts(currentTransactions) {
    renderTrendChart();
    renderExpenseBreakdown(currentTransactions);
}

function renderTrendChart() {
    const canvas = document.getElementById('incomeExpenseChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    if (!transactions || transactions.length === 0) {
        canvas.style.display = 'none';
        chartEmptyState.style.display = 'flex';
        return;
    } else {
        canvas.style.display = 'block';
        chartEmptyState.style.display = 'none';
    }

    const now = new Date();
    let labels = [];
    let incomeData = [];
    let expenseData = [];
    let tooltipTitles = [];

    if (chartTimeRange === '7D') {
        // Last 7 days ending today
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayNum = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${dayNum}`;

            const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
            labels.push(`${weekday} ${d.getDate()}`);
            tooltipTitles.push(d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }));

            let inc = 0;
            let exp = 0;
            transactions.forEach(t => {
                const td = new Date(t.date || t.createdAt);
                const ty = td.getFullYear();
                const tm = String(td.getMonth() + 1).padStart(2, '0');
                const tday = String(td.getDate()).padStart(2, '0');
                if (`${ty}-${tm}-${tday}` === dateStr) {
                    if (t.amount > 0) inc += Math.abs(t.amount);
                    if (t.amount < 0) exp += Math.abs(t.amount);
                }
            });
            incomeData.push(inc);
            expenseData.push(exp);
        }
    } else if (chartTimeRange === '1M') {
        // Whole Month: 5 weekly buckets across the current/selected month
        const targetYear = (selectedMonth !== 'all' && selectedMonth !== 'lifetime') ? selectedYear : now.getFullYear();
        const targetMonth = (selectedMonth !== 'all' && selectedMonth !== 'lifetime') ? selectedMonth : now.getMonth();
        const totalDays = new Date(targetYear, targetMonth + 1, 0).getDate();
        const monthShort = new Date(targetYear, targetMonth, 1).toLocaleDateString('en-US', { month: 'short' });
        const monthLong = new Date(targetYear, targetMonth, 1).toLocaleDateString('en-US', { month: 'long' });

        const weekBuckets = [
            { start: 1, end: 7, label: `${monthShort} 1-7`, title: `${monthLong} 1st - 7th, ${targetYear}` },
            { start: 8, end: 14, label: `${monthShort} 8-14`, title: `${monthLong} 8th - 14th, ${targetYear}` },
            { start: 15, end: 21, label: `${monthShort} 15-21`, title: `${monthLong} 15th - 21st, ${targetYear}` },
            { start: 22, end: 28, label: `${monthShort} 22-28`, title: `${monthLong} 22nd - 28th, ${targetYear}` },
            { start: 29, end: totalDays, label: `${monthShort} 29-${totalDays}`, title: `${monthLong} 29th - ${totalDays}th, ${targetYear}` }
        ];

        weekBuckets.forEach(b => {
            labels.push(b.label);
            tooltipTitles.push(b.title);
            let inc = 0;
            let exp = 0;
            transactions.forEach(t => {
                const td = new Date(t.date || t.createdAt);
                if (td.getFullYear() === targetYear && td.getMonth() === targetMonth) {
                    const day = td.getDate();
                    if (day >= b.start && day <= b.end) {
                        if (t.amount > 0) inc += Math.abs(t.amount);
                        if (t.amount < 0) exp += Math.abs(t.amount);
                    }
                }
            });
            incomeData.push(inc);
            expenseData.push(exp);
        });
    } else if (chartTimeRange === '3M') {
        // 3 Months: 6 bi-weekly periods across the last 3 months
        for (let i = 2; i >= 0; i--) {
            const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mYear = mDate.getFullYear();
            const mMonth = mDate.getMonth();
            const mShort = mDate.toLocaleDateString('en-US', { month: 'short' });
            const mDays = new Date(mYear, mMonth + 1, 0).getDate();

            // First half: 1st - 15th
            labels.push(`${mShort} 1-15`);
            tooltipTitles.push(`${mShort} 1st - 15th, ${mYear}`);
            let inc1 = 0, exp1 = 0;

            // Second half: 16th - End of month
            labels.push(`${mShort} 16-${mDays}`);
            tooltipTitles.push(`${mShort} 16th - ${mDays}th, ${mYear}`);
            let inc2 = 0, exp2 = 0;

            transactions.forEach(t => {
                const td = new Date(t.date || t.createdAt);
                if (td.getFullYear() === mYear && td.getMonth() === mMonth) {
                    const day = td.getDate();
                    if (day <= 15) {
                        if (t.amount > 0) inc1 += Math.abs(t.amount);
                        if (t.amount < 0) exp1 += Math.abs(t.amount);
                    } else {
                        if (t.amount > 0) inc2 += Math.abs(t.amount);
                        if (t.amount < 0) exp2 += Math.abs(t.amount);
                    }
                }
            });
            incomeData.push(inc1, inc2);
            expenseData.push(exp1, exp2);
        }
    } else if (chartTimeRange === '6M') {
        // 6 Months: past 6 calendar months
        for (let i = 5; i >= 0; i--) {
            const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mYear = mDate.getFullYear();
            const mMonth = mDate.getMonth();
            const mShort = mDate.toLocaleDateString('en-US', { month: 'short' });
            labels.push(mShort);
            tooltipTitles.push(mDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

            let inc = 0, exp = 0;
            transactions.forEach(t => {
                const td = new Date(t.date || t.createdAt);
                if (td.getFullYear() === mYear && td.getMonth() === mMonth) {
                    if (t.amount > 0) inc += Math.abs(t.amount);
                    if (t.amount < 0) exp += Math.abs(t.amount);
                }
            });
            incomeData.push(inc);
            expenseData.push(exp);
        }
    } else if (chartTimeRange === 'ALL') {
        // ALL: Group by year if spanning multiple years, else all 12 calendar months
        const yearsSet = new Set(transactions.map(t => new Date(t.date || t.createdAt).getFullYear()));
        const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);

        if (sortedYears.length > 1) {
            sortedYears.forEach(yr => {
                labels.push(String(yr));
                tooltipTitles.push(`Year ${yr}`);
                let inc = 0, exp = 0;
                transactions.forEach(t => {
                    const td = new Date(t.date || t.createdAt);
                    if (td.getFullYear() === yr) {
                        if (t.amount > 0) inc += Math.abs(t.amount);
                        if (t.amount < 0) exp += Math.abs(t.amount);
                    }
                });
                incomeData.push(inc);
                expenseData.push(exp);
            });
        } else {
            const yr = sortedYears[0] || selectedYear || now.getFullYear();
            const monthsMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            monthsMap.forEach((mName, mIdx) => {
                labels.push(mName);
                tooltipTitles.push(`${mName} ${yr}`);
                let inc = 0, exp = 0;
                transactions.forEach(t => {
                    const td = new Date(t.date || t.createdAt);
                    if (td.getFullYear() === yr && td.getMonth() === mIdx) {
                        if (t.amount > 0) inc += Math.abs(t.amount);
                        if (t.amount < 0) exp += Math.abs(t.amount);
                    }
                });
                incomeData.push(inc);
                expenseData.push(exp);
            });
        }
    } else {
        // '1Y' (Default): 12 calendar months of selectedYear
        const yr = selectedYear || now.getFullYear();
        const monthsMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthsMap.forEach((mName, mIdx) => {
            labels.push(mName);
            tooltipTitles.push(`${mName} ${yr}`);
            let inc = 0, exp = 0;
            transactions.forEach(t => {
                const td = new Date(t.date || t.createdAt);
                if (td.getFullYear() === yr && td.getMonth() === mIdx) {
                    if (t.amount > 0) inc += Math.abs(t.amount);
                    if (t.amount < 0) exp += Math.abs(t.amount);
                }
            });
            incomeData.push(inc);
            expenseData.push(exp);
        });
    }

    // Create subtle gradients
    const gradInc = ctx.createLinearGradient(0, 0, 0, 240);
    gradInc.addColorStop(0, 'rgba(0, 217, 192, 0.25)');
    gradInc.addColorStop(1, 'rgba(0, 217, 192, 0.0)');

    const gradExp = ctx.createLinearGradient(0, 0, 0, 240);
    gradExp.addColorStop(0, 'rgba(255, 92, 114, 0.25)');
    gradExp.addColorStop(1, 'rgba(255, 92, 114, 0.0)');

    incomeExpenseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#00D9C0',
                    backgroundColor: gradInc,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#00D9C0',
                    pointBorderColor: '#0D0D10',
                    pointBorderWidth: 2
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    borderColor: '#FF5C72',
                    backgroundColor: gradExp,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#FF5C72',
                    pointBorderColor: '#0D0D10',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#17171B',
                    titleColor: '#F4F1F8',
                    bodyColor: '#9996A3',
                    borderColor: '#30303A',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 4,
                    usePointStyle: true,
                    callbacks: {
                        title: function(items) {
                            const idx = items[0].dataIndex;
                            return tooltipTitles[idx] || items[0].label;
                        },
                        label: function (ctx) {
                            return ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`;
                        },
                        afterBody: function(items) {
                            const inc = items[0] ? items[0].parsed.y : 0;
                            const exp = items[1] ? items[1].parsed.y : 0;
                            const sav = inc - exp;
                            return ` Savings: ${formatCurrency(sav)}`;
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
                            if (val >= 1000) return '₹' + (val / 1000).toFixed(0) + 'K';
                            return '₹' + val;
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#9996A3',
                        font: { family: 'Inter', size: 11 },
                        maxRotation: 0,
                        autoSkip: false
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

    const catTotals = {};
    expenses.forEach(t => {
        const cat = t.category || 'General';
        catTotals[cat] = (catTotals[cat] || 0) + Math.abs(t.amount);
    });

    const labels = Object.keys(catTotals);
    const data = Object.values(catTotals);
    const colors = labels.map(cat => getCategoryInfo(cat).color);

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

    // Populate Legend on Right
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
function renderBudgetHealth(currentTransactions, totalIncVal, totalExpVal) {
    // Budget benchmark: if income exists use income, otherwise standard target
    const targetBudget = totalIncVal > 0 ? totalIncVal : 30000;
    const spentPct = targetBudget > 0 ? Math.round((totalExpVal / targetBudget) * 100) : 0;

    budgetTargetDisplay.innerHTML = `${formatCurrency(totalExpVal)} <span>/ ${formatCurrency(targetBudget)}</span>`;
    budgetPercentEl.innerText = `${spentPct}%`;
    budgetProgressEl.style.width = `${Math.min(100, spentPct)}%`;

    const remaining = targetBudget - totalExpVal;
    if (remaining >= 0) {
        budgetRemainingText.innerText = `${formatCurrency(remaining)} remaining`;
    } else {
        budgetRemainingText.innerText = `${formatCurrency(Math.abs(remaining))} over limit`;
    }

    if (spentPct <= 70) {
        budgetStatusPill.className = 'budget-status-pill status-under';
        budgetStatusPill.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 6px;"></i> Under control';
        budgetStatusMessage.innerText = `You've used ${spentPct}% of your monthly budget.`;
    } else if (spentPct <= 95) {
        budgetStatusPill.className = 'budget-status-pill status-warning';
        budgetStatusPill.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 6px;"></i> Warning';
        budgetStatusMessage.innerText = `You've used ${spentPct}% of your monthly budget. Watch expenses.`;
    } else {
        budgetStatusPill.className = 'budget-status-pill status-over';
        budgetStatusPill.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 6px;"></i> Over budget';
        budgetStatusMessage.innerText = `You've exceeded your monthly budget benchmark by ${formatCurrency(Math.abs(remaining))}.`;
    }
}

function renderRecentActivity() {
    const sorted = [...transactions]
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
        .slice(0, 5);

    recentList.innerHTML = '';
    if (sorted.length === 0) {
        recentList.innerHTML = `
            <li class="empty-state-card" style="padding: 16px 0;">
                <div class="empty-icon-wrap" style="width: 32px; height: 32px; font-size: 0.9rem;"><i class="fa-solid fa-sparkles"></i></div>
                <div class="empty-state-title" style="font-size: 0.8rem;">No recent activity</div>
                <div class="empty-state-desc">Logged transactions appear here.</div>
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
                    <small>${catInfo.label} · ${formatDateMedium(t.date || t.createdAt)}</small>
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

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(d => {
        const div = document.createElement('div');
        div.className = 'cal-head-cell';
        div.innerText = d;
        miniCalendar.appendChild(div);
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (calMonthTitle) calMonthTitle.innerText = `${monthNames[calViewMonth]} ${calViewYear}`;

    const now = new Date();
    const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'cal-cell';
        emptyDiv.style.visibility = 'hidden';
        miniCalendar.appendChild(emptyDiv);
    }

    // Map activity for this month
    const dayActivity = {};
    transactions.forEach(t => {
        const d = new Date(t.date || t.createdAt);
        if (d.getFullYear() === calViewYear && d.getMonth() === calViewMonth) {
            const dayNum = d.getDate();
            if (!dayActivity[dayNum]) dayActivity[dayNum] = { hasInc: false, hasExp: false };
            if (t.amount > 0) dayActivity[dayNum].hasInc = true;
            if (t.amount < 0) dayActivity[dayNum].hasExp = true;
        }
    });

    for (let i = 1; i <= daysInMonth; i++) {
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        cell.innerText = i;

        const mStr = String(calViewMonth + 1).padStart(2, '0');
        const dStr = String(i).padStart(2, '0');
        const dateStr = `${calViewYear}-${mStr}-${dStr}`;

        if (i === now.getDate() && calViewMonth === now.getMonth() && calViewYear === now.getFullYear()) {
            cell.classList.add('today');
        }

        if (selectedDashboardDate === dateStr) {
            cell.classList.add('active-selected');
        }

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

        cell.addEventListener('click', () => {
            if (selectedDashboardDate === dateStr) {
                selectedDashboardDate = null;
            } else {
                selectedDashboardDate = dateStr;
            }
            updateValues();
            renderHistoryDOM();
            renderCalendar();
            renderDailyBreakdown(dateStr);
        });

        miniCalendar.appendChild(cell);
    }
}

if (calPrevMonth) {
    calPrevMonth.addEventListener('click', () => {
        calViewMonth--;
        if (calViewMonth < 0) {
            calViewMonth = 11;
            calViewYear--;
        }
        renderCalendar();
    });
}
if (calNextMonth) {
    calNextMonth.addEventListener('click', () => {
        calViewMonth++;
        if (calViewMonth > 11) {
            calViewMonth = 0;
            calViewYear++;
        }
        renderCalendar();
    });
}

function renderDailyBreakdown(targetDateStr) {
    if (!dayBreakdownTitle || !dayTransactionsList) return;

    const dObj = new Date(targetDateStr + 'T00:00:00');
    dayBreakdownTitle.innerText = `Transactions on ${dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const dayTrans = transactions.filter(t => {
        const d = new Date(t.date || t.createdAt);
        const tY = d.getFullYear();
        const tM = String(d.getMonth() + 1).padStart(2, '0');
        const tD = String(d.getDate()).padStart(2, '0');
        return `${tY}-${tM}-${tD}` === targetDateStr;
    });

    dayTransactionsList.innerHTML = '';
    if (dayTrans.length === 0) {
        dayTransactionsList.innerHTML = '<li class="text-muted" style="font-size: 0.74rem; text-align: center; padding: 12px 0;">No transactions on this date</li>';
        if (dayTransTotal) dayTransTotal.innerText = '₹0.00';
        return;
    }

    let sum = 0;
    dayTrans.forEach(t => {
        sum += t.amount;
        const isExp = t.amount < 0;
        const li = document.createElement('li');
        li.className = 'day-trans-item';
        li.innerHTML = `
            <div class="day-trans-left">
                <i class="fa-solid ${isExp ? 'fa-arrow-down' : 'fa-arrow-up'}" style="color: ${isExp ? 'var(--expense-coral)' : 'var(--income-teal)'}; font-size: 0.7rem;"></i>
                <span class="day-trans-amt ${isExp ? 'exp' : 'inc'}">${isExp ? '-' : '+'}${formatCurrency(t.amount)}</span>
                <span>${escapeHTML(t.text)}</span>
            </div>
            <span class="day-trans-time">${new Date(t.date || t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        `;
        dayTransactionsList.appendChild(li);
    });

    if (dayTransTotal) {
        dayTransTotal.innerText = (sum < 0 ? '-' : '+') + formatCurrency(sum);
        dayTransTotal.style.color = sum >= 0 ? 'var(--income-teal)' : 'var(--expense-coral)';
    }
}

// ===================================================
// HISTORY LIST: STRICTLY CONSTRAINED VERTICAL SCROLL, NO OVERLAPPING
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

    // 2. Sidebar Category Filter
    if (sidebarCategoryFilter) {
        listData = listData.filter(t => (t.category || '').toLowerCase() === sidebarCategoryFilter);
    }

    // 3. Type Filter (All, Income, Expense)
    if (historyTypeFilter === 'income') {
        listData = listData.filter(t => t.amount > 0);
    } else if (historyTypeFilter === 'expense') {
        listData = listData.filter(t => t.amount < 0);
    }

    // 4. Sorting
    listData.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        if (historySortOption === 'newest') return dateB - dateA;
        if (historySortOption === 'oldest') return dateA - dateB;
        if (historySortOption === 'highest') return Math.abs(b.amount) - Math.abs(a.amount);
        if (historySortOption === 'lowest') return Math.abs(a.amount) - Math.abs(b.amount);
        return 0;
    });

    // 5. Render Rows - Guaranteed NO VERTICAL OVERLAP
    historyList.innerHTML = '';
    if (listData.length === 0) {
        historyEmptyState.style.display = 'flex';
    } else {
        historyEmptyState.style.display = 'none';
        listData.forEach(transaction => {
            const isExp = transaction.amount < 0;
            const catInfo = getCategoryInfo(transaction.category);
            const tDate = new Date(transaction.date || transaction.createdAt);

            const row = document.createElement('div');
            row.className = 'history-table-row';
            row.innerHTML = `
                <div class="h-col-date">${formatDateMedium(tDate)}</div>
                <div class="h-col-desc">
                    <div class="h-desc-icon ${isExp ? 'exp' : 'inc'}">
                        <i class="fa-solid ${catInfo.icon}"></i>
                    </div>
                    <span class="h-desc-text" title="${escapeHTML(transaction.text)}">${escapeHTML(transaction.text)}</span>
                </div>
                <div class="h-col-cat">${catInfo.label}</div>
                <div class="h-col-type">
                    <span class="h-badge-type ${isExp ? 'exp' : 'inc'}">${isExp ? 'Expense' : 'Income'}</span>
                </div>
                <div class="h-col-amount ${isExp ? 'exp' : 'inc'}">
                    ${isExp ? '-' : '+'}${formatCurrency(transaction.amount)}
                </div>
                <div class="h-col-actions">
                    <button type="button" class="h-action-btn" onclick="removeTransaction('${transaction._id}')" title="Move to Recycle Bin">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
            historyList.appendChild(row);
        });
    }
}

// History Controls Event Listeners
historySearch.addEventListener('input', (e) => {
    historySearchTerm = e.target.value.toLowerCase().trim();
    if (headerSearchInput) headerSearchInput.value = e.target.value;
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

// Form Submission
form.addEventListener('submit', addTransaction);

// Chart Time Range Selector Buttons (7D, 1M, 3M, 6M, 1Y, ALL)
function initChartTimeSelectors() {
    const timeBtns = document.querySelectorAll('#chart-time-selectors .time-pill-btn');
    timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            chartTimeRange = btn.getAttribute('data-range');
            renderTrendChart();
        });
    });
}

// App Initialization
function init() {
    initUserProfile();
    renderYears();
    initPeriodAndMonthSelection();
    initChartTimeSelectors();
    syncDateInput();
    updateValues();
    renderHistoryDOM();
}

// Initial Kickoff
getTransactions();
