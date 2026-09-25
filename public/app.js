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
const openChangePasswordBtn = document.getElementById('open-change-password-btn');
const openBinFromMenu = document.getElementById('open-bin-from-menu');

// Account Modal Elements
const accountModal = document.getElementById('account-modal');
const closeAccountBtn = document.getElementById('close-account-btn');
const modalAvatarInitial = document.getElementById('modal-avatar-initial');
const modalUsername = document.getElementById('modal-username');
const modalEmail = document.getElementById('modal-email');
const dropdownUsername = document.getElementById('dropdown-username');
const dropdownEmail = document.getElementById('dropdown-email');
const changePasswordForm = document.getElementById('change-password-form');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const passwordAlertBox = document.getElementById('password-alert-box');
const passwordAlertText = document.getElementById('password-alert-text');
const submitChangePasswordBtn = document.getElementById('submit-change-password-btn');
const changePwdBtnContent = document.getElementById('change-pwd-btn-content');

// Session / Devices Elements
const sessionsList = document.getElementById('sessions-list');
const deviceCountBadge = document.getElementById('device-count-badge');
const sessionAlertBox = document.getElementById('session-alert-box');
const sessionAlertText = document.getElementById('session-alert-text');
const logoutAllOtherBtn = document.getElementById('logout-all-other-btn');

// DOM Elements: Summary Cards
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const savingsRateEl = document.getElementById('savings-rate');
const savingsCirclePath = document.getElementById('savings-circle-path');
const savingsRingText = document.getElementById('savings-ring-text');

// DOM Elements: Month & Period Selector Bar
const monthBarCurrentLabel = document.getElementById('month-bar-current-label');
const btnQuickThisMonth = document.getElementById('btn-quick-this-month');
const btnQuickEntireYear = document.getElementById('btn-quick-entire-year');
const btnQuickLifetime = document.getElementById('btn-quick-lifetime');
const monthRibbonPrev = document.getElementById('month-ribbon-prev');
const monthRibbonNext = document.getElementById('month-ribbon-next');
const monthRibbon = document.getElementById('month-ribbon');
const dashboardYearSelect = document.getElementById('dashboard-year-select');

// DOM Elements: Card Subtitles
const cardBalanceSubtitle = document.getElementById('card-balance-subtitle');
const cardIncomeSubtitle = document.getElementById('card-income-subtitle');
const cardExpenseSubtitle = document.getElementById('card-expense-subtitle');
const cardSavingsSubtitle = document.getElementById('card-savings-subtitle');

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

const API_URL = (typeof window !== 'undefined' && typeof window.apiUrl === 'function')
    ? window.apiUrl('/api/transactions')
    : '/api/transactions';

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

        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

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
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        user = null;
    }

    if (!user || !user.username) {
        if (userDisplay) userDisplay.innerText = 'Welcome, Guest';
        if (userAvatarInitial) userAvatarInitial.innerText = 'G';
        if (modalAvatarInitial) modalAvatarInitial.innerText = 'G';
        if (modalUsername) modalUsername.innerText = 'Guest';
        if (modalEmail) modalEmail.innerText = '';
        if (dropdownUsername) dropdownUsername.innerText = 'Guest';
        if (dropdownEmail) dropdownEmail.innerText = '';
        return;
    }

    const initial = (user.username.charAt(0) || 'U').toUpperCase();
    if (userDisplay) userDisplay.innerText = `Welcome, ${user.username}`;
    if (userAvatarInitial) userAvatarInitial.innerText = initial;
    if (modalAvatarInitial) modalAvatarInitial.innerText = initial;
    if (modalUsername) modalUsername.innerText = user.username;
    if (modalEmail) modalEmail.innerText = user.email || '';
    if (dropdownUsername) dropdownUsername.innerText = user.username;
    if (dropdownEmail) dropdownEmail.innerText = user.email || '';
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
        loadActiveSessions();
    });
}
if (openChangePasswordBtn) {
    openChangePasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        userDropdown.classList.remove('show');
        accountModal.classList.add('active');
        loadActiveSessions();
        if (currentPasswordInput) {
            setTimeout(() => currentPasswordInput.focus(), 100);
        }
    });
}
if (closeAccountBtn) {
    closeAccountBtn.addEventListener('click', () => {
        accountModal.classList.remove('active');
    });
}

// Password toggle buttons in account modal
document.querySelectorAll('#account-modal .password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input) {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
            }
        }
    });
});

// Change Password form submission
if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = currentPasswordInput ? currentPasswordInput.value : '';
        const newPassword = newPasswordInput ? newPasswordInput.value : '';
        const confirmNewPassword = confirmNewPasswordInput ? confirmNewPasswordInput.value : '';

        // Reset alert box
        if (passwordAlertBox) {
            passwordAlertBox.className = 'alert-clean-danger';
            passwordAlertBox.style.display = 'none';
        }

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            if (passwordAlertText && passwordAlertBox) {
                passwordAlertText.textContent = 'Please fill in all password fields';
                passwordAlertBox.style.display = 'flex';
            }
            return;
        }

        if (newPassword.length < 6) {
            if (passwordAlertText && passwordAlertBox) {
                passwordAlertText.textContent = 'New password must be at least 6 characters long';
                passwordAlertBox.style.display = 'flex';
            }
            return;
        }

        if (newPassword !== confirmNewPassword) {
            if (passwordAlertText && passwordAlertBox) {
                passwordAlertText.textContent = 'New passwords do not match';
                passwordAlertBox.style.display = 'flex';
            }
            return;
        }

        if (currentPassword === newPassword) {
            if (passwordAlertText && passwordAlertBox) {
                passwordAlertText.textContent = 'New password cannot be the same as current password';
                passwordAlertBox.style.display = 'flex';
            }
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        if (submitChangePasswordBtn && changePwdBtnContent) {
            submitChangePasswordBtn.disabled = true;
            changePwdBtnContent.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
        }

        try {
            const res = await fetch((typeof window !== 'undefined' && typeof window.apiUrl === 'function') ? window.apiUrl('/api/auth/change-password') : '/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update password');
            }

            // Success feedback
            if (passwordAlertBox && passwordAlertText) {
                passwordAlertBox.className = 'alert-clean-success';
                const icon = passwordAlertBox.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-circle-check';
                passwordAlertText.textContent = data.message || 'Password changed successfully. Other devices have been signed out.';
                passwordAlertBox.style.display = 'flex';
            }

            changePasswordForm.reset();
            // Refresh active sessions since other devices were signed out
            await loadActiveSessions();
        } catch (err) {
            if (passwordAlertBox && passwordAlertText) {
                passwordAlertBox.className = 'alert-clean-danger';
                const icon = passwordAlertBox.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-circle-exclamation';
                passwordAlertText.textContent = err.message || 'Error updating password';
                passwordAlertBox.style.display = 'flex';
            }
        } finally {
            if (submitChangePasswordBtn && changePwdBtnContent) {
                submitChangePasswordBtn.disabled = false;
                changePwdBtnContent.innerHTML = '<i class="fa-solid fa-key"></i> Change Password';
            }
        }
    });
}

// ===================================================
// ACTIVE SESSIONS & DEVICE MANAGEMENT
// ===================================================
async function loadActiveSessions() {
    if (!sessionsList) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch((typeof window !== 'undefined' && typeof window.apiUrl === 'function') ? window.apiUrl('/api/auth/sessions') : '/api/auth/sessions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        const data = await res.json();
        if (!data.success) {
            sessionsList.innerHTML = `<div class="session-empty-state"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHTML(data.error || 'Failed to load devices')}</div>`;
            return;
        }

        if (deviceCountBadge) {
            deviceCountBadge.innerText = `${data.deviceCount} active device${data.deviceCount === 1 ? '' : 's'}`;
        }

        if (logoutAllOtherBtn) {
            logoutAllOtherBtn.style.display = data.deviceCount > 1 ? 'inline-flex' : 'none';
        }

        if (!data.sessions || data.sessions.length === 0) {
            sessionsList.innerHTML = '<div class="session-empty-state">No active devices found.</div>';
            return;
        }

        sessionsList.innerHTML = '';
        data.sessions.forEach(sess => {
            const card = document.createElement('div');
            card.className = `session-card-item ${sess.isCurrent ? 'current-session' : ''}`;

            let deviceIcon = 'fa-desktop';
            if (sess.deviceType === 'Mobile Device') deviceIcon = 'fa-mobile-screen';
            else if (sess.deviceType === 'Tablet') deviceIcon = 'fa-tablet-screen-button';
            else if (sess.deviceType === 'Laptop') deviceIcon = 'fa-laptop';

            card.innerHTML = `
                <div class="session-info-left">
                    <div class="session-device-icon">
                        <i class="fa-solid ${deviceIcon}"></i>
                    </div>
                    <div class="session-device-details">
                        <div class="session-device-name">
                            <strong>${escapeHTML(sess.isCurrent ? 'Current Device' : sess.deviceType)}</strong>
                            <span class="session-meta-sep">•</span>
                            <span class="session-os">${escapeHTML(sess.os)}</span>
                            <span class="session-meta-sep">•</span>
                            <span class="session-browser">${escapeHTML(sess.browser)}</span>
                        </div>
                        <div class="session-device-sub">
                            <span class="session-last-active"><i class="fa-regular fa-clock"></i> Last active: ${escapeHTML(sess.lastActiveText)}</span>
                            ${sess.ipAddress ? `<span class="session-ip-badge">${escapeHTML(sess.ipAddress)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="session-action-right">
                    ${sess.isCurrent ? 
                        '<span class="badge-current-device"><i class="fa-solid fa-circle-check"></i> Current Device</span>' : 
                        `<button type="button" class="btn-logout-device" onclick="logoutDevice('${sess.id}')" title="Sign out this device">
                            <i class="fa-solid fa-arrow-right-from-bracket"></i> Log out
                        </button>`
                    }
                </div>
            `;
            sessionsList.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading sessions:', err);
        sessionsList.innerHTML = '<div class="session-empty-state"><i class="fa-solid fa-triangle-exclamation"></i> Could not load active devices.</div>';
    }
}

async function logoutDevice(sessionId) {
    const token = localStorage.getItem('token');
    if (!token || !sessionId) return;

    try {
        const res = await fetch((typeof window !== 'undefined' && typeof window.apiUrl === 'function') ? window.apiUrl(`/api/auth/sessions/${sessionId}`) : `/api/auth/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (data.success) {
            showSessionAlert('Device logged out successfully.');
            await loadActiveSessions();
        } else {
            showSessionAlert(data.error || 'Failed to log out device', true);
        }
    } catch (err) {
        showSessionAlert('Failed to log out device', true);
    }
}

if (logoutAllOtherBtn) {
    logoutAllOtherBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        logoutAllOtherBtn.disabled = true;
        logoutAllOtherBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging out devices...';

        try {
            const res = await fetch((typeof window !== 'undefined' && typeof window.apiUrl === 'function') ? window.apiUrl('/api/auth/sessions/logout-all-other') : '/api/auth/sessions/logout-all-other', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                showSessionAlert('All other devices have been signed out.');
                await loadActiveSessions();
            } else {
                showSessionAlert(data.error || 'Failed to log out other devices', true);
            }
        } catch (err) {
            showSessionAlert('Failed to log out other devices', true);
        } finally {
            logoutAllOtherBtn.disabled = false;
            logoutAllOtherBtn.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out All Other Devices';
        }
    });
}

function showSessionAlert(msg, isError = false) {
    if (!sessionAlertBox || !sessionAlertText) return;
    sessionAlertBox.className = isError ? 'alert-clean-danger' : 'alert-clean-success';
    const icon = sessionAlertBox.querySelector('i');
    if (icon) {
        icon.className = isError ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    }
    sessionAlertText.textContent = msg;
    sessionAlertBox.style.display = 'flex';
    setTimeout(() => {
        if (sessionAlertBox) sessionAlertBox.style.display = 'none';
    }, 4500);
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
if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
        if (sidebar) sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
    });
}

