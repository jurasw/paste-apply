export function looksLikePhoneNumber(value) {
    if (!value || typeof value !== 'string') return false;
    const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
    return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
}

export function looksLikeEmail(value) {
    if (!value || typeof value !== 'string') return false;
    return value.includes('@') && value.includes('.');
}

export function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}

export function isExcludedDomain(hostname) {
    const excludedDomains = [
        'youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com',
        'facebook.com', 'www.facebook.com', 'm.facebook.com',
        'twitter.com', 'www.twitter.com', 'x.com', 'www.x.com',
        'instagram.com', 'www.instagram.com',
        'linkedin.com', 'www.linkedin.com',
        'reddit.com', 'www.reddit.com',
        'tiktok.com', 'www.tiktok.com',
        'netflix.com', 'www.netflix.com',
        'spotify.com', 'www.spotify.com',
        'amazon.com', 'www.amazon.com',
        'ebay.com', 'www.ebay.com'
    ];
    
    const hostnameLower = hostname.toLowerCase();
    return excludedDomains.some(domain => hostnameLower === domain || hostnameLower.endsWith('.' + domain));
}

