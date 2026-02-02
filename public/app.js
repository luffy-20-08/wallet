const balance = document.getElementById('total-balance');
const money_plus = document.getElementById('total-income');
const money_minus = document.getElementById('total-expense');
const list = document.getElementById('list');
const form = document.getElementById('transaction-form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const category = document.getElementById('category');

// Sidebar Elements
const toggleBtn = document.getElementById('toggle-sidebar');
const closeBtn = document.getElementById('close-sidebar');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const yearList = document.getElementById('year-list');
const monthList = document.getElementById('month-list');

// Recycle Bin Elements
const openBinBtn = document.getElementById('open-bin-btn');
const closeBinBtn = document.getElementById('close-bin-btn');
const binModal = document.getElementById('bin-modal');
const binList = document.getElementById('bin-list');
const binEmptyMsg = document.getElementById('bin-empty-msg');

// Chart Element
const ctx = document.getElementById('expenseChart').getContext('2d');
let expenseChart;

// State
let currentDate = new Date();
let selectedYear = currentDate.getFullYear();
let selectedMonth = currentDate.getMonth(); // 0-11, or 'all'

let transactions = [];
let deletedTransactions = [];

const API_URL = '/api/transactions';

// Fetch initial data
async function getTransactions() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        transactions = data.data;

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
        deletedTransactions = data.data;
    } catch (err) {
        console.error('Error fetching bin:', err);
    }
}

// Event Listeners for Sidebar
toggleBtn.addEventListener('click', () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');
});

function closeSidebar() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

closeBtn.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

// Filter Logic
function renderYears() {
    yearList.innerHTML = '';
    const currentYear = new Date().getFullYear();
    const years = transactions.map(t => new Date(t.date || t.createdAt).getFullYear());
    const minYear = years.length > 0 ? Math.min(...years, currentYear) : currentYear;

    for (let y = currentYear; y >= minYear; y--) {
        const li = document.createElement('li');
        li.innerText = y;
        if (y === selectedYear) li.classList.add('active');
        li.addEventListener('click', () => {
            selectedYear = y;
            renderYears();
            syncDateInput();
            updateValues();
            init();
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
            const val = e.target.getAttribute('data-month');

            if (val === 'lifetime') {
                selectedMonth = 'lifetime';
            } else {
                selectedMonth = val === 'all' ? 'all' : parseInt(val);
            }

            initMonthSelection();
            syncDateInput();
            updateValues();
            init();
            closeSidebar();
        });
    });
}

// Recycle Bin UI Logic
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
    if (deletedTransactions.length === 0) {
        binEmptyMsg.style.display = 'block';
    } else {
        binEmptyMsg.style.display = 'none';
        deletedTransactions.forEach(item => {
            const li = document.createElement('li');
            li.className = item.amount < 0 ? 'minus' : 'plus';
            li.innerHTML = `
                ${item.text} 
                <span>${item.amount < 0 ? '-' : '+'}${Math.abs(item.amount)}</span>
                <div class="bin-actions">
                    <button class="restore-btn" onclick="restoreTransaction('${item._id}')">Restore</button>
                    <button class="perm-delete-btn" onclick="eliminateTransaction('${item._id}')">Delete</button>
                </div>
            `;
            binList.appendChild(li);
        });
    }
}


const dateInput = document.getElementById('date');

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

// Initial Sync
syncDateInput();

// Add transaction
async function addTransaction(e) {
    e.preventDefault();

    if (text.value.trim() === '' || amount.value.trim() === '') {
        alert('Please add a text and amount');
        return;
    }

    if (!dateInput.value) {
        alert('Please select a date');
        return;
    }

    const type = document.querySelector('input[name="type"]:checked').value;
    const amountValue = +amount.value;
    const finalAmount = type === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue);

    // Strictly use the input value
    // Parse YYYY-MM-DD manually to create a Local Date at midnight
    const [y, m, d] = dateInput.value.split('-').map(Number);
    const selectedDate = new Date(y, m - 1, d); // Local Midnight

    console.log("Frontend selected string:", dateInput.value);
    console.log("Frontend constructed date:", selectedDate.toString());
    console.log("Sending ISO:", selectedDate.toISOString());

    // Manual Object Construction to avoid fallback issues
    const newTransaction = {
        text: text.value,
        amount: finalAmount,
        type: type,
        category: category.value,
        date: selectedDate.toISOString(), // Send ISO
        month: selectedDate.getMonth(),   // Send Local Month (0-11)
        year: selectedDate.getFullYear()  // Send Local Year
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

        // Push the Returned data which includes DB ID
        transactions.push(data.data);

        addTransactionDOM(data.data);
        updateValues();

        text.value = '';
        amount.value = '';
        // Do not reset dateInput to allow multiple entries for same date, or reset to current? 
        // User didn't specify, but keeping selection is usually better for batch entry.
    } catch (err) {
        console.error('Error adding transaction:', err);
    }
}