function closeSidebar() {
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
if (overlay) overlay.addEventListener('click', closeSidebar);

const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function selectMonthFilter(monthVal, yearVal) {
    if (yearVal !== undefined && yearVal !== null) {
        selectedYear = parseInt(yearVal);
        calViewYear = selectedYear;
    }

    selectedDashboardDate = null; // Clear any day drill-down so whole month metrics show

    if (monthVal === 'lifetime') {
        selectedMonth = 'lifetime';
    } else if (monthVal === 'all') {
        selectedMonth = 'all';
    } else {
        selectedMonth = parseInt(monthVal);
        calViewMonth = selectedMonth;
    }

    syncMonthUI();
    updateValues();
    renderHistoryDOM();
    renderCalendar();
}

function syncMonthUI() {
    const realNow = new Date();
    const realMonth = realNow.getMonth();
    const realYear = realNow.getFullYear();

    // 1. Month Ribbon Buttons
    const ribbonBtns = document.querySelectorAll('#month-ribbon .ribbon-month-btn');
    ribbonBtns.forEach(btn => {
        const m = btn.getAttribute('data-month');
        btn.classList.remove('active');
        btn.classList.remove('is-current');

        if (m !== 'all') {
            const mNum = parseInt(m);
            if (mNum === realMonth && selectedYear === realYear) {
                btn.classList.add('is-current');
            }
            if (selectedMonth === mNum) {
                btn.classList.add('active');
            }
        } else {
            if (selectedMonth === 'all') {
                btn.classList.add('active');
            }
        }
    });

    // 2. Quick Pills
    if (btnQuickThisMonth) {
        btnQuickThisMonth.classList.toggle('active', selectedMonth === realMonth && selectedYear === realYear);
    }
    if (btnQuickEntireYear) {
        btnQuickEntireYear.classList.toggle('active', selectedMonth === 'all');
    }
    if (btnQuickLifetime) {
        btnQuickLifetime.classList.toggle('active', selectedMonth === 'lifetime');
    }

    // 3. Current Selection Label Badge
    if (monthBarCurrentLabel) {
        if (selectedMonth === 'lifetime') {
            monthBarCurrentLabel.innerText = 'All Time (Lifetime)';
        } else if (selectedMonth === 'all') {
            monthBarCurrentLabel.innerText = `Entire Year ${selectedYear}`;
        } else {
            monthBarCurrentLabel.innerText = `${MONTH_NAMES_FULL[selectedMonth]} ${selectedYear}`;
        }
    }

    // 4. Year Dropdown Sync
    if (dashboardYearSelect && String(dashboardYearSelect.value) !== String(selectedYear)) {
        dashboardYearSelect.value = selectedYear;
    }
    if (yearSelect && String(yearSelect.value) !== String(selectedYear)) {
        yearSelect.value = selectedYear;
    }

    // 5. Sidebar Month List & Period Pills
    if (periodLifetime) {
        periodLifetime.classList.toggle('active', selectedMonth === 'lifetime');
    }
    if (periodEntireYear) {
        periodEntireYear.classList.toggle('active', selectedMonth === 'all');
    }
    if (monthList) {
        const sideItems = monthList.querySelectorAll('li');
        sideItems.forEach(li => {
            const m = li.getAttribute('data-month');
            li.classList.remove('active');
            if (m === 'all' && selectedMonth === 'all') {
                li.classList.add('active');
            } else if (m !== 'all' && parseInt(m) === selectedMonth) {
                li.classList.add('active');
            }
        });
    }
}

function renderYears() {
    const currentY = new Date().getFullYear();
    const years = transactions.map(t => new Date(t.date || t.createdAt).getFullYear());
    const minYear = years.length > 0 ? Math.min(...years, currentY) : currentY;

    const populateSelect = (selEl) => {
        if (!selEl) return;
        selEl.innerHTML = '';
        for (let y = currentY; y >= minYear; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.innerText = y;
            if (y === selectedYear) opt.selected = true;
            selEl.appendChild(opt);
        }
    };

    populateSelect(yearSelect);
    populateSelect(dashboardYearSelect);

    if (yearSelect && !yearSelect.dataset.listenerAttached) {
        yearSelect.dataset.listenerAttached = 'true';
        yearSelect.addEventListener('change', (e) => {
            selectMonthFilter(selectedMonth, parseInt(e.target.value));
        });
    }

    if (dashboardYearSelect && !dashboardYearSelect.dataset.listenerAttached) {
        dashboardYearSelect.dataset.listenerAttached = 'true';
        dashboardYearSelect.addEventListener('change', (e) => {
            selectMonthFilter(selectedMonth, parseInt(e.target.value));
        });
    }
}

function initPeriodAndMonthSelection() {
    // 1. Top Ribbon Month Buttons (Jan - Dec, All)
    const ribbonBtns = document.querySelectorAll('#month-ribbon .ribbon-month-btn');
    ribbonBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-month');
            selectMonthFilter(val, selectedYear);
        });
    });

    // 2. Top Ribbon Prev / Next Month
    if (monthRibbonPrev) {
        monthRibbonPrev.addEventListener('click', () => {
            let curM = (selectedMonth === 'lifetime' || selectedMonth === 'all') ? (calViewMonth || 0) : selectedMonth;
            let targetY = selectedYear;
            curM--;
            if (curM < 0) {
                curM = 11;
                targetY--;
                renderYears();
            }
            selectMonthFilter(curM, targetY);
        });
    }
    if (monthRibbonNext) {
        monthRibbonNext.addEventListener('click', () => {
            let curM = (selectedMonth === 'lifetime' || selectedMonth === 'all') ? (calViewMonth || 0) : selectedMonth;
            let targetY = selectedYear;
            curM++;
            if (curM > 11) {
                curM = 0;
                targetY++;
                renderYears();
            }
            selectMonthFilter(curM, targetY);
        });
    }

    // 3. Quick Pills (This Month, Entire Year, All Time)
    if (btnQuickThisMonth) {
        btnQuickThisMonth.addEventListener('click', () => {
            const now = new Date();
            selectMonthFilter(now.getMonth(), now.getFullYear());
        });
    }
    if (btnQuickEntireYear) {
        btnQuickEntireYear.addEventListener('click', () => {
            selectMonthFilter('all', selectedYear);
        });
    }
    if (btnQuickLifetime) {
        btnQuickLifetime.addEventListener('click', () => {
            selectMonthFilter('lifetime');
        });
    }

    // 4. Sidebar Period & Month List
    if (periodLifetime) {
        periodLifetime.addEventListener('click', () => {
            selectMonthFilter('lifetime');
        });
    }

    if (periodEntireYear) {
        periodEntireYear.addEventListener('click', () => {
            selectMonthFilter('all', selectedYear);
        });
    }

    if (monthList) {
        const months = monthList.querySelectorAll('li');
        months.forEach(li => {
            li.addEventListener('click', () => {
                const val = li.getAttribute('data-month');
                selectMonthFilter(val, selectedYear);
            });
        });
    }

    // Initial sync of UI states
    syncMonthUI();
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
if (openBinBtn) {
    openBinBtn.addEventListener('click', () => {
        closeSidebar();
        renderBin();
        binModal.classList.add('active');
    });
}

