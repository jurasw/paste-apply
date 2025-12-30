export const profileFields = [
    'firstName', 'lastName', 'email', 'phone',
    'github', 'linkedin', 'portfolio', 'location', 'city', 'country'
];
export const resizeDimensions = { width: '400px', height: '600px' };
export const maxFileSizeMb = 7;
export function getElementById(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Element with id "${id}" not found`);
    return element;
}
export function showStatus(message, type) {
    const status = getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => {
        status.className = 'status';
    }, 5000);
}
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
export function resizePopup() {
    document.body.style.width = resizeDimensions.width;
    document.body.style.height = resizeDimensions.height;
    document.documentElement.style.width = resizeDimensions.width;
    document.documentElement.style.height = resizeDimensions.height;
}
export function getPdfJsLib() {
    return window.pdfjsLib || window['pdfjs-dist/build/pdf'];
}
export async function loadProfileData() {
    const data = await chrome.storage.sync.get(profileFields);
    return data;
}
export async function loadResumeData() {
    const data = await chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType']);
    return data;
}
export function populateFormFields(data) {
    profileFields.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field]) {
            element.value = data[field];
        }
    });
}
export function normalizeUrl(url) {
    if (!url || !url.trim()) {
        return url;
    }
    url = url.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    if (url.includes('linkedin.com')) {
        if (!url.startsWith('www.')) {
            return 'https://www.' + url;
        }
        return 'https://' + url;
    }
    if (url.includes('github.com')) {
        return 'https://' + url;
    }
    if (url.includes('.') && (url.includes('/') || /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(url))) {
        return 'https://' + url;
    }
    return url;
}
