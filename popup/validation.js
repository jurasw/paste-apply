export function looksLikePhoneNumber(value) {
    const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
    return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
}

export function looksLikeEmail(value) {
    return value.includes('@') && value.includes('.');
}

export function looksLikeName(value) {
    return !looksLikePhoneNumber(value) && !looksLikeEmail(value) && /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/.test(value.trim());
}