if (closeBinBtn) {
    closeBinBtn.addEventListener('click', () => {
        binModal.classList.remove('active');
    });
}

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

    // Dynamic Card Subtitles reflecting the active month/period
    let periodText = '';
    if (selectedDashboardDate) {
        const dObj = new Date(selectedDashboardDate + 'T00:00:00');
        periodText = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (selectedMonth === 'lifetime') {
        periodText = 'All-Time';
    } else if (selectedMonth === 'all') {
        periodText = `Year ${selectedYear}`;
    } else {
        periodText = `${MONTH_NAMES_SHORT[selectedMonth]} ${selectedYear}`;
    }

    if (cardBalanceSubtitle) {
        cardBalanceSubtitle.innerHTML = `<i class="fa-solid fa-calendar-check"></i> Net for ${periodText}`;
    }
    if (cardIncomeSubtitle) {
        cardIncomeSubtitle.innerHTML = `<i class="fa-solid fa-arrow-up"></i> Income in ${periodText}`;
    }
    if (cardExpenseSubtitle) {
        cardExpenseSubtitle.innerHTML = `<i class="fa-solid fa-arrow-down"></i> Expenses in ${periodText}`;
    }
    if (cardSavingsSubtitle) {
        cardSavingsSubtitle.innerHTML = `<i class="fa-solid fa-leaf"></i> Savings in ${periodText}`;
    }

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
            renderYears();
        }
        selectMonthFilter(calViewMonth, calViewYear);
    });
}
if (calNextMonth) {
    calNextMonth.addEventListener('click', () => {
        calViewMonth++;
        if (calViewMonth > 11) {
            calViewMonth = 0;
            calViewYear++;
            renderYears();
        }
        selectMonthFilter(calViewMonth, calViewYear);
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

// Click Summary Cards to Filter & Open Tabs (All, Income, Expense, Savings)
function openHistoryTab(type) {
    setHistoryTypeFilter(type);
    const historySec = document.getElementById('history-section');
    if (historySec) {
        historySec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const cardWrap = historySec.querySelector('.history-card-wrap') || historySec;
        if (cardWrap) {
            cardWrap.classList.remove('card-highlight-pulse');
            void cardWrap.offsetWidth;
            cardWrap.classList.add('card-highlight-pulse');
            setTimeout(() => cardWrap.classList.remove('card-highlight-pulse'), 2000);
        }
    }
}

function openSavingsTab() {
    const budgetSec = document.getElementById('budget-widget-card');
    if (budgetSec) {
        budgetSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
        budgetSec.classList.remove('card-highlight-pulse');
        void budgetSec.offsetWidth;
        budgetSec.classList.add('card-highlight-pulse');
        setTimeout(() => budgetSec.classList.remove('card-highlight-pulse'), 2000);
    }
}

const cardBalance = document.getElementById('card-filter-balance');
const cardIncome = document.getElementById('card-filter-income');
const cardExpense = document.getElementById('card-filter-expense');
const cardSavings = document.getElementById('card-filter-savings');

if (cardBalance) cardBalance.addEventListener('click', () => openHistoryTab('all'));
if (cardIncome) cardIncome.addEventListener('click', () => openHistoryTab('income'));
if (cardExpense) cardExpense.addEventListener('click', () => openHistoryTab('expense'));
if (cardSavings) cardSavings.addEventListener('click', openSavingsTab);

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

// ===================================================
// SUBSCRIPTIONS & RECURRING DEDUCTIONS ENGINE
// ===================================================
const SUBS_API_URL = (typeof window !== 'undefined' && typeof window.apiUrl === 'function')
    ? window.apiUrl('/api/subscriptions')
    : '/api/subscriptions';

// DOM Elements: Subscriptions Summary Card & Triggers
const cardOpenSubscriptions = document.getElementById('card-open-subscriptions');
const subActiveBadge = document.getElementById('sub-active-badge');
const subMonthlyTotal = document.getElementById('sub-monthly-total');
const subNextRenewalText = document.getElementById('sub-next-renewal-text');
const openSubscriptionsBtn = document.getElementById('open-subscriptions-btn');
const openSubsSidebarBtn = document.getElementById('open-subs-sidebar-btn');

// DOM Elements: Subscriptions Modal
const subscriptionsModal = document.getElementById('subscriptions-modal');
const closeSubscriptionsBtn = document.getElementById('close-subscriptions-btn');
const tabBtnSubActive = document.getElementById('tab-btn-sub-active');
const tabBtnSubAdd = document.getElementById('tab-btn-sub-add');
const subTabActiveView = document.getElementById('sub-tab-active-view');
const subTabAddView = document.getElementById('sub-tab-add-view');
const modalSubCount = document.getElementById('modal-sub-count');
const subModalMonthlyTotal = document.getElementById('sub-modal-monthly-total');
const subModalNextRenewal = document.getElementById('sub-modal-next-renewal');
const subscriptionsList = document.getElementById('subscriptions-list');
const subsEmptyState = document.getElementById('subs-empty-state');
const emptyStateAddSubBtn = document.getElementById('empty-state-add-sub-btn');
const subModalAlert = document.getElementById('sub-modal-alert');
const subModalAlertText = document.getElementById('sub-modal-alert-text');

// DOM Elements: Add Subscription Form
const addSubscriptionForm = document.getElementById('add-subscription-form');
const appsPresetGrid = document.getElementById('apps-preset-grid');
const subNameInput = document.getElementById('sub-name-input');
const subPlanInput = document.getElementById('sub-plan-input');
const subAmountInput = document.getElementById('sub-amount-input');
const subCategorySelect = document.getElementById('sub-category-select');
const durationPillsRow = document.getElementById('duration-pills-row');
const customMonthsWrap = document.getElementById('custom-months-wrap');
const subCustomMonthsInput = document.getElementById('sub-custom-months-input');
const subBillingDaySelect = document.getElementById('sub-billing-day');
const subAutoDeductCheckbox = document.getElementById('sub-auto-deduct-checkbox');
const subDeductNowCheckbox = document.getElementById('sub-deduct-now-checkbox');
const btnSubmitSubscription = document.getElementById('btn-submit-subscription');
const subSubmitBtnContent = document.getElementById('sub-submit-btn-content');

// Subscriptions State
let subscriptionsData = [];
let currentSelectedApp = {
    appId: 'netflix',
    name: 'Netflix',
    icon: 'fa-solid fa-film',
    color: '#E50914',
    category: 'Entertainment',
    plan: 'Standard'
};
let currentSelectedMonths = 6;

// Populate billing day options (1 - 31)
function initBillingDaySelect() {
    if (!subBillingDaySelect) return;
    subBillingDaySelect.innerHTML = '';
    const today = new Date().getDate();
    for (let day = 1; day <= 31; day++) {
        const opt = document.createElement('option');
        opt.value = day;
        opt.innerText = `${day}${getOrdinalSuffix(day)}`;
        if (day === today) opt.selected = true;
        subBillingDaySelect.appendChild(opt);
    }
}

function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

// Show alert inside subscription modal
function showSubAlert(msg, isError = false) {
    if (!subModalAlert || !subModalAlertText) return;
    subModalAlertText.innerText = msg;
    subModalAlert.className = isError ? 'alert-clean-error' : 'alert-clean-success';
    subModalAlert.style.display = 'flex';
    setTimeout(() => {
        if (subModalAlert) subModalAlert.style.display = 'none';
    }, 4500);
}

// Switch between modal tabs
function switchSubTab(tabName) {
    if (!tabBtnSubActive || !tabBtnSubAdd) return;
    if (tabName === 'active') {
        tabBtnSubActive.classList.add('active');
        tabBtnSubAdd.classList.remove('active');
        if (subTabActiveView) subTabActiveView.classList.add('active');
        if (subTabAddView) subTabAddView.classList.remove('active');
    } else {
        tabBtnSubActive.classList.remove('active');
        tabBtnSubAdd.classList.add('active');
        if (subTabActiveView) subTabActiveView.classList.remove('active');
        if (subTabAddView) subTabAddView.classList.add('active');
    }
}

// Open / Close Subscriptions Modal
function openSubscriptionsModal() {
    if (subscriptionsModal) subscriptionsModal.classList.add('active');
    loadSubscriptions(true);
}

function closeSubscriptionsModal() {
    if (subscriptionsModal) subscriptionsModal.classList.remove('active');
}

// App Preset Selection
function initAppPresetChips() {
    if (!appsPresetGrid) return;
    const chips = appsPresetGrid.querySelectorAll('.app-preset-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');

            const appId = chip.dataset.app;
            const appName = chip.dataset.name || '';
            const appIcon = chip.dataset.icon || 'fa-solid fa-credit-card';
            const appColor = chip.dataset.color || '#A970FF';
            const appCat = chip.dataset.cat || 'Entertainment';
            const appPlan = chip.dataset.plan || 'Standard';

            currentSelectedApp = {
                appId,
                name: appName,
                icon: appIcon,
                color: appColor,
                category: appCat,
                plan: appPlan
            };

            if (subNameInput) subNameInput.value = appName;
            if (subPlanInput) subPlanInput.value = appPlan;
            if (subCategorySelect) subCategorySelect.value = appCat;
            if (appId === 'custom' && subNameInput) {
                subNameInput.focus();
            }
        });
    });
}

// Duration Selection Pills & Custom Date/Month/Year Engine
const subCustomDaySelect = document.getElementById('sub-custom-day-select');
const subCustomMonthSelect = document.getElementById('sub-custom-month-select');
const subCustomYearSelect = document.getElementById('sub-custom-year-select');
const customCalculatedMonthsBadge = document.getElementById('custom-calculated-months-badge');
const customDatePreview = document.getElementById('custom-date-preview');

function initCustomDateSelectors() {
    const today = new Date();
    const currentYear = today.getFullYear();

    // Populate Days (1-31)
    if (subCustomDaySelect && subCustomDaySelect.options.length === 0) {
        subCustomDaySelect.innerHTML = '';
        for (let d = 1; d <= 31; d++) {
            const opt = document.createElement('option');
            opt.value = d;
            opt.innerText = `${d}${getOrdinalSuffix(d)}`;
            subCustomDaySelect.appendChild(opt);
        }
    }

    // Populate Years (Current Year to Current Year + 10)
    if (subCustomYearSelect && subCustomYearSelect.options.length === 0) {
        subCustomYearSelect.innerHTML = '';
        for (let y = currentYear; y <= currentYear + 10; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.innerText = y;
            subCustomYearSelect.appendChild(opt);
        }
    }

    syncCustomDateFromMonths(currentSelectedMonths || 6);
}

// Sync Date/Month/Year dropdowns when a specific month count is given
function syncCustomDateFromMonths(monthsCount) {
    const today = new Date();
    const target = new Date(today);
    target.setMonth(target.getMonth() + parseInt(monthsCount || 1));

    const day = target.getDate();
    const month = target.getMonth();
    const year = target.getFullYear();

    if (subCustomDaySelect) subCustomDaySelect.value = day;
    if (subCustomMonthSelect) subCustomMonthSelect.value = month;
    if (subCustomYearSelect) subCustomYearSelect.value = year;

    updateCustomDateDisplay(day, month, year, monthsCount);
}

