function getAuthApiUrl(endpoint) {
    if (typeof window !== 'undefined' && typeof window.apiUrl === 'function') {
        return window.apiUrl(`/api/auth${endpoint}`);
    }
    return `/api/auth${endpoint}`;
}

async function parseResponseSafely(res) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return await res.json();
    }
    const rawText = await res.text();
    if (rawText.trim().startsWith('<')) {
        throw new Error(`Cannot reach backend API (status ${res.status}). Please ensure backend is running at ${window.APP_CONFIG ? window.APP_CONFIG.getApiBaseUrl() : 'configured URL'}`);
    }
    throw new Error(rawText || `Request failed with status ${res.status}`);
}

// Register User
async function registerUser(username, email, password) {
    const res = await fetch(getAuthApiUrl('/register'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
    });

    const data = await parseResponseSafely(res);

    if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ username: data.username, email: data.email }));
        window.location.href = 'index.html';
    } else {
        throw new Error(data.error || 'Registration failed');
    }
}

// Login User
async function loginUser(email, password) {
    const res = await fetch(getAuthApiUrl('/login'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    const data = await parseResponseSafely(res);

    if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ username: data.username, email: data.email }));
        window.location.href = 'index.html';
    } else {
        throw new Error(data.error || 'Login failed');
    }
}

// Logout User
async function logout() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            await fetch(getAuthApiUrl('/logout'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (e) {
            // Proceed with local logout regardless of network status
        }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        if (typeof window !== 'undefined' && window.__pendingShareIntent) {
            try {
                localStorage.setItem('pending_share_payload', JSON.stringify(window.__pendingShareIntent));
            } catch (e) {}
        }
        window.location.href = 'login.html';
    }
}
