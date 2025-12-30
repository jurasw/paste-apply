import { fieldMappings, getLabelText } from './field-matcher';
import { findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch, fillRadioButtonGroup } from './field-finder';
import { showNotification } from './utils';
export { findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
export function uploadResumeFile(base64Data, fileName, fileType) {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    if (fileInputs.length === 0) {
        console.log('[AutoFill] No file inputs found on page');
        return false;
    }
    const resumeKeywords = ['resume', 'cv', 'curriculum', 'vitae'];
    const documentKeywords = ['document', 'attachment', 'file', 'upload', 'attach'];
    let bestMatch = null;
    let bestMatchScore = 0;
    let firstEmptyInput = null;
    for (const fileInput of fileInputs) {
        const htmlInput = fileInput;
        const id = (htmlInput.id || '').toLowerCase();
        const name = (htmlInput.name || '').toLowerCase();
        const label = getLabelText(htmlInput).toLowerCase();
        const accept = (htmlInput.accept || '').toLowerCase();
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase();
        const placeholder = (htmlInput.getAttribute('placeholder') || '').toLowerCase();
        const searchText = `${id} ${name} ${label} ${ariaLabel} ${placeholder} ${accept}`;
        if (htmlInput.files && htmlInput.files.length === 0) {
            if (!firstEmptyInput) {
                firstEmptyInput = htmlInput;
            }
        }
        let score = 0;
        for (const keyword of resumeKeywords) {
            if (searchText.includes(keyword)) {
                score += 10;
            }
        }
        for (const keyword of documentKeywords) {
            if (searchText.includes(keyword)) {
                score += 3;
            }
        }
        if (accept.includes('pdf') || accept.includes('document') || accept === '') {
            score += 2;
        }
        if (htmlInput.files && htmlInput.files.length === 0) {
            score += 1;
        }
        if (score > bestMatchScore) {
            bestMatchScore = score;
            bestMatch = htmlInput;
        }
    }
    const targetInput = bestMatch || firstEmptyInput;
    if (!targetInput) {
        console.log('[AutoFill] No suitable file input found (all inputs may already have files)');
        return false;
    }
    try {
        console.log(`[AutoFill] Attempting to upload resume to file input: id="${targetInput.id}", name="${targetInput.name}"`);
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
        targetInput.files = dataTransfer.files;
        targetInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        targetInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        targetInput.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        targetInput.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
        setTimeout(() => {
            targetInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        }, 100);
        console.log(`[AutoFill] ✓ Successfully uploaded resume file: ${fileName} to input with id="${targetInput.id || 'none'}", name="${targetInput.name || 'none'}"`);
        return true;
    }
    catch (error) {
        console.error('[AutoFill] Error uploading resume file:', error);
        return false;
    }
}
export function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        console.warn('[AutoFill] Chrome storage not available');
        return;
    }
    
    try {
        chrome.storage.sync.get([
            'firstName', 'lastName', 'email', 'phone',
            'github', 'linkedin', 'portfolio', 'city', 'country', 'availability', 'resume'
        ], (data) => {
            if (chrome.runtime.lastError) {
                console.warn('[AutoFill] Storage error:', chrome.runtime.lastError.message);
                return;
            }
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
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['location country', 'country', 'country field', 'nation'] },
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['location city', 'city', 'city field', 'town', 'location'] },
            { key: 'availability', label: 'Availability', keywords: fieldMappings.availability, labelKeywords: ['availability', 'notice period', 'notice-period', 'notice_period', 'notice', 'available', 'start date', 'start-date', 'start_date', 'when can you start', 'when can you join'] }
        ];
        for (const processor of fieldProcessors) {
            const value = profileData[processor.key];
            if (value) {
                console.log(`[AutoFill] Trying to fill ${processor.label}...`);
                let filled = fillRadioButtonGroup(processor.keywords, value) ||
                    findFieldByKeywords(processor.keywords, value) ||
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
        
        const processCheckboxes = () => {
            const requiredCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"][required]'));
            for (const checkbox of requiredCheckboxes) {
                if (!checkbox.checked) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                    checkbox.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
                    checkbox.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    filledCount++;
                    results.push('Required Checkbox');
                    console.log(`[AutoFill] ✓ Checked required checkbox: ${checkbox.id || checkbox.name || 'unknown'}`);
                }
            }
            console.log(`[AutoFill] Completed: Filled ${filledCount} field${filledCount > 1 ? 's' : ''}: ${results.join(', ')}`);
            if (filledCount > 0) {
                showNotification(`✓ Filled ${filledCount} field${filledCount > 1 ? 's' : ''}: ${results.join(', ')}`, true);
            }
            else {
                showNotification('⚠ Could not find any form fields to fill. Check console for details.', false);
            }
        };
        
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            try {
                chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType'], (resumeData) => {
                    if (chrome.runtime.lastError) {
                        processCheckboxes();
                        return;
                    }
                    const resume = resumeData;
                    if (resume.resumeFile) {
                        if (uploadResumeFile(resume.resumeFile, resume.resumeFileName || 'resume.pdf', resume.resumeFileType || 'application/pdf')) {
                            filledCount++;
                            results.push('Resume File');
                        }
                    }
                    processCheckboxes();
                });
            } catch (e) {
                processCheckboxes();
            }
        } else {
            processCheckboxes();
        }
        });
    } catch (e) {
        console.warn('[AutoFill] Error accessing storage:', e);
    }
}