// Calculate months and update display when user changes Date, Month, or Year
function updateFromCustomDateSelectors() {
    if (!subCustomDaySelect || !subCustomMonthSelect || !subCustomYearSelect) return;

    let day = parseInt(subCustomDaySelect.value) || 1;
    const month = parseInt(subCustomMonthSelect.value) || 0;
    const year = parseInt(subCustomYearSelect.value) || new Date().getFullYear();

    // Clamp days according to max days in selected month/year (e.g. Feb 28/29)
    const maxDays = new Date(year, month + 1, 0).getDate();
    if (day > maxDays) {
        day = maxDays;
        subCustomDaySelect.value = day;
    }

    const today = new Date();
    let monthsDiff = (year - today.getFullYear()) * 12 + (month - today.getMonth());
    if (day >= today.getDate()) {
        // Includes full current billing cycle
    }
    if (monthsDiff < 1) monthsDiff = 1;

    currentSelectedMonths = monthsDiff;
    if (subCustomMonthsInput) subCustomMonthsInput.value = monthsDiff;

    // Sync renewal day with chosen custom date
    if (subBillingDaySelect) {
        subBillingDaySelect.value = day;
    }

    updateCustomDateDisplay(day, month, year, monthsDiff);
}

function updateCustomDateDisplay(day, month, year, months) {
    const formatted = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    if (customDatePreview) {
        customDatePreview.innerText = formatted;
    }
    if (customCalculatedMonthsBadge) {
        customCalculatedMonthsBadge.innerText = `${months} Month${months > 1 ? 's' : ''}`;
    }
}

function initDurationPills() {
    initCustomDateSelectors();

    if (subCustomDaySelect) subCustomDaySelect.addEventListener('change', updateFromCustomDateSelectors);
    if (subCustomMonthSelect) subCustomMonthSelect.addEventListener('change', updateFromCustomDateSelectors);
    if (subCustomYearSelect) subCustomYearSelect.addEventListener('change', updateFromCustomDateSelectors);

    if (subCustomMonthsInput) {
        subCustomMonthsInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (val && val > 0) {
                currentSelectedMonths = val;
                syncCustomDateFromMonths(val);
            }
        });
    }

    if (!durationPillsRow) return;
    const pills = durationPillsRow.querySelectorAll('.duration-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const months = pill.dataset.months;
            if (months === 'custom') {
                if (customMonthsWrap) customMonthsWrap.style.display = 'block';
                initCustomDateSelectors();
                updateFromCustomDateSelectors();
            } else {
                if (customMonthsWrap) customMonthsWrap.style.display = 'none';
                currentSelectedMonths = parseInt(months) || 1;
            }
        });
    });
}

// ===================================================
// NOTIFICATIONS & TOAST ALERTS ENGINE
// ===================================================
const headerNotificationBtn = document.getElementById('header-notification-btn');
const headerNotifBadge = document.getElementById('header-notif-badge');
const notificationDropdown = document.getElementById('notification-dropdown');
const notifList = document.getElementById('notif-list');
const notifEmpty = document.getElementById('notif-empty');
const notifClearAllBtn = document.getElementById('notif-clear-all');
const toastContainer = document.getElementById('toast-container');

function getNotificationStorageKey() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return 'wallet_notifications_' + (user ? user.id || user._id || user.email : 'default');
    } catch (e) {
        return 'wallet_notifications_default';
    }
}

function getStoredNotifications() {
    try {
        const raw = localStorage.getItem(getNotificationStorageKey());
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveStoredNotifications(notifs) {
    try {
        localStorage.setItem(getNotificationStorageKey(), JSON.stringify(notifs));
    } catch (e) {}
}

function updateNotificationBadge() {
    const notifs = getStoredNotifications();
    const unreadCount = notifs.filter(n => !n.read).length;
    if (headerNotifBadge) {
        if (unreadCount > 0) {
            headerNotifBadge.innerText = unreadCount > 9 ? '9+' : unreadCount;
            headerNotifBadge.style.display = 'inline-block';
        } else {
            headerNotifBadge.style.display = 'none';
        }
    }
}

function renderNotificationsDropdown() {
    if (!notifList) return;
    const notifs = getStoredNotifications();

    if (notifs.length === 0) {
        notifList.innerHTML = '';
        if (notifEmpty) notifEmpty.style.display = 'flex';
        return;
    }

    if (notifEmpty) notifEmpty.style.display = 'none';
    notifList.innerHTML = '';

    notifs.slice(0, 20).forEach(notif => {
        const item = document.createElement('div');
        item.className = `notif-item ${notif.read ? 'read' : 'unread'}`;

        const timeStr = notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

        item.innerHTML = `
            <div class="notif-item-icon" style="background: ${notif.color || '#A970FF'}22; color: ${notif.color || '#A970FF'}; border: 1px solid ${notif.color || '#A970FF'}44;">
                <i class="${escapeHTML(notif.icon || 'fa-solid fa-credit-card')}"></i>
            </div>
            <div class="notif-item-body">
                <div class="notif-item-title">
                    <span>${escapeHTML(notif.title || 'Subscription Payment')}</span>
                    <span class="notif-item-amount">-₹${Math.abs(notif.amount || 0)}</span>
                </div>
                <div class="notif-item-msg">${escapeHTML(notif.message)}</div>
                <div class="notif-item-time"><i class="fa-regular fa-clock"></i> ${timeStr}</div>
            </div>
        `;
        notifList.appendChild(item);
    });
}

function addNotification(notif) {
    if (!notif) return;
    const notifs = getStoredNotifications();
    // Avoid exact duplicates
    if (notif.id && notifs.some(n => n.id === notif.id)) return;

    notifs.unshift({
        id: notif.id || 'notif_' + Date.now(),
        type: notif.type || 'deduction',
        title: notif.title || 'Subscription Payment Deducted',
        subName: notif.subName || '',
        amount: notif.amount || 0,
        message: notif.message || '',
        icon: notif.icon || 'fa-solid fa-credit-card',
        color: notif.color || '#A970FF',
        timestamp: notif.timestamp || new Date().toISOString(),
        read: false
    });

    saveStoredNotifications(notifs.slice(0, 50));
    updateNotificationBadge();
    renderNotificationsDropdown();
}

function clearAllNotifications() {
    saveStoredNotifications([]);
    updateNotificationBadge();
    renderNotificationsDropdown();
}

// Show Floating Toast Notification + Native Desktop Push Notification
function showToastNotification(notif) {
    if (!toastContainer || !notif) return;

    const toast = document.createElement('div');
    toast.className = 'toast-card';

    toast.innerHTML = `
        <div class="toast-icon" style="background: ${notif.color || '#A970FF'}25; color: ${notif.color || '#A970FF'}; border: 1px solid ${notif.color || '#A970FF'}44;">
            <i class="${escapeHTML(notif.icon || 'fa-solid fa-credit-card')}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-header">
                <span class="toast-title">${escapeHTML(notif.title || 'Subscription Deducted')}</span>
                <span class="toast-amount">-₹${Math.abs(notif.amount || 0)}</span>
            </div>
            <div class="toast-body">${escapeHTML(notif.message)}</div>
            <div class="toast-footer">
                <span><i class="fa-solid fa-circle-check"></i> Balance updated automatically</span>
                <button type="button" class="toast-close-btn" aria-label="Close notification"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
        <div class="toast-progress-bar"></div>
    `;

    toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close-btn');
    let isRemoved = false;
    const dismiss = () => {
        if (isRemoved) return;
        isRemoved = true;
        toast.classList.add('leaving');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    };

    if (closeBtn) closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, 6000);

    // Trigger Browser Native Desktop Notification
    if ('Notification' in window) {
        const bodyText = notif.message || `₹${Math.abs(notif.amount || 0)} deducted for ${notif.subName}`;
        if (Notification.permission === 'granted') {
            try {
                new Notification(notif.title || 'Wallet: Subscription Deducted', {
                    body: bodyText,
                    icon: '/favicon.ico'
                });
            } catch (e) {}
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    try {
                        new Notification(notif.title || 'Wallet: Subscription Deducted', {
                            body: bodyText,
                            icon: '/favicon.ico'
                        });
                    } catch (e) {}
                }
            });
        }
    }
}

function initNotificationsUI() {
    const notifBtn = document.getElementById('header-notification-btn');
    const notifDropdown = document.getElementById('notification-dropdown');
    const notifClearBtn = document.getElementById('notif-clear-all');

    if (notifBtn && notifDropdown) {
        notifBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (userDropdown) {
                userDropdown.classList.remove('show');
                userDropdown.classList.remove('active');
            }
            const isCurrentlyOpen = notifDropdown.classList.contains('show') || notifDropdown.classList.contains('active');
            if (isCurrentlyOpen) {
                notifDropdown.classList.remove('show');
                notifDropdown.classList.remove('active');
            } else {
                notifDropdown.classList.add('show');
                notifDropdown.classList.add('active');
                // Mark notifications as read
                const notifs = getStoredNotifications();
                notifs.forEach(n => n.read = true);
                saveStoredNotifications(notifs);
                updateNotificationBadge();
                renderNotificationsDropdown();
            }
        };
    }

    if (notifClearBtn) {
        notifClearBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            clearAllNotifications();
        };
    }

    window.addEventListener('click', (e) => {
        const btn = document.getElementById('header-notification-btn');
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
            dropdown.classList.remove('active');
        }
    });

    // Request notification permission once user interacts
    if ('Notification' in window && Notification.permission === 'default') {
        const btn = document.getElementById('header-notification-btn');
        btn?.addEventListener('click', () => {
            Notification.requestPermission();
        }, { once: true });
    }

    updateNotificationBadge();
    renderNotificationsDropdown();
}

// Ensure notification UI is active immediately on load
initNotificationsUI();