// Add transactions to DOM list
function addTransactionDOM(transaction) {
    const tDate = new Date(transaction.date || transaction.createdAt);

    if (selectedMonth !== 'lifetime') {
        if (tDate.getFullYear() !== selectedYear) return;
        if (selectedMonth !== 'all' && tDate.getMonth() !== selectedMonth) return;
    }

    const sign = transaction.amount < 0 ? '-' : '+';
    const itemClass = transaction.amount < 0 ? 'minus' : 'plus';

    const item = document.createElement('li');
    item.classList.add(itemClass);
    item.innerHTML = `
    ${transaction.text} <span>${sign}${Math.abs(transaction.amount)}</span> <button class="delete-btn" onclick="removeTransaction('${transaction._id}')"><i class="fa-solid fa-trash"></i></button>
  `;

    list.appendChild(item);
}

// Update the balance, income and expense + CHART
// Update the balance, income and expense + CHART
function updateValues() {
    let filteredTransactions = [];
    let periodText = '';

    // 1. FILTER LOGIC
    if (selectedMonth === 'lifetime') {
        // Lifetime Mode: Show ALL transactions
        filteredTransactions = transactions;
        periodText = 'Lifetime Record';
    } else {
        // Year/Month Logic
        // Year/Month Logic
        filteredTransactions = transactions.filter(transaction => {
            const tDate = new Date(transaction.date || transaction.createdAt);
            const yearMatch = tDate.getFullYear() === selectedYear;

            if (selectedMonth === 'all') {
                return yearMatch; // Entire selected year
            } else {
                return yearMatch && tDate.getMonth() === selectedMonth; // Specific month
            }
        });

        // Set Text
        if (selectedMonth === 'all') {
            periodText = `Entire Year ${selectedYear}`;
        } else {
            const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' });
            periodText = `${monthName} ${selectedYear}`;
        }
    }

    // 2. CALCULATE VALUES FROM FILTERED DATA
    const amounts = filteredTransactions.map(transaction => transaction.amount);

    const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);

    const income = amounts
        .filter(item => item > 0)
        .reduce((acc, item) => (acc += item), 0)
        .toFixed(2);

    const expense = (
        amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) *
        -1
    ).toFixed(2);

    // 3. UI UPDATES

    // Update labels for cards
    document.querySelectorAll('.period').forEach(el => {
        el.innerText = periodText;
    });

    balance.innerText = `₹${total}`;
    money_plus.innerText = `₹${income}`;
    money_minus.innerText = `₹${expense}`;

    // Update Charts & Stats with FILTERED data
    renderCharts(filteredTransactions);
    renderStats(filteredTransactions);
    renderRecentActivity();
    renderCalendar();
}

// Remove transaction (Soft Delete)
async function removeTransaction(id) {
    if (confirm('Are you sure you want to delete this log?')) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Optimistic update or refetch
            const transactionToDelete = transactions.find(t => t._id === id);
            if (transactionToDelete) {
                deletedTransactions.push(transactionToDelete);
                transactions = transactions.filter(t => t._id !== id);
                init();
                renderYears();
            }
        } catch (err) {
            console.error(err);
        }
    }
}

// Restore Transaction
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
            init();
            renderBin();
            renderYears();
        }
    } catch (err) {
        console.error(err);
    }
}

// Eliminate (Permanently Delete) Transaction
async function eliminateTransaction(id) {
    if (confirm('Permanently delete this log? This cannot be undone.')) {
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
            console.error(err);
        }
    }
}

// --- NEW ANALYTICS LOGIC ---

// 1. Charts
let incomeExpenseChart = null;
// expenseChart context is already defined as ctx at top of file, but we need to re-init it differently.
// We will use new variable names for clarity in the render function.

function renderCharts(currentTransactions) {
    const expenses = currentTransactions.filter(t => t.type === 'expense');
    const income = currentTransactions.filter(t => t.type === 'income');

    // -- Chart 1: Income vs Expense (Bar) --
    const totalIncome = income.reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = Math.abs(expenses.reduce((acc, t) => acc + t.amount, 0));

    const ctxIncExp = document.getElementById('incomeExpenseChart').getContext('2d');

    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    incomeExpenseChart = new Chart(ctxIncExp, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                label: 'Amount (₹)',
                data: [totalIncome, totalExpense],
                backgroundColor: ['#03dac6', '#cf6679'],
                borderRadius: 5,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#bbb' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#bbb' }
                }
            }
        }
    });

    // -- Chart 2: Category Breakdown (Doughnut) --
    // Re-using existing 'expenseChart' variable/canvas from original code, but logic updated
    const categories = {};
    expenses.forEach(t => {
        if (categories[t.category]) {
            categories[t.category] += Math.abs(t.amount);
        } else {
            categories[t.category] = Math.abs(t.amount);
        }
    });

    const labels = Object.keys(categories);
    const data = Object.values(categories);

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(ctx, { // ctx is the original canvas ref
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#cf6679', '#bb86fc', '#03dac6', '#ffb74d', '#4fc3f7', '#a1887f', '#ba68c8'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#e0e0e0', boxWidth: 10, padding: 20 }
                },
                title: { display: false }
            },
            cutout: '70%'
        }
    });
}

