import { fieldMappings } from './field-matcher';
import { findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch } from './field-finder';
import { uploadResumeFile } from './file-upload';
import { fillRadioButtonGroup } from './field-filler';

function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}

export function injectFillFunction(profileData, resumeData) {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    let filledCount = 0;
    const results = [];
    const fieldProcessors = [
        { key: 'firstName', label: 'First Name', keywords: fieldMappings.firstName, labelKeywords: ['first name', 'firstname', 'first name field', 'imię', 'imie'] },
        { key: 'lastName', label: 'Last Name', keywords: fieldMappings.lastName, labelKeywords: ['last name', 'lastname', 'surname', 'last name field', 'nazwisko'] },
        { key: 'email', label: 'Email', keywords: fieldMappings.email, labelKeywords: ['email', 'e-mail', 'email address', 'email field', 'adres e-mail', 'adres email'] },
        { key: 'phone', label: 'Phone', keywords: fieldMappings.phone, labelKeywords: ['phone', 'telephone', 'mobile', 'phone number', 'phone field', 'telefon', 'numer telefonu', 'telefon komórkowy', 'komórka'] },
        { key: 'github', label: 'GitHub', keywords: fieldMappings.github, labelKeywords: ['github', 'github profile', 'github url', 'github link'] },
        { key: 'linkedin', label: 'LinkedIn', keywords: fieldMappings.linkedin, labelKeywords: ['linkedin', 'linked-in', 'linkedin profile', 'linkedin url', 'linkedin link'] },
        { key: 'portfolio', label: 'Portfolio', keywords: fieldMappings.portfolio, labelKeywords: ['portfolio', 'website', 'portfolio url', 'portfolio link', 'personal website', 'strona', 'strona internetowa'] },
        { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'city field', 'miasto'] },
        { key: 'location', label: 'Location', keywords: fieldMappings.location, labelKeywords: ['location', 'location field', 'lokalizacja', 'miejsce zamieszkania', 'adres'] },
        { key: 'availability', label: 'Availability', keywords: fieldMappings.availability, labelKeywords: ['availability', 'notice period', 'notice-period', 'notice_period', 'notice', 'available', 'start date', 'start-date', 'start_date', 'when can you start', 'when can you join'], isRadio: true }
    ];
    for (const processor of fieldProcessors) {
        const value = profileData[processor.key];
        if (value) {
            console.log(`[AutoFill] Trying to fill ${processor.label}...`);
            let filled = false;
            if (processor.isRadio) {
                filled = fillRadioButtonGroup(processor.keywords, value);
            }
            if (!filled) {
                filled = findFieldByKeywords(processor.keywords, value) ||
                    findFieldByLabelText(processor.labelKeywords, value) ||
                    findFieldByTextSearch(processor.labelKeywords, value);
            }
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
    if (uploadResumeFile(resumeData)) {
        filledCount++;
        results.push('Resume File');
    }
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
}