// Load Subscriptions from Server
async function loadSubscriptions(skipTxRefresh = false) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(SUBS_API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status === 401) return;

        const result = await res.json();
        if (!result.success) {
            console.error('Failed to load subscriptions:', result.error);
            return;
        }

        subscriptionsData = result.data || [];
        const activeCount = result.activeCount || 0;
        const monthlyTotal = result.monthlyTotal || 0;
        const nextRenewal = result.nextRenewal;

        // Process any deduction notifications returned by backend
        if (result.notifications && result.notifications.length > 0) {
            result.notifications.forEach(notif => {
                addNotification(notif);
                showToastNotification(notif);
            });
        }

        // Update Dashboard Summary Card
        if (subActiveBadge) {
            subActiveBadge.innerText = `${activeCount} Active`;
        }
        if (subMonthlyTotal) {
            subMonthlyTotal.innerText = formatCurrency(monthlyTotal);
        }
        if (subNextRenewalText) {
            if (nextRenewal) {
                const renewDate = new Date(nextRenewal.nextBillingDate);
                const isToday = renewDate.toDateString() === new Date().toDateString();
                subNextRenewalText.innerHTML = `<i class="fa-regular fa-clock" style="color: var(--income-teal);"></i> Next: <strong>${escapeHTML(nextRenewal.name)}</strong> (${isToday ? 'Today' : formatDateMedium(renewDate)})`;
            } else {
                subNextRenewalText.innerHTML = `<i class="fa-solid fa-check" style="color: var(--income-teal);"></i> No upcoming renewals`;
            }
        }

        // Update Modal Stats
        if (modalSubCount) modalSubCount.innerText = activeCount;
        if (subModalMonthlyTotal) subModalMonthlyTotal.innerText = `${formatCurrency(monthlyTotal)}/mo`;
        if (subModalNextRenewal) {
            if (nextRenewal) {
                const renewDate = new Date(nextRenewal.nextBillingDate);
                subModalNextRenewal.innerText = `${nextRenewal.name} · ${formatDateMedium(renewDate)}`;
            } else {
                subModalNextRenewal.innerText = 'None due';
            }
        }

        // Render Cards in Modal
        renderSubscriptionsList(subscriptionsData);

        // If backend auto-deducted any due subscriptions, refresh transactions to reflect immediate balance change!
        if (!skipTxRefresh && result.autoDeductedCount > 0) {
            await getTransactions();
        }
    } catch (err) {
        console.error('Error in loadSubscriptions:', err);
    }
}