// 2. Statistics & Widgets
function renderStats(currentTransactions) {
    const expenses = currentTransactions.filter(t => t.type === 'expense');
    const income = currentTransactions.filter(t => t.type === 'income');

    const totalIncVal = income.reduce((acc, t) => acc + t.amount, 0);
    const totalExpVal = Math.abs(expenses.reduce((acc, t) => acc + t.amount, 0));

    // Savings Rate
    const savings = totalIncVal - totalExpVal;
    const savingsRate = totalIncVal > 0 ? ((savings / totalIncVal) * 100).toFixed(1) : 0;

    document.getElementById('savings-rate').innerText = `${savingsRate}%`;
    document.getElementById('savings-progress').style.width = `${Math.max(0, savingsRate)}%`;

    // Budget Health (assuming budget = income for now, or you can set a fixed budget)
    // Using Income as the limit
    const budgetPercent = totalIncVal > 0 ? ((totalExpVal / totalIncVal) * 100).toFixed(1) : 0;
    document.getElementById('budget-percent').innerText = `${budgetPercent}%`;
    document.getElementById('budget-progress').style.width = `${Math.min(100, budgetPercent)}%`;

    // Quick Stats
    const amounts = expenses.map(t => Math.abs(t.amount));
    const highest = amounts.length > 0 ? Math.max(...amounts) : 0;
    const avg = amounts.length > 0 ? (totalExpVal / amounts.length) : 0;

    document.getElementById('highest-expense').innerText = `₹${highest.toFixed(2)}`;
    document.getElementById('avg-expense').innerText = `₹${avg.toFixed(2)}`;
}

function renderRecentActivity() {
    // Show top 3 recent transactions across ALL time (or current selection? Let's do current selection for consistency)
    // Actually, "Recent Activity" usually implies latest global actions. Let's use global 'transactions' sorted by date.

    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    const listEl = document.getElementById('recent-list');
    listEl.innerHTML = '';

    if (sorted.length === 0) {
        listEl.innerHTML = '<li class="text-muted small">No recent activity</li>';
        return;
    }

    sorted.forEach(t => {
        const sign = t.amount < 0 ? '-' : '+';
        const colorClass = t.amount < 0 ? 'text-danger' : 'text-success';

        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <span class="d-block text-white">${t.text}</span>
                <small class="text-muted">${new Date(t.date).toLocaleDateString()}</small>
            </div>
            <span class="${colorClass} fw-bold">${sign}₹${Math.abs(t.amount)}</span>
        `;
        listEl.appendChild(li);
    });
}

function renderCalendar() {
    const calendarEl = document.getElementById('mini-calendar');
    calendarEl.innerHTML = '';

    // Headers
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    days.forEach(d => {
        const div = document.createElement('div');
        div.className = 'calendar-header';
        div.innerText = d;
        calendarEl.appendChild(div);
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        calendarEl.appendChild(div);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        if (i === now.getDate()) {
            div.classList.add('today');
        }
        div.innerText = i;
        calendarEl.appendChild(div);
    }
}

// Init app
function init() {
    list.innerHTML = '';
    transactions.forEach(addTransactionDOM);
    updateValues();
    renderYears();
    initMonthSelection();
}

// Initial Fetch
getTransactions();

// Delete All Transactions (Soft Delete)
const deleteAllBtn = document.getElementById('delete-all-btn');

if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', deleteAllTransactions);
}

async function deleteAllTransactions() {
    if (confirm('Are you sure you want to delete ALL transactions? This will move them to the Recycle Bin.')) {
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
                // Move all current transactions to deletedTransactions (for optimistic UI update)
                // Filter out already deleted (though API handles it, this keeps array clean)
                const activeTransactions = transactions.filter(t => !t.isDeleted);
                deletedTransactions = [...deletedTransactions, ...activeTransactions];

                // Clear active transactions
                transactions = [];

                // Re-init UI
                init();

                // Also update bin if it was open (though usually it's closed)
                renderBin();
            }
        } catch (err) {
            console.error('Error deleting all transactions:', err);
        }
    }
}

// Display Username
const user = JSON.parse(localStorage.getItem('user'));
if (user) {
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.innerText = `Hello, ${user.username}`;
}

// User Dropdown Logic
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');

if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    window.addEventListener('click', (e) => {
        if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });
}

form.addEventListener('submit', addTransaction)
