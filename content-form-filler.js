import { fieldMappings, getLabelText } from './content-field-matcher';
import { findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch } from './content-field-finder';
export { findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
export function uploadResumeFile(base64Data, fileName, fileType) {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    for (const fileInput of fileInputs) {
        const htmlInput = fileInput;
        const id = (htmlInput.id || '').toLowerCase();
        const name = (htmlInput.name || '').toLowerCase();
        const label = getLabelText(htmlInput).toLowerCase();
        const accept = (htmlInput.accept || '').toLowerCase();
        const isResumeField = id.includes('resume') || id.includes('cv') ||
            name.includes('resume') || name.includes('cv') ||
            label.includes('resume') || label.includes('cv') ||
            (accept.includes('pdf') && (label.includes('attach') || label.includes('upload')));
        if (isResumeField) {
            try {
                const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: fileType || 'application/pdf' });
                const file = new File([blob], fileName || 'resume.pdf', { type: fileType || 'application/pdf' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                htmlInput.files = dataTransfer.files;
                htmlInput.dispatchEvent(new Event('change', { bubbles: true }));
                htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                console.log(`Uploaded resume file: ${fileName}`);
                return true;
            }
            catch (error) {
                console.error('Error uploading resume file:', error);
            }
        }
    }
    return false;
}
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;border-radius:5px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
export function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'location', 'resume'
    ], (data) => {
        const profileData = data;
        console.log('[AutoFill] Profile data:', Object.keys(profileData).filter(k => profileData[k]));
        let filledCount = 0;
        const results = [];
        const fieldProcessors = [
            { key: 'firstName', label: 'First Name', keywords: fieldMappings.firstName, labelKeywords: ['first name', 'firstname', 'first name field'] },
            { key: 'lastName', label: 'Last Name', keywords: fieldMappings.lastName, labelKeywords: ['last name', 'lastname', 'surname', 'last name field'] },
            { key: 'email', label: 'Email', keywords: fieldMappings.email, labelKeywords: ['email', 'e-mail', 'email address', 'email field'] },
            { key: 'phone', label: 'Phone', keywords: fieldMappings.phone, labelKeywords: ['phone', 'telephone', 'mobile', 'phone number', 'phone field'] },
            { key: 'github', label: 'GitHub', keywords: fieldMappings.github, labelKeywords: ['github', 'github profile', 'github url', 'github link'] },
            { key: 'linkedin', label: 'LinkedIn', keywords: fieldMappings.linkedin, labelKeywords: ['linkedin', 'linked-in', 'linkedin profile', 'linkedin url', 'linkedin link'] },
            { key: 'portfolio', label: 'Portfolio', keywords: fieldMappings.portfolio, labelKeywords: ['portfolio', 'website', 'portfolio url', 'portfolio link', 'personal website'] },
            { key: 'location', label: 'Location', keywords: fieldMappings.location, labelKeywords: ['location', 'city', 'location field', 'city field'] }
        ];
        for (const processor of fieldProcessors) {
            const value = profileData[processor.key];
            if (value) {
                console.log(`[AutoFill] Trying to fill ${processor.label}...`);
                const filled = findFieldByKeywords(processor.keywords, value) ||
                    findFieldByLabelText(processor.labelKeywords, value) ||
                    findFieldByTextSearch(processor.labelKeywords, value);
                if (filled) {
                    filledCount++;
                    results.push(processor.label);
                    console.log(`[AutoFill] ✓ Successfully filled ${processor.label}`);
                }
                else {
                    console.log(`[AutoFill] ✗ Could not find field for ${processor.label}`);
                }
            }
            else {
                console.log(`[AutoFill] No value for ${processor.label}`);
            }
        }
        chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType'], (resumeData) => {
            const resume = resumeData;
            if (resume.resumeFile) {
                if (uploadResumeFile(resume.resumeFile, resume.resumeFileName || 'resume.pdf', resume.resumeFileType || 'application/pdf')) {
                    filledCount++;
                    results.push('Resume File');
                }
            }
            console.log(`[AutoFill] Completed: Filled ${filledCount} field${filledCount > 1 ? 's' : ''}: ${results.join(', ')}`);
            if (filledCount > 0) {
                showNotification(`✓ Filled ${filledCount} field${filledCount > 1 ? 's' : ''}: ${results.join(', ')}`, true);
            }
            else {
                showNotification('⚠ Could not find any form fields to fill. Check console for details.', false);
            }
        });
    });
}