// Render Subscriptions List in Modal
function renderSubscriptionsList(subs) {
    if (!subscriptionsList) return;

    if (!subs || subs.length === 0) {
        subscriptionsList.innerHTML = '';
        if (subsEmptyState) subsEmptyState.style.display = 'block';
        return;
    }

    if (subsEmptyState) subsEmptyState.style.display = 'none';
    subscriptionsList.innerHTML = '';

    subs.forEach(sub => {
        const card = document.createElement('div');
        card.className = `sub-card-item ${sub.status}`;

        const isCompleted = sub.status === 'completed';
        const isPaused = sub.status === 'paused';
        const isActive = sub.status === 'active';

        // Duration progress
        const duration = sub.durationMonths || 1;
        const paid = sub.monthsPaid || 0;
        const remaining = Math.max(0, duration - paid);
        const percent = Math.min(100, Math.round((paid / duration) * 100));

        // Renewal date formatting
        let renewalDisplay = '';
        if (isCompleted) {
            renewalDisplay = '<span style="color: var(--savings-green);"><i class="fa-solid fa-circle-check"></i> All months completed</span>';
        } else if (isPaused) {
            renewalDisplay = '<span style="color: #EAB308;"><i class="fa-solid fa-circle-pause"></i> Auto-deduct paused</span>';
        } else {
            const nextDate = new Date(sub.nextBillingDate);
            renewalDisplay = `Next: <strong>${formatDateMedium(nextDate)}</strong> (Day ${sub.billingDay})`;
        }

        // Status badge
        const statusBadge = `<span class="sub-status-tag ${sub.status}">
            <i class="fa-solid ${isActive ? 'fa-circle-play' : isCompleted ? 'fa-circle-check' : isPaused ? 'fa-circle-pause' : 'fa-ban'}"></i>
            ${sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
        </span>`;

        card.innerHTML = `
            <div class="sub-card-header">
                <div class="sub-card-app">
                    <div class="sub-card-icon" style="background: ${sub.color || '#A970FF'}22; color: ${sub.color || '#A970FF'}; border: 1px solid ${sub.color || '#A970FF'}44;">
                        <i class="${escapeHTML(sub.icon || 'fa-solid fa-credit-card')}"></i>
                    </div>
                    <div class="sub-card-info">
                        <h4>
                            ${escapeHTML(sub.name)}
                            <span class="sub-card-plan-badge">${escapeHTML(sub.plan || 'Plan')}</span>
                            ${statusBadge}
                        </h4>
                        <div class="sub-card-category"><i class="fa-solid fa-tag"></i> ${escapeHTML(sub.category || 'Entertainment')}</div>
                    </div>
                </div>
                <div class="sub-card-pricing">
                    <div class="sub-card-amount">${formatCurrency(sub.amount)}</div>
                    <div class="sub-card-cycle">/month</div>
                </div>
            </div>

            <!-- Duration & Progress Section -->
            <div class="sub-card-progress-wrap">
                <div class="sub-progress-header">
                    <span class="progress-label">
                        <i class="fa-solid fa-calendar-check"></i> Duration: ${duration} month${duration > 1 ? 's' : ''}
                    </span>
                    <span class="progress-val">
                        ${paid} of ${duration} paid ${remaining > 0 ? `(${remaining} left)` : '✓ Complete'}
                    </span>
                </div>
                <div class="sub-progress-bar-track">
                    <div class="sub-progress-bar-fill ${isCompleted ? 'completed' : ''}" style="width: ${percent}%;"></div>
                </div>
            </div>

            <div class="sub-card-footer">
                <div class="sub-card-next-renewal">
                    <i class="fa-regular fa-calendar-days"></i> ${renewalDisplay}
                </div>
                <div class="sub-card-actions">
                    ${isActive ? `
                        <button type="button" class="sub-action-btn" onclick="toggleSubPause('${sub._id}', 'paused')" title="Pause automatic monthly deduction">
                            <i class="fa-solid fa-pause"></i> Pause
                        </button>
                    ` : isPaused ? `
                        <button type="button" class="sub-action-btn" onclick="toggleSubPause('${sub._id}', 'active')" title="Resume automatic deduction">
                            <i class="fa-solid fa-play"></i> Resume
                        </button>
                    ` : ''}
                    <button type="button" class="sub-action-btn delete" onclick="deleteSubscription('${sub._id}')" title="Delete subscription">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;

        subscriptionsList.appendChild(card);
    });
}

// Pause or Resume Subscription
async function toggleSubPause(subId, newStatus) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${SUBS_API_URL}/${subId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await res.json();
        if (data.success) {
            showSubAlert(`Subscription ${newStatus === 'active' ? 'resumed' : 'paused'} successfully!`);
            await loadSubscriptions(true);
        } else {
            showSubAlert(data.error || 'Failed to update subscription', true);
        }
    } catch (err) {
        console.error('Error toggling subscription status:', err);
        showSubAlert('Error updating subscription', true);
    }
}

// Delete Subscription
async function deleteSubscription(subId) {
    if (!confirm('Are you sure you want to remove this subscription? (Past generated transactions will not be deleted).')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${SUBS_API_URL}/${subId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();
        if (data.success) {
            showSubAlert('Subscription deleted successfully');
            await loadSubscriptions(true);
        } else {
            showSubAlert(data.error || 'Failed to delete subscription', true);
        }
    } catch (err) {
        console.error('Error deleting subscription:', err);
        showSubAlert('Error deleting subscription', true);
    }
}

// Handle Add Subscription Form Submission
async function handleAddSubscriptionSubmit(e) {
    e.preventDefault();

    const name = subNameInput ? subNameInput.value.trim() : '';
    const plan = subPlanInput ? subPlanInput.value.trim() : 'Standard';
    const amount = subAmountInput ? parseFloat(subAmountInput.value) : 0;
    const category = subCategorySelect ? subCategorySelect.value : 'Entertainment';
    const billingDay = subBillingDaySelect ? parseInt(subBillingDaySelect.value) : new Date().getDate();
    const autoDeduct = subAutoDeductCheckbox ? subAutoDeductCheckbox.checked : true;
    const deductImmediately = subDeductNowCheckbox ? subDeductNowCheckbox.checked : true;

    if (!name) {
        showSubAlert('Please specify the application or service name', true);
        if (subNameInput) subNameInput.focus();
        return;
    }

    if (!amount || amount <= 0) {
        showSubAlert('Please specify a valid monthly amount', true);
        if (subAmountInput) subAmountInput.focus();
        return;
    }

    let durationMonths = currentSelectedMonths;
    if (customMonthsWrap && customMonthsWrap.style.display !== 'none' && subCustomMonthsInput) {
        const parsedCustom = parseInt(subCustomMonthsInput.value);
        if (parsedCustom && parsedCustom > 0) {
            durationMonths = parsedCustom;
        } else {
            showSubAlert('Please enter a valid number of months for the custom duration', true);
            subCustomMonthsInput.focus();
            return;
        }
    }

    if (btnSubmitSubscription) btnSubmitSubscription.disabled = true;
    if (subSubmitBtnContent) {
        subSubmitBtnContent.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Setting up Subscription...';
    }

    try {
        const token = localStorage.getItem('token');
        const payload = {
            name,
            appId: currentSelectedApp.appId,
            icon: currentSelectedApp.icon,
            color: currentSelectedApp.color,
            plan,
            amount,
            category,
            durationMonths,
            billingDay,
            autoDeduct,
            deductImmediately
        };

        const res = await fetch(SUBS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.status === 201 && data.success) {
            showSubAlert(`Subscription for ${name} added! ${deductImmediately ? 'First month deducted from balance.' : ''}`);

            // Trigger notification for immediate deduction
            if (data.notification) {
                addNotification(data.notification);
                showToastNotification(data.notification);
            }

            // Reset form
            if (addSubscriptionForm) addSubscriptionForm.reset();
            initBillingDaySelect();
            if (subCustomMonthsInput) subCustomMonthsInput.value = '';
            if (customMonthsWrap) customMonthsWrap.style.display = 'none';

            // Refresh subscriptions list
            await loadSubscriptions(true);

            // If immediate deduction occurred, refresh transactions & recalculate balance
            if (deductImmediately) {
                await getTransactions();
            }

            // Switch back to active list tab
            setTimeout(() => {
                switchSubTab('active');
            }, 600);
        } else {
            showSubAlert(data.error || 'Failed to create subscription', true);
        }
    } catch (err) {
        console.error('Error creating subscription:', err);
        showSubAlert('Server error creating subscription', true);
    } finally {
        if (btnSubmitSubscription) btnSubmitSubscription.disabled = false;
        if (subSubmitBtnContent) {
            subSubmitBtnContent.innerHTML = '<i class="fa-solid fa-plus"></i> Start Subscription & Auto-Deduct';
        }
    }
}

// Wire up Subscriptions Event Listeners
function initSubscriptionsUI() {
    initBillingDaySelect();
    initAppPresetChips();
    initDurationPills();

    // Summary Card Click -> Open Subscriptions Modal
    if (cardOpenSubscriptions) {
        cardOpenSubscriptions.addEventListener('click', openSubscriptionsModal);
    }

    // Header Dropdown -> Open Subscriptions Modal
    if (openSubscriptionsBtn) {
        openSubscriptionsBtn.addEventListener('click', () => {
            if (userDropdown) userDropdown.classList.remove('active');
            openSubscriptionsModal();
        });
    }

    // Sidebar button -> Open Subscriptions Modal
    if (openSubsSidebarBtn) {
        openSubsSidebarBtn.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            openSubscriptionsModal();
        });
    }

    // Close Modal Button
    if (closeSubscriptionsBtn) {
        closeSubscriptionsBtn.addEventListener('click', closeSubscriptionsModal);
    }

    // Modal Background Click
    if (subscriptionsModal) {
        subscriptionsModal.addEventListener('click', (e) => {
            if (e.target === subscriptionsModal) {
                closeSubscriptionsModal();
            }
        });
    }

    // Modal Tab Switching
    if (tabBtnSubActive) {
        tabBtnSubActive.addEventListener('click', () => switchSubTab('active'));
    }
    if (tabBtnSubAdd) {
        tabBtnSubAdd.addEventListener('click', () => switchSubTab('add'));
    }
    if (emptyStateAddSubBtn) {
        emptyStateAddSubBtn.addEventListener('click', () => switchSubTab('add'));
    }

    // Add Subscription Form Submit
    if (addSubscriptionForm) {
        addSubscriptionForm.addEventListener('submit', handleAddSubscriptionSubmit);
    }
}

// ===================================================
// EXPORT TRANSACTIONS CONTROLLER
// ===================================================
let activeExportScope = 'filtered'; // 'filtered' or 'all'

const historyExportBtn = document.getElementById('history-export-btn');
const exportModal = document.getElementById('export-modal');
const closeExportBtn = document.getElementById('close-export-btn');
const exportAlertBox = document.getElementById('export-alert-box');
const exportAlertText = document.getElementById('export-alert-text');
const closeExportAlertBtn = document.getElementById('close-export-alert-btn');
const exportScopeFiltered = document.getElementById('export-scope-filtered');
const exportScopeAll = document.getElementById('export-scope-all');
const exportTargetCount = document.getElementById('export-target-count');
const exportContextDetails = document.getElementById('export-context-details');
const btnExportCSV = document.getElementById('btn-export-csv');
const btnExportExcel = document.getElementById('btn-export-excel');
const btnExportPDF = document.getElementById('btn-export-pdf');
const btnQuickExportAll = document.getElementById('btn-quick-export-all');
const exportLoadingOverlay = document.getElementById('export-loading-overlay');
const exportLoadingStatus = document.getElementById('export-loading-status');

function openExportModal() {
    if (!exportModal) return;
    hideExportAlert();
    setExportScope('filtered');
    updateExportContextUI();
    exportModal.classList.add('active');
}

function closeExportModal() {
    if (!exportModal) return;
    exportModal.classList.remove('active');
    hideExportLoading();
    hideExportAlert();
}

function showExportAlert(msg) {
    if (!exportAlertBox || !exportAlertText) return;
    exportAlertText.textContent = msg;
    exportAlertBox.style.display = 'flex';
}

function hideExportAlert() {
    if (exportAlertBox) {
        exportAlertBox.style.display = 'none';
    }
}

function showExportLoading(msg = 'Preparing export...') {
    if (!exportLoadingOverlay) return;
    if (exportLoadingStatus) exportLoadingStatus.textContent = msg;
    exportLoadingOverlay.style.display = 'flex';
}

function hideExportLoading() {
    if (exportLoadingOverlay) {
        exportLoadingOverlay.style.display = 'none';
    }
}

function setExportScope(scope) {
    activeExportScope = scope;
    if (exportScopeFiltered) exportScopeFiltered.classList.toggle('active', scope === 'filtered');
    if (exportScopeAll) exportScopeAll.classList.toggle('active', scope === 'all');
    updateExportContextUI();
}

function updateExportContextUI() {
    if (!exportContextDetails || !exportTargetCount) return;

    if (activeExportScope === 'all') {
        const activeAll = transactions.filter(t => !t.isDeleted);
        exportTargetCount.textContent = `${activeAll.length} transaction${activeAll.length === 1 ? '' : 's'}`;
        exportContextDetails.innerHTML = `
            <span class="export-filter-chip"><i class="fa-solid fa-infinity"></i> All Time (Lifetime)</span>
            <span class="export-filter-chip"><i class="fa-solid fa-layer-group"></i> All Categories & Types</span>
        `;
        return;
    }

    // Filtered Scope: calculate filtered count and chips matching history table
    let listData = getFilteredTransactions();

    if (historySearchTerm) {
        listData = listData.filter(t =>
            (t.text && t.text.toLowerCase().includes(historySearchTerm)) ||
            (t.category && t.category.toLowerCase().includes(historySearchTerm))
        );
    }
    if (sidebarCategoryFilter) {
        listData = listData.filter(t => (t.category || '').toLowerCase() === sidebarCategoryFilter);
    }
    if (historyTypeFilter === 'income') {
        listData = listData.filter(t => t.amount > 0);
    } else if (historyTypeFilter === 'expense') {
        listData = listData.filter(t => t.amount < 0);
    }

    exportTargetCount.textContent = `${listData.length} transaction${listData.length === 1 ? '' : 's'}`;

    // Generate chips
    let chipsHtml = '';

    // Period chip
    if (selectedDashboardDate) {
        chipsHtml += `<span class="export-filter-chip"><i class="fa-regular fa-calendar-day"></i> ${selectedDashboardDate}</span>`;
    } else if (selectedMonth === 'lifetime') {
        chipsHtml += `<span class="export-filter-chip"><i class="fa-solid fa-infinity"></i> All Time</span>`;
    } else if (selectedMonth === 'all') {
        chipsHtml += `<span class="export-filter-chip"><i class="fa-regular fa-calendar"></i> Year ${selectedYear}</span>`;
    } else {
        const mName = MONTH_NAMES_FULL[selectedMonth] || 'Month';
        chipsHtml += `<span class="export-filter-chip"><i class="fa-regular fa-calendar"></i> ${mName} ${selectedYear}</span>`;
    }

    // Type chip
    if (historyTypeFilter === 'income') {
        chipsHtml += `<span class="export-filter-chip"><i class="fa-solid fa-arrow-up" style="color: var(--income-teal);"></i> Income only</span>`;
    } else if (historyTypeFilter === 'expense') {
        chipsHtml += `<span class="export-filter-chip"><i class="fa-solid fa-arrow-down" style="color: var(--expense-coral);"></i> Expense only</span>`;
    } else {
        chipsHtml += `<span class="export-filter-chip"><i class="fa-solid fa-arrows-up-down"></i> Income & Expense</span>`;
    }

    // Category chip
    if (sidebarCategoryFilter) {
        const catInfo = getCategoryInfo(sidebarCategoryFilter);
        chipsHtml += `<span class="export-filter-chip"><i class="fa-solid ${catInfo.icon}"></i> ${catInfo.label}</span>`;
    }

    // Search chip
    if (historySearchTerm) {
        chipsHtml += `<span class="export-filter-chip"><i class="fa-solid fa-magnifying-glass"></i> "${escapeHTML(historySearchTerm)}"</span>`;
    }

    exportContextDetails.innerHTML = chipsHtml;
}

/**
 * Trigger backend export for specified format
 */
async function exportTransactions(format, overrideScope = null) {
    hideExportAlert();
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const scopeToUse = overrideScope || activeExportScope;
    const params = new URLSearchParams();

    if (scopeToUse === 'all') {
        params.append('scope', 'all');
    } else {
        params.append('scope', 'filtered');

        if (selectedDashboardDate) {
            params.append('date', selectedDashboardDate);
        } else if (selectedMonth === 'lifetime') {
            params.append('month', 'lifetime');
        } else if (selectedMonth === 'all') {
            params.append('month', 'all');
            params.append('year', selectedYear);
        } else {
            params.append('month', selectedMonth);
            params.append('year', selectedYear);
        }

        if (historyTypeFilter && historyTypeFilter !== 'all') {
            params.append('type', historyTypeFilter);
        }

        if (sidebarCategoryFilter) {
            params.append('category', sidebarCategoryFilter);
        }

        if (historySearchTerm) {
            params.append('search', historySearchTerm);
        }

        if (historySortOption) {
            params.append('sort', historySortOption);
        }
    }

    showExportLoading('Preparing export...');

    try {
        const rawUrl = `/api/transactions/export/${format}?${params.toString()}`;
        const url = (typeof window !== 'undefined' && typeof window.apiUrl === 'function') ? window.apiUrl(rawUrl) : rawUrl;
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        // Check if response is JSON (empty data or error)
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await res.json();
            hideExportLoading();
            showExportAlert(data.error || 'No transactions found for the selected filters.');
            return;
        }

        if (!res.ok) {
            hideExportLoading();
            showExportAlert('Unable to export transactions. Please try again.');
            return;
        }

        // Extract filename from Content-Disposition header if available
        let downloadFileName = `Wallet_Transactions.${format === 'excel' ? 'xlsx' : format}`;
        const disposition = res.headers.get('content-disposition');
        if (disposition && disposition.indexOf('filename=') !== -1) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
            if (matches != null && matches[1]) {
                downloadFileName = matches[1].replace(/['"]/g, '');
            }
        }

        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        hideExportLoading();
        closeExportModal();
    } catch (err) {
        console.error('Export download error:', err);
        hideExportLoading();
        showExportAlert('Unable to export transactions. Please try again.');
    }
}

function initExportUI() {
    if (historyExportBtn) {
        historyExportBtn.addEventListener('click', openExportModal);
    }

    if (closeExportBtn) {
        closeExportBtn.addEventListener('click', closeExportModal);
    }

    if (closeExportAlertBtn) {
        closeExportAlertBtn.addEventListener('click', hideExportAlert);
    }

    if (exportScopeFiltered) {
        exportScopeFiltered.addEventListener('click', () => setExportScope('filtered'));
    }

    if (exportScopeAll) {
        exportScopeAll.addEventListener('click', () => setExportScope('all'));
    }

    if (btnExportCSV) {
        btnExportCSV.addEventListener('click', () => exportTransactions('csv'));
    }

    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => exportTransactions('excel'));
    }

    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', () => exportTransactions('pdf'));
    }

    if (btnQuickExportAll) {
        btnQuickExportAll.addEventListener('click', () => {
            setExportScope('all');
            exportTransactions('csv', 'all');
        });
    }

    if (exportModal) {
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                closeExportModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && exportModal && exportModal.classList.contains('active')) {
            closeExportModal();
        }
        if (e.key === 'Escape' && importPaymentModal && importPaymentModal.classList.contains('active')) {
            closeImportModal();
        }
    });
}

// ===================================================
// IMPORT PAYMENT CONTROLLER (PHONEPE / SHARE INTENT)
// ===================================================
let activeImportScreenshotBase64 = null;
let activeImportType = 'expense';

const importPaymentModal = document.getElementById('import-payment-modal');
const closeImportBtn = document.getElementById('close-import-btn');
const btnCancelImport = document.getElementById('btn-cancel-import');
const btnSaveImport = document.getElementById('btn-save-import');
const importForm = document.getElementById('import-payment-form');
const importBadgeSource = document.getElementById('import-badge-source');
const importDuplicateAlert = document.getElementById('import-duplicate-alert');
const importDuplicateDesc = document.getElementById('import-duplicate-desc');

const importScreenshotPreviewWrap = document.getElementById('import-screenshot-preview-wrap');
const importScreenshotImg = document.getElementById('import-screenshot-img');
const btnToggleScreenshot = document.getElementById('btn-toggle-screenshot');
const screenshotImgContainer = document.getElementById('screenshot-img-container');

const importRawTextWrap = document.getElementById('import-raw-text-wrap');
const importRawToggle = document.getElementById('import-raw-toggle');
const importRawText = document.getElementById('import-raw-text');
const importRawChevron = document.getElementById('import-raw-chevron');

const importAmount = document.getElementById('import-amount');
const importMerchant = document.getElementById('import-merchant');
const importCategory = document.getElementById('import-category');
const importCategoryStatus = document.getElementById('import-category-status');
const importCategoryTip = document.getElementById('import-category-tip');
const importDate = document.getElementById('import-date');
const importTime = document.getElementById('import-time');
const importMethod = document.getElementById('import-method');
const importRef = document.getElementById('import-ref');
const importNote = document.getElementById('import-note');
const importTypeExpenseBtn = document.getElementById('import-type-expense-btn');
const importTypeIncomeBtn = document.getElementById('import-type-income-btn');

function openImportModal() {
    if (importPaymentModal) {
        importPaymentModal.classList.add('active');
    }
}

function closeImportModal() {
    if (importPaymentModal) {
        importPaymentModal.classList.remove('active');
    }
    activeImportScreenshotBase64 = null;
}

function setImportType(type) {
    activeImportType = type;
    if (importTypeExpenseBtn && importTypeIncomeBtn) {
        importTypeExpenseBtn.classList.toggle('active', type === 'expense');
        importTypeIncomeBtn.classList.toggle('active', type === 'income');
        const expRadio = importTypeExpenseBtn.querySelector('input');
        const incRadio = importTypeIncomeBtn.querySelector('input');
        if (expRadio) expRadio.checked = (type === 'expense');
        if (incRadio) incRadio.checked = (type === 'income');
    }
}

/**
 * Handle incoming Android Share Intent (Text or Image)
 */
async function handleWalletShareIntent(payload) {
    console.log('[Wallet Share Intent Received]:', payload);
    if (!payload) return;

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        try {
            localStorage.setItem('pending_share_payload', JSON.stringify(payload));
        } catch (e) {}
        window.location.href = 'login.html';
        return;
    }

    const rawText = payload.text || '';
    const isImage = (payload.type === 'image' || !!payload.imageBase64);

    // Source badge
    if (importBadgeSource) {
        let sourceLabel = 'Shared Payment';
        const lower = rawText.toLowerCase();
        if (lower.includes('phonepe')) sourceLabel = 'PhonePe Payment';
        else if (lower.includes('gpay') || lower.includes('google pay')) sourceLabel = 'Google Pay';
        else if (lower.includes('paytm')) sourceLabel = 'Paytm UPI';
        else if (isImage) sourceLabel = 'Payment Screenshot';
        importBadgeSource.innerHTML = `<i class="fa-solid fa-bolt" style="color: var(--primary-purple);"></i> ${sourceLabel}`;
    }

    // Screenshot preview
    if (payload.imageBase64) {
        activeImportScreenshotBase64 = payload.imageBase64;
        if (importScreenshotImg) importScreenshotImg.src = payload.imageBase64;
        if (importScreenshotPreviewWrap) importScreenshotPreviewWrap.style.display = 'block';
    } else {
        activeImportScreenshotBase64 = null;
        if (importScreenshotPreviewWrap) importScreenshotPreviewWrap.style.display = 'none';
    }

    // Raw text collapsible
    if (rawText && importRawTextWrap && importRawText) {
        importRawText.textContent = rawText;
        importRawTextWrap.style.display = 'block';
    } else if (importRawTextWrap) {
        importRawTextWrap.style.display = 'none';
    }

    // Parse payment text using paymentParser.js
    let parsed = {
        amount: null,
        merchant: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        referenceId: '',
        note: '',
        type: 'expense',
        paymentMethod: 'UPI',
        category: '',
        needsCategorySelection: true
    };

    if (window.PaymentParser && window.PaymentParser.parsePaymentText) {
        parsed = window.PaymentParser.parsePaymentText(rawText);
    }

    // Open the modal FIRST so the DOM element is guaranteed to exist
    openImportModal();

    // 1. Verify actual parsed object on Android (Requirement 1)
    console.log('[WalletShare] FINAL PARSED RESULT:', parsed);
    console.log('[WalletShare] parsed amount:', parsed.amount);

    // 2. Verify actual HTML element (Requirement 2)
    const amountInput = document.getElementById('import-amount');
    console.log('[WalletShare] amount input:', amountInput);
    console.log(
        '[WalletShare] amount input value BEFORE:',
        amountInput ? amountInput.value : undefined
    );

    // 3. Force parsed amount into the input AFTER modal exists (Requirement 3 & 8)
    const importAmountHint = document.getElementById('import-amount-hint');
    if (amountInput && parsed.amount != null) {
        amountInput.value = String(Math.abs(Number(parsed.amount)));
        amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        amountInput.dispatchEvent(new Event('change', { bubbles: true }));
        amountInput.style.borderColor = '';
        if (importAmountHint) importAmountHint.style.display = 'none';
    } else if (amountInput) {
        amountInput.value = '';
        amountInput.placeholder = 'Please enter amount (e.g. 250)';
        amountInput.style.borderColor = 'rgba(239, 68, 68, 0.7)';
        if (importAmountHint) importAmountHint.style.display = 'inline-block';
    }

    console.log(
        '[WalletShare] amount input value AFTER:',
        amountInput ? amountInput.value : undefined
    );

    // 7. Temporary visible debug line inside the Import Payment modal (Requirement 7)
    const debugAmountEl = document.getElementById('import-debug-detected-amount');
    if (debugAmountEl) {
        debugAmountEl.textContent = (parsed.amount != null) ? `₹${parsed.amount}` : 'undefined';
    }

    // Populate remaining form fields
    if (importMerchant) importMerchant.value = parsed.merchant || '';
    if (importDate) importDate.value = parsed.date || new Date().toISOString().split('T')[0];
    if (importTime) importTime.value = parsed.time || '';
    if (importMethod) importMethod.value = parsed.paymentMethod || 'PhonePe UPI';
    if (importRef) importRef.value = parsed.referenceId || '';
    if (importNote) importNote.value = parsed.note || '';

    setImportType(parsed.type || 'expense');

    // Category handling (Requirement 8 & 9)
    if (importCategory) {
        if (parsed.category) {
            importCategory.value = parsed.category;
            const catInfo = getCategoryInfo(parsed.category);
            if (importCategoryStatus) {
                importCategoryStatus.className = 'category-status-pill detected';
                importCategoryStatus.innerHTML = `<i class="fa-solid fa-check"></i> ${catInfo.label} detected`;
            }
            if (importCategoryTip) importCategoryTip.style.display = 'none';
        } else {
            importCategory.value = '';
            if (importCategoryStatus) {
                importCategoryStatus.className = 'category-status-pill needs-selection';
                importCategoryStatus.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Select Category`;
            }
            if (importCategoryTip) importCategoryTip.style.display = 'flex';
        }
    }

    // Duplicate Detection Check
    await checkForDuplicatePayment(parsed);
}

