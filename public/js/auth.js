const API_AUTH_URL = '/api/auth';

// Register User
async function registerUser(username, email, password) {
    const res = await fetch(`${API_AUTH_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

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
    const res = await fetch(`${API_AUTH_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ username: data.username, email: data.email }));
        window.location.href = 'index.html';
    } else {
        throw new Error(data.error || 'Login failed');
    }
}

// Logout User
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}
