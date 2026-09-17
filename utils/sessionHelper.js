/**
 * Session & User-Agent Parsing Helpers
 * Provides pure JS user-agent detection, IP sanitization, and time formatting
 */

function parseUserAgent(uaString = '') {
    const ua = String(uaString).trim();

    let os = 'Unknown OS';
    let browser = 'Unknown Browser';
    let deviceType = 'Desktop';

    if (!ua) {
        return { os, browser, deviceType };
    }

    // Detect Device Type & OS
    if (/iPad|Tablet/i.test(ua)) {
        deviceType = 'Tablet';
    } else if (/Mobile|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        deviceType = 'Mobile Device';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
        deviceType = 'Laptop';
    } else {
        deviceType = 'Desktop';
    }

    // Detailed OS detection
    if (/Windows NT 10\.0/i.test(ua)) os = 'Windows';
    else if (/Windows NT 6\.3/i.test(ua)) os = 'Windows 8.1';
    else if (/Windows NT 6\.1/i.test(ua)) os = 'Windows 7';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
    else if (/CrOS/i.test(ua)) os = 'Chrome OS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    // Detailed Browser detection (ordered to avoid false positives like Chrome inside Edge/Brave/Opera)
    if (/Edg(?:e)?\/(\d+)/i.test(ua)) {
        browser = 'Edge';
    } else if (/OPR\/|Opera/i.test(ua)) {
        browser = 'Opera';
    } else if (/Firefox\/(\d+)/i.test(ua)) {
        browser = 'Firefox';
    } else if (/Chrome\/(\d+)/i.test(ua)) {
        browser = 'Chrome';
    } else if (/Version\/.*Safari/i.test(ua)) {
        browser = 'Safari';
    } else if (/Safari/i.test(ua)) {
        browser = 'Safari';
    } else {
        browser = 'Browser';
    }

    return { os, browser, deviceType };
}

function getClientIp(req) {
    if (!req) return '';
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ipList = forwarded.split(',');
        return ipList[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || '';
}

function formatRelativeTime(date) {
    if (!date) return 'Just now';
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return new Date(date).toLocaleDateString();
}

module.exports = {
    parseUserAgent,
    getClientIp,
    formatRelativeTime
};