// Make handleWalletShareIntent accessible to Android native bridge
window.handleWalletShareIntent = handleWalletShareIntent;

/**
 * Check for duplicate transactions
 */
async function checkForDuplicatePayment(parsed) {
    if (!importDuplicateAlert) return;
    importDuplicateAlert.style.display = 'none';

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // 1. First check local transactions in memory
        let localDup = null;
        if (parsed.referenceId) {
            localDup = transactions.find(t => !t.isDeleted && t.referenceId === parsed.referenceId);
        }
        if (!localDup && parsed.amount && parsed.date) {
            const numAmt = Math.abs(parsed.amount);
            localDup = transactions.find(t => {
                if (t.isDeleted) return false;
                const amtMatch = Math.abs(t.amount) === numAmt;
                const d = formatDateISO(t.date || t.createdAt);
                const dateMatch = d === parsed.date;
                return amtMatch && dateMatch;
            });
        }

        if (localDup) {
            showDuplicateWarning(localDup);
            return;
        }

        // 2. Query backend duplicate check API
        const params = new URLSearchParams();
        if (parsed.referenceId) params.append('referenceId', parsed.referenceId);
        if (parsed.amount) params.append('amount', parsed.amount);
        if (parsed.date) params.append('date', parsed.date);
        if (parsed.merchant) params.append('text', parsed.merchant);

        const dupUrl = (typeof window !== 'undefined' && typeof window.apiUrl === 'function')
            ? window.apiUrl(`/api/transactions/check-duplicate?${params.toString()}`)
            : `/api/transactions/check-duplicate?${params.toString()}`;
        const res = await fetch(dupUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.isDuplicate && data.transaction) {
            showDuplicateWarning(data.transaction);
        }
    } catch (e) {
        console.error('Error checking duplicate:', e);
    }
}

function showDuplicateWarning(tx) {
    if (!importDuplicateAlert || !importDuplicateDesc) return;
    const dateFormatted = formatDateMedium(tx.date || tx.createdAt);
    importDuplicateDesc.textContent = `A matching transaction "${tx.text}" (${formatCurrency(tx.amount)}) was already recorded on ${dateFormatted}.`;
    importDuplicateAlert.style.display = 'flex';
}

function initImportPaymentUI() {
    if (closeImportBtn) closeImportBtn.addEventListener('click', closeImportModal);
    if (btnCancelImport) btnCancelImport.addEventListener('click', closeImportModal);

    if (importPaymentModal) {
        importPaymentModal.addEventListener('click', (e) => {
            if (e.target === importPaymentModal) closeImportModal();
        });
    }

    if (importTypeExpenseBtn) {
        importTypeExpenseBtn.addEventListener('click', () => setImportType('expense'));
    }
    if (importTypeIncomeBtn) {
        importTypeIncomeBtn.addEventListener('click', () => setImportType('income'));
    }

    // Toggle Screenshot preview
    if (btnToggleScreenshot && screenshotImgContainer) {
        btnToggleScreenshot.addEventListener('click', () => {
            const isHidden = screenshotImgContainer.style.display === 'none';
            screenshotImgContainer.style.display = isHidden ? 'flex' : 'none';
            btnToggleScreenshot.textContent = isHidden ? 'Hide Preview' : 'Show Preview';
        });
    }

    // Toggle raw receipt text
    if (importRawToggle && importRawText && importRawChevron) {
        importRawToggle.addEventListener('click', () => {
            const isHidden = importRawText.style.display === 'none';
            importRawText.style.display = isHidden ? 'block' : 'none';
            importRawChevron.className = isHidden ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
        });
    }

    // Category change listener: update pill and hide tip
    if (importCategory) {
        importCategory.addEventListener('change', () => {
            if (importCategory.value) {
                const info = getCategoryInfo(importCategory.value);
                if (importCategoryStatus) {
                    importCategoryStatus.className = 'category-status-pill detected';
                    importCategoryStatus.innerHTML = `<i class="fa-solid fa-check"></i> ${info.label}`;
                }
                if (importCategoryTip) importCategoryTip.style.display = 'none';
                importCategory.style.borderColor = '';
            } else {
                if (importCategoryStatus) {
                    importCategoryStatus.className = 'category-status-pill needs-selection';
                    importCategoryStatus.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Select Category`;
                }
                if (importCategoryTip) importCategoryTip.style.display = 'flex';
            }
        });
    }

    // Form submission
    if (importForm) {
        importForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate Category
            if (!importCategory.value) {
                importCategory.focus();
                importCategory.style.borderColor = 'var(--expense-coral)';
                if (importCategoryTip) importCategoryTip.style.display = 'flex';
                alert('Please select a category for this transaction.');
                return;
            }

            const amountVal = parseFloat(importAmount.value);
            if (isNaN(amountVal) || amountVal <= 0) {
                alert('Please enter a valid amount.');
                return;
            }

            const finalAmount = activeImportType === 'expense' ? -Math.abs(amountVal) : Math.abs(amountVal);
            const dateVal = importDate.value;
            if (!dateVal) {
                alert('Please select a date.');
                return;
            }

            const [y, m, d] = dateVal.split('-').map(Number);
            const selectedDate = new Date(y, m - 1, d);

            const txPayload = {
                text: importMerchant.value.trim(),
                amount: finalAmount,
                type: activeImportType,
                category: importCategory.value,
                date: selectedDate.toISOString(),
                month: selectedDate.getMonth(),
                year: selectedDate.getFullYear(),
                referenceId: importRef ? importRef.value.trim() : null,
                paymentScreenshot: activeImportScreenshotBase64 || null,
                paymentMethod: importMethod ? importMethod.value.trim() : 'PhonePe UPI'
            };

            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            if (btnSaveImport) {
                btnSaveImport.disabled = true;
                btnSaveImport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            }

            try {
                const txPostUrl = (typeof window !== 'undefined' && typeof window.apiUrl === 'function')
                    ? window.apiUrl('/api/transactions')
                    : '/api/transactions';

                console.log('[Wallet Share] Submitting POST to:', txPostUrl);
                console.log('[Wallet Share] Request payload:', JSON.stringify(txPayload, null, 2));

                const res = await fetch(txPostUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(txPayload)
                });

                console.log('[Wallet Share] Response status:', res.status, res.statusText);

                const contentType = res.headers.get('content-type') || '';
                let data = {};
                if (contentType.includes('application/json')) {
                    data = await res.json();
                } else {
                    const textResp = await res.text();
                    throw new Error(`Server returned status ${res.status}: ${textResp.substring(0, 100)}`);
                }

                console.log('[Wallet Share] Response data:', data);

                if (res.status === 409 || data.isDuplicate) {
                    alert(data.error || 'Duplicate transaction: this payment has already been recorded.');
                    return;
                }

                if (data.success && data.data) {
                    transactions.push(data.data);
                    updateValues();
                    renderHistoryDOM();
                    renderYears();
                    closeImportModal();

                    // Show success toast notification
                    if (typeof showToastNotification === 'function') {
                        showToastNotification({
                            title: 'Payment Imported',
                            message: `Successfully recorded ${escapeHTML(txPayload.text)} (${formatCurrency(txPayload.amount)})`,
                            amount: txPayload.amount,
                            subName: txPayload.text,
                            color: activeImportType === 'expense' ? '#FF5C72' : '#00D9C0',
                            icon: 'fa-solid fa-bolt'
                        });
                    }
                } else {
                    alert(data.error || 'Failed to save imported transaction');
                }
            } catch (err) {
                console.error('[Wallet Share] Error saving imported payment:', err);
                alert(`Error saving payment: ${err.message || 'Please check server connection'}`);
            } finally {
                if (btnSaveImport) {
                    btnSaveImport.disabled = false;
                    btnSaveImport.innerHTML = '<i class="fa-solid fa-check"></i> Import & Save';
                }
            }
        });
    }

    // Check for pending share intent on startup
    checkPendingShareIntent();
}

/**
 * Check if a share intent arrived before page load or during login
 */
function checkPendingShareIntent() {
    try {
        let payload = null;
        const stored = localStorage.getItem('pending_share_payload');
        if (stored) {
            localStorage.removeItem('pending_share_payload');
            payload = JSON.parse(stored);
        } else if (window.__pendingShareIntent) {
            payload = window.__pendingShareIntent;
            window.__pendingShareIntent = null;
        }

        if (payload) {
            let attempts = 0;
            const deliver = () => {
                const amtInput = document.getElementById('import-amount');
                if (amtInput) {
                    handleWalletShareIntent(payload);
                } else if (attempts < 20) {
                    attempts++;
                    setTimeout(deliver, 150);
                } else {
                    handleWalletShareIntent(payload);
                }
            };
            setTimeout(deliver, 200);
        }
    } catch (e) {
        console.error('Error checking pending share intent:', e);
    }
}

/**
 * Global testing helper (Requirement 18)
 * Can be triggered from console or testing workflows:
 * window.simulateShare('food')
 * window.simulateShare('bill')
 * window.simulateShare('unknown')
 */
window.simulateShare = function (type = 'food') {
    const samples = {
        food: 'Paid ₹ 450 to Swiggy via PhonePe. UPI Ref: 425612345678. 24 Sep 2026, 08:30 PM. Note: Dinner',
        bill: 'Payment of ₹1,200 to Bescom Electricity Successful on 24 Sep 2026. UTR: 123456789012.',
        transport: 'Paid ₹ 249 to Uber India using UPI. 24 Sep 2026. Ref: 890123456789',
        unknown: 'Paid ₹ 350 to Random Unknown Vendor X. Txn ID: T987654321. 24 Sep 2026',
        income: 'Received ₹ 15,000 from Client Corp on 24 Sep 2026 via PhonePe. Ref: 789123456012'
    };

    const text = samples[type] || type;
    handleWalletShareIntent({
        type: 'text',
        text: text,
        source: 'simulation_test'
    });
};

// App Initialization
function init() {
    initUserProfile();
    renderYears();
    initPeriodAndMonthSelection();
    initChartTimeSelectors();
    syncDateInput();
    updateValues();
    renderHistoryDOM();
    initSubscriptionsUI();
    initNotificationsUI();
    initExportUI();
    initImportPaymentUI();
    loadSubscriptions(true);
}

// Initial Kickoff
getTransactions();
