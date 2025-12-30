(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};
function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/);
    let container = input.parentElement;
    for (let i = 0; i < 5 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    return option;
                }
                for (const part of valueParts) {
                    if (part.length > 2 && (optionText.includes(part) || optionValueLower.includes(part))) {
                        return option;
                    }
                }
            }
        }
        container = container.parentElement;
    }
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        for (let i = 0; i < firstTerm.length; i++) {
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        if (option) {
            option.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 100));
            option.click();
            option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
            return true;
        }
        else {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function looksLikePhoneNumber(value) {
    if (!value || typeof value !== 'string') return false;
    const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
    return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
}
function looksLikeEmail(value) {
    if (!value || typeof value !== 'string') return false;
    return value.includes('@') && value.includes('.');
}
function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}



{ findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
function uploadResumeFile(base64Data, fileName, fileType) {
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation'] }
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
        });
    });
}


function isJobApplicationForm() {
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-radius: 12px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        button.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            button.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}

(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};
function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/);
    let container = input.parentElement;
    for (let i = 0; i < 5 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    return option;
                }
                for (const part of valueParts) {
                    if (part.length > 2 && (optionText.includes(part) || optionValueLower.includes(part))) {
                        return option;
                    }
                }
            }
        }
        container = container.parentElement;
    }
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        for (let i = 0; i < firstTerm.length; i++) {
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        if (option) {
            option.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 100));
            option.click();
            option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
            return true;
        }
        else {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function looksLikePhoneNumber(value) {
    if (!value || typeof value !== 'string') return false;
    const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
    return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
}
function looksLikeEmail(value) {
    if (!value || typeof value !== 'string') return false;
    return value.includes('@') && value.includes('.');
}
function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}



{ findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
function uploadResumeFile(base64Data, fileName, fileType) {
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation'] }
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
        });
    });
}


function isJobApplicationForm() {
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-radius: 12px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        button.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            button.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}

(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};
function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/);
    let container = input.parentElement;
    for (let i = 0; i < 5 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    return option;
                }
                for (const part of valueParts) {
                    if (part.length > 2 && (optionText.includes(part) || optionValueLower.includes(part))) {
                        return option;
                    }
                }
            }
        }
        container = container.parentElement;
    }
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        for (let i = 0; i < firstTerm.length; i++) {
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        if (option) {
            option.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 100));
            option.click();
            option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
            return true;
        }
        else {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function looksLikePhoneNumber(value) {
    if (!value || typeof value !== 'string') return false;
    const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
    return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
}
function looksLikeEmail(value) {
    if (!value || typeof value !== 'string') return false;
    return value.includes('@') && value.includes('.');
}
function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}



{ findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
function uploadResumeFile(base64Data, fileName, fileType) {
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation'] }
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
        });
    });
}


function isJobApplicationForm() {
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-radius: 12px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        button.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            button.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}

(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};
function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/);
    let container = input.parentElement;
    for (let i = 0; i < 5 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    return option;
                }
                for (const part of valueParts) {
                    if (part.length > 2 && (optionText.includes(part) || optionValueLower.includes(part))) {
                        return option;
                    }
                }
            }
        }
        container = container.parentElement;
    }
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        for (let i = 0; i < firstTerm.length; i++) {
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        if (option) {
            option.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 100));
            option.click();
            option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
            return true;
        }
        else {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function looksLikePhoneNumber(value) {
    if (!value || typeof value !== 'string') return false;
    const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
    return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
}
function looksLikeEmail(value) {
    if (!value || typeof value !== 'string') return false;
    return value.includes('@') && value.includes('.');
}
function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}



{ findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
function uploadResumeFile(base64Data, fileName, fileType) {
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation'] }
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
        });
    });
}


function isJobApplicationForm() {
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-radius: 12px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        button.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            button.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}

(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};
function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/);
    let container = input.parentElement;
    for (let i = 0; i < 5 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    return option;
                }
                for (const part of valueParts) {
                    if (part.length > 2 && (optionText.includes(part) || optionValueLower.includes(part))) {
                        return option;
                    }
                }
            }
        }
        container = container.parentElement;
    }
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        for (let i = 0; i < firstTerm.length; i++) {
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        if (option) {
            option.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 100));
            option.click();
            option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
            return true;
        }
        else {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function looksLikePhoneNumber(value) {
    if (!value || typeof value !== 'string') return false;
    const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
    return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
}
function looksLikeEmail(value) {
    if (!value || typeof value !== 'string') return false;
    return value.includes('@') && value.includes('.');
}
function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}



{ findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
function uploadResumeFile(base64Data, fileName, fileType) {
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation'] }
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
        });
    });
}


function isJobApplicationForm() {
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-radius: 12px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        button.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            button.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}

(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};
function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/);
    let container = input.parentElement;
    for (let i = 0; i < 5 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    return option;
                }
                for (const part of valueParts) {
                    if (part.length > 2 && (optionText.includes(part) || optionValueLower.includes(part))) {
                        return option;
                    }
                }
            }
        }
        container = container.parentElement;
    }
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        for (let i = 0; i < firstTerm.length; i++) {
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        if (option) {
            option.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 100));
            option.click();
            option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
            return true;
        }
        else {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function looksLikePhoneNumber(value) {
    if (!value || typeof value !== 'string') return false;
    const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
    return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
}
function looksLikeEmail(value) {
    if (!value || typeof value !== 'string') return false;
    return value.includes('@') && value.includes('.');
}
function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}



{ findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
function uploadResumeFile(base64Data, fileName, fileType) {
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation'] }
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
        });
    });
}


function isJobApplicationForm() {
    const jobKeywords = [
        'application', 'apply', 'resume', 'cv', 'curriculum', 'vitae',
        'firstname', 'first-name', 'first_name', 'fname', 'given-name',
        'lastname', 'last-name', 'last_name', 'lname', 'surname',
        'email', 'e-mail', 'phone', 'telephone', 'mobile',
        'github', 'linkedin', 'portfolio', 'website',
        'position', 'job', 'career', 'employment', 'hire',
        'cover-letter', 'coverletter', 'motivation',
        'experience', 'education', 'qualification', 'skill',
        'aplikacja', 'aplikuj', 'zaaplikuj', 'podanie', 'wniosek', 'życiorys',
        'imię', 'imie', 'nazwisko',
        'telefon', 'numer telefonu', 'telefon komórkowy', 'komórka',
        'stanowisko', 'praca', 'oferta pracy', 'pozycja',
        'doświadczenie', 'doświadczenie zawodowe', 'wykształcenie', 'edukacja',
        'umiejętności', 'kompetencje', 'kwalifikacje'
    ];
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        button.style.boxShadow = '0 4px 14px rgba(76, 175, 80, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}

(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};

function looksLikePhoneNumber(value) {
    if (!value || typeof value !== 'string') return false;
    const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
    return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
}
function looksLikeEmail(value) {
    if (!value || typeof value !== 'string') return false;
    return value.includes('@') && value.includes('.');
}

function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/);
    let container = input.parentElement;
    for (let i = 0; i < 5 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    return option;
                }
                for (const part of valueParts) {
                    if (part.length > 2 && (optionText.includes(part) || optionValueLower.includes(part))) {
                        return option;
                    }
                }
            }
        }
        container = container.parentElement;
    }
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        for (let i = 0; i < firstTerm.length; i++) {
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        if (option) {
            option.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 100));
            option.click();
            option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
            return true;
        }
        else {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}



{ findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
function uploadResumeFile(base64Data, fileName, fileType) {
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation'] }
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
        });
    });
}


function isJobApplicationForm() {
    const jobKeywords = [
        'application', 'apply', 'resume', 'cv', 'curriculum', 'vitae',
        'firstname', 'first-name', 'first_name', 'fname', 'given-name',
        'lastname', 'last-name', 'last_name', 'lname', 'surname',
        'email', 'e-mail', 'phone', 'telephone', 'mobile',
        'github', 'linkedin', 'portfolio', 'website',
        'position', 'job', 'career', 'employment', 'hire',
        'cover-letter', 'coverletter', 'motivation',
        'experience', 'education', 'qualification', 'skill',
        'aplikacja', 'aplikuj', 'zaaplikuj', 'podanie', 'wniosek', 'życiorys',
        'imię', 'imie', 'nazwisko',
        'telefon', 'numer telefonu', 'telefon komórkowy', 'komórka',
        'stanowisko', 'praca', 'oferta pracy', 'pozycja',
        'doświadczenie', 'doświadczenie zawodowe', 'wykształcenie', 'edukacja',
        'umiejętności', 'kompetencje', 'kwalifikacje'
    ];
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        button.style.boxShadow = '0 4px 14px rgba(76, 175, 80, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}

(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};
function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/);
    let container = input.parentElement;
    for (let i = 0; i < 5 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    return option;
                }
                for (const part of valueParts) {
                    if (part.length > 2 && (optionText.includes(part) || optionValueLower.includes(part))) {
                        return option;
                    }
                }
            }
        }
        container = container.parentElement;
    }
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        for (let i = 0; i < firstTerm.length; i++) {
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        if (option) {
            option.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 100));
            option.click();
            option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
            return true;
        }
        else {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}



{ findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
function uploadResumeFile(base64Data, fileName, fileType) {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    if (fileInputs.length === 0) {
        console.log('[AutoFill] No file inputs found on page');
        return false;
    }
        const resumeKeywords = ['resume', 'cv', 'curriculum', 'vitae', 'życiorys', 'zyciorys'];
        const documentKeywords = ['document', 'attachment', 'file', 'upload', 'attach', 'dokument', 'załącznik', 'plik', 'prześlij', 'załaduj', 'wgraj'];
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
    ], (data) => {
        const profileData = data;
        console.log('[AutoFill] Profile data:', Object.keys(profileData).filter(k => profileData[k]));
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town', 'miasto'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation', 'kraj'] }
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
        });
    });
}


function isJobApplicationForm() {
    const jobKeywords = [
        'application', 'apply', 'resume', 'cv', 'curriculum', 'vitae',
        'firstname', 'first-name', 'first_name', 'fname', 'given-name',
        'lastname', 'last-name', 'last_name', 'lname', 'surname',
        'email', 'e-mail', 'phone', 'telephone', 'mobile',
        'github', 'linkedin', 'portfolio', 'website',
        'position', 'job', 'career', 'employment', 'hire',
        'cover-letter', 'coverletter', 'motivation',
        'experience', 'education', 'qualification', 'skill'
    ];
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        button.style.boxShadow = '0 4px 14px rgba(76, 175, 80, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}

(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};
function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/);
    let container = input.parentElement;
    for (let i = 0; i < 5 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    return option;
                }
                for (const part of valueParts) {
                    if (part.length > 2 && (optionText.includes(part) || optionValueLower.includes(part))) {
                        return option;
                    }
                }
            }
        }
        container = container.parentElement;
    }
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        for (let i = 0; i < firstTerm.length; i++) {
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        if (option) {
            option.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 100));
            option.click();
            option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
            return true;
        }
        else {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}



{ findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
function uploadResumeFile(base64Data, fileName, fileType) {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    if (fileInputs.length === 0) {
        console.log('[AutoFill] No file inputs found on page');
        return false;
    }
        const resumeKeywords = ['resume', 'cv', 'curriculum', 'vitae', 'życiorys', 'zyciorys'];
        const documentKeywords = ['document', 'attachment', 'file', 'upload', 'attach', 'dokument', 'załącznik', 'plik', 'prześlij', 'załaduj', 'wgraj'];
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
    ], (data) => {
        const profileData = data;
        console.log('[AutoFill] Profile data:', Object.keys(profileData).filter(k => profileData[k]));
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town', 'miasto'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation', 'kraj'] }
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
        });
    });
}

function isJobApplicationForm() {
    const jobKeywords = [
        'application', 'apply', 'resume', 'cv', 'curriculum', 'vitae',
        'firstname', 'first-name', 'first_name', 'fname', 'given-name',
        'lastname', 'last-name', 'last_name', 'lname', 'surname',
        'email', 'e-mail', 'phone', 'telephone', 'mobile',
        'github', 'linkedin', 'portfolio', 'website',
        'position', 'job', 'career', 'employment', 'hire',
        'cover-letter', 'coverletter', 'motivation',
        'experience', 'education', 'qualification', 'skill'
    ];
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        button.style.boxShadow = '0 4px 14px rgba(76, 175, 80, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}

(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};
function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/);
    let container = input.parentElement;
    for (let i = 0; i < 5 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    return option;
                }
                for (const part of valueParts) {
                    if (part.length > 2 && (optionText.includes(part) || optionValueLower.includes(part))) {
                        return option;
                    }
                }
            }
        }
        container = container.parentElement;
    }
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        for (let i = 0; i < firstTerm.length; i++) {
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: firstTerm[i], bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        if (option) {
            option.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 100));
            option.click();
            option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
            return true;
        }
        else {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}



{ findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
function uploadResumeFile(base64Data, fileName, fileType) {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    if (fileInputs.length === 0) {
        console.log('[AutoFill] No file inputs found on page');
        return false;
    }
        const resumeKeywords = ['resume', 'cv', 'curriculum', 'vitae', 'życiorys', 'zyciorys'];
        const documentKeywords = ['document', 'attachment', 'file', 'upload', 'attach', 'dokument', 'załącznik', 'plik', 'prześlij', 'załaduj', 'wgraj'];
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
    ], (data) => {
        const profileData = data;
        console.log('[AutoFill] Profile data:', Object.keys(profileData).filter(k => profileData[k]));
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town', 'miasto'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation', 'kraj'] }
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
        });
    });
}

function isJobApplicationForm() {
    const jobKeywords = [
        'application', 'apply', 'resume', 'cv', 'curriculum', 'vitae',
        'firstname', 'first-name', 'first_name', 'fname', 'given-name',
        'lastname', 'last-name', 'last_name', 'lname', 'surname',
        'email', 'e-mail', 'phone', 'telephone', 'mobile',
        'github', 'linkedin', 'portfolio', 'website',
        'position', 'job', 'career', 'employment', 'hire',
        'cover-letter', 'coverletter', 'motivation',
        'experience', 'education', 'qualification', 'skill'
    ];
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        button.style.boxShadow = '0 4px 14px rgba(76, 175, 80, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}

(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};
function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/).filter(p => p.length > 0);
    const firstPart = valueParts[0] || valueLower;
    
    let container = input.parentElement;
    let bestMatch = null;
    let bestScore = 0;
    
    for (let i = 0; i < 6 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"], [class*="suggestions"], [class*="results"], [class*="popup"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"], [class*="suggestion"], [class*="result"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                
                let score = 0;
                
                if (optionText === valueLower || optionValueLower === valueLower) {
                    return option;
                }
                
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    score = 100;
                }
                
                if (optionText.startsWith(firstPart) || optionValueLower.startsWith(firstPart)) {
                    score = Math.max(score, 90);
                }
                
                if (optionText.includes(firstPart) || optionValueLower.includes(firstPart)) {
                    score = Math.max(score, 80);
                }
                
                for (const part of valueParts) {
                    if (part.length > 2) {
                        if (optionText.includes(part) || optionValueLower.includes(part)) {
                            score = Math.max(score, 70);
                        }
                        if (optionText.startsWith(part) || optionValueLower.startsWith(part)) {
                            score = Math.max(score, 85);
                        }
                    }
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = option;
                }
            }
        }
        container = container.parentElement;
    }
    
    if (bestMatch && bestScore >= 70) {
        return bestMatch;
    }
    
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 150));
        
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('keydown', { bubbles: true, cancelable: true }));
        
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        
        for (let i = 0; i < firstTerm.length; i++) {
            const char = firstTerm[i];
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keypress', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 80));
        }
        
        await new Promise(resolve => setTimeout(resolve, 400));
        
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 8) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        
        if (option) {
            try {
                option.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 150));
                
                const mouseEvents = ['mousedown', 'mouseup', 'click'];
                for (const eventType of mouseEvents) {
                    option.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
                }
                
                if (option.getAttribute('role') === 'option') {
                    const listbox = option.closest('[role="listbox"]');
                    if (listbox) {
                        listbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                
                input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                await new Promise(resolve => setTimeout(resolve, 100));
                input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
                
                console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
                return true;
            } catch (clickError) {
                console.warn('[AutoFill] Error clicking option, trying alternative method:', clickError);
                input.value = option.textContent || value;
                input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                return true;
            }
        }
        else {
            const allOptions = Array.from(document.querySelectorAll('[role="option"], li[class*="option"], div[class*="option"]'));
            if (allOptions.length > 0) {
                const firstOption = allOptions[0];
                firstOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 100));
                firstOption.click();
                input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                console.log(`[AutoFill] Selected first available option for: ${value.substring(0, 30)}`);
                return true;
            }
            
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}



{ findFieldByKeywords, findFieldByLabelText, findFieldByTextSearch };
function uploadResumeFile(base64Data, fileName, fileType) {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    if (fileInputs.length === 0) {
        console.log('[AutoFill] No file inputs found on page');
        return false;
    }
        const resumeKeywords = ['resume', 'cv', 'curriculum', 'vitae', 'życiorys', 'zyciorys'];
        const documentKeywords = ['document', 'attachment', 'file', 'upload', 'attach', 'dokument', 'załącznik', 'plik', 'prześlij', 'załaduj', 'wgraj'];
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
    ], (data) => {
        const profileData = data;
        console.log('[AutoFill] Profile data:', Object.keys(profileData).filter(k => profileData[k]));
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town', 'miasto'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation', 'kraj'] }
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
        });
    });
}

function isJobApplicationForm() {
    const jobKeywords = [
        'application', 'apply', 'resume', 'cv', 'curriculum', 'vitae',
        'firstname', 'first-name', 'first_name', 'fname', 'given-name',
        'lastname', 'last-name', 'last_name', 'lname', 'surname',
        'email', 'e-mail', 'phone', 'telephone', 'mobile',
        'github', 'linkedin', 'portfolio', 'website',
        'position', 'job', 'career', 'employment', 'hire',
        'cover-letter', 'coverletter', 'motivation',
        'experience', 'education', 'qualification', 'skill'
    ];
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        button.style.boxShadow = '0 4px 14px rgba(76, 175, 80, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}

(function() {
const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    city: ['city', 'location city', 'location-city', 'location_city', 'town', 'municipality', 'miasto', 'miasto_field'],
    country: ['country', 'location country', 'location-country', 'location_country', 'nation', 'kraj', 'kraj_field'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};
function getLabelText(input) {
    const htmlInput = input;
    if (htmlInput.labels && htmlInput.labels.length > 0) {
        return htmlInput.labels[0].textContent || '';
    }
    const id = htmlInput.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label)
            return label.textContent || '';
    }
    let parent = htmlInput.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
        const label = parent.querySelector('label');
        if (label) {
            const text = label.textContent || '';
            if (text.trim())
                return text;
        }
        const prevSibling = parent.previousElementSibling;
        if (prevSibling) {
            const label = prevSibling.querySelector('label');
            if (label) {
                const text = label.textContent || '';
                if (text.trim())
                    return text;
            }
            if (prevSibling.tagName === 'LABEL') {
                return prevSibling.textContent || '';
            }
        }
        parent = parent.parentElement;
        depth++;
    }
    return '';
}
function isCustomDropdown(input) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const className = (input.className || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaRole = input.getAttribute('role') || '';
    const ariaAutocomplete = input.getAttribute('aria-autocomplete') || '';
    if (ariaAutocomplete === 'list' || ariaRole === 'combobox') {
        return true;
    }
    if (placeholder.includes('type') && placeholder.includes('find') || placeholder.includes('start typing')) {
        return true;
    }
    if (className.includes('select') || className.includes('dropdown') || className.includes('autocomplete') || className.includes('combobox')) {
        return true;
    }
    if (id.includes('select') || id.includes('dropdown') || id.includes('autocomplete') || id.includes('combobox')) {
        return true;
    }
    if (name.includes('select') || name.includes('dropdown') || name.includes('autocomplete') || name.includes('combobox')) {
        return true;
    }
    let parent = input.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
        const parentClass = (parent.className || '').toLowerCase();
        if (parentClass.includes('select') || parentClass.includes('dropdown') || parentClass.includes('autocomplete') || parentClass.includes('combobox')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}
function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/).filter(p => p.length > 0);
    const firstPart = valueParts[0] || valueLower;
    
    let container = input.parentElement;
    let bestMatch = null;
    let bestScore = 0;
    
    for (let i = 0; i < 6 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"], [class*="suggestions"], [class*="results"], [class*="popup"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"], [class*="suggestion"], [class*="result"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                
                let score = 0;
                
                if (optionText === valueLower || optionValueLower === valueLower) {
                    return option;
                }
                
                if (optionText.includes(valueLower) || optionValueLower.includes(valueLower)) {
                    score = 100;
                }
                
                if (optionText.startsWith(firstPart) || optionValueLower.startsWith(firstPart)) {
                    score = Math.max(score, 90);
                }
                
                if (optionText.includes(firstPart) || optionValueLower.includes(firstPart)) {
                    score = Math.max(score, 80);
                }
                
                for (const part of valueParts) {
                    if (part.length > 2) {
                        if (optionText.includes(part) || optionValueLower.includes(part)) {
                            score = Math.max(score, 70);
                        }
                        if (optionText.startsWith(part) || optionValueLower.startsWith(part)) {
                            score = Math.max(score, 85);
                        }
                    }
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = option;
                }
            }
        }
        container = container.parentElement;
    }
    
    if (bestMatch && bestScore >= 70) {
        return bestMatch;
    }
    
    return null;
}
async function fillCustomDropdown(input, value) {
    try {
        input.focus();
        input.click();
        await new Promise(resolve => setTimeout(resolve, 150));
        
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('keydown', { bubbles: true, cancelable: true }));
        
        const searchTerms = value.split(/[,\s]+/).filter(t => t.length > 0);
        const firstTerm = searchTerms[0] || value;
        
        for (let i = 0; i < firstTerm.length; i++) {
            const char = firstTerm[i];
            input.value = firstTerm.substring(0, i + 1);
            input.dispatchEvent(new KeyboardEvent('keydown', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keypress', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, cancelable: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 80));
        }
        
        await new Promise(resolve => setTimeout(resolve, 400));
        
        let option = findDropdownOption(input, value);
        let attempts = 0;
        while (!option && attempts < 8) {
            await new Promise(resolve => setTimeout(resolve, 200));
            option = findDropdownOption(input, value);
            attempts++;
        }
        
        if (option) {
            try {
                option.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 150));
                
                const mouseEvents = ['mousedown', 'mouseup', 'click'];
                for (const eventType of mouseEvents) {
                    option.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
                }
                
                if (option.getAttribute('role') === 'option') {
                    const listbox = option.closest('[role="listbox"]');
                    if (listbox) {
                        listbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                
                input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                await new Promise(resolve => setTimeout(resolve, 100));
                input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
                
                console.log(`[AutoFill] Filled custom dropdown with value: ${value.substring(0, 30)}`);
                return true;
            } catch (clickError) {
                console.warn('[AutoFill] Error clicking option, trying alternative method:', clickError);
                input.value = option.textContent || value;
                input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                return true;
            }
        }
        else {
            const allOptions = Array.from(document.querySelectorAll('[role="option"], li[class*="option"], div[class*="option"]'));
            if (allOptions.length > 0) {
                const firstOption = allOptions[0];
                firstOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 100));
                firstOption.click();
                input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                console.log(`[AutoFill] Selected first available option for: ${value.substring(0, 30)}`);
                return true;
            }
            
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
            return true;
        }
    }
    catch (e) {
        console.error('[AutoFill] Error filling custom dropdown:', e);
        return false;
    }
}


function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
            const option = Array.from(selectEl.options).find(opt => opt.value.toLowerCase().includes(value.toLowerCase()) ||
                opt.text.toLowerCase().includes(value.toLowerCase()));
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (isCustomDropdown(inputEl)) {
                fillCustomDropdown(inputEl, value).then(success => {
                    if (success) {
                        console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
                    }
                });
                return true;
            }
            else {
                inputEl.value = value;
            }
        }
        else {
            htmlInput.value = value;
        }
        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
        events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
        htmlInput.blur();
        console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
        return true;
    }
    catch (e) {
        console.error('[AutoFill] Error filling field:', e);
        return false;
    }
}
function findFieldByKeywords(keywords, value) {
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (currentValue && currentValue.trim() !== '')
            continue;
        const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const placeholder = (htmlInput.tagName === 'INPUT' ? htmlInput.placeholder : '') || '';
        const placeholderClean = placeholder.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const ariaLabelledBy = htmlInput.getAttribute('aria-labelledby');
        const className = (htmlInput.className || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const dataAttr = Array.from(htmlInput.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' '))
            .join(' ');
        let labelText = getLabelText(htmlInput).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
                labelText += ' ' + (labelEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            }
        }
        let parentText = '';
        let parent = htmlInput.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const text = (parent.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
            if (text.length < 100) {
                parentText += ' ' + text;
            }
            parent = parent.parentElement;
        }
        const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText} ${parentText}`.replace(/\s+/g, ' ').trim();
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (searchText.includes(keywordLower)) {
                const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                   searchText.includes('email') || searchText.includes('e-mail') || 
                                   searchText.includes('adres e-mail') || searchText.includes('adres email');
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                const isPhoneField = searchText.includes('phone') || searchText.includes('telephone') || 
                                    searchText.includes('telefon') || searchText.includes('numer telefonu') || 
                                    searchText.includes('telefon komórkowy') || searchText.includes('komórka') ||
                                    searchText.includes('mobile') || searchText.includes('cell') || searchText.includes('tel');
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                const isLocationField = searchText.includes('location') || searchText.includes('city') || 
                                      searchText.includes('address') || searchText.includes('residence') ||
                                      searchText.includes('lokalizacja') || searchText.includes('miejsce zamieszkania') ||
                                      searchText.includes('adres') || searchText.includes('miasto') || searchText.includes('kraj');
                if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                    continue;
                }
                const fieldId = id || name || ariaLabel || 'unknown';
                return fillInputField(htmlInput, value, fieldId);
            }
        }
    }
    return false;
}
function findFieldByLabelText(labelKeywords, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (labelText.includes(keywordLower)) {
                const forAttr = label.getAttribute('for');
                let input = null;
                if (forAttr) {
                    input = document.getElementById(forAttr);
                }
                if (!input) {
                    input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                }
                if (!input) {
                    const nextSibling = label.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        labelText.includes('email') || labelText.includes('e-mail') || 
                                        labelText.includes('adres e-mail') || labelText.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = labelText.includes('phone') || labelText.includes('telephone') || 
                                       labelText.includes('telefon') || labelText.includes('numer telefonu') || 
                                       labelText.includes('telefon komórkowy') || labelText.includes('komórka') ||
                                       labelText.includes('mobile') || labelText.includes('cell') || labelText.includes('tel');
                    if (isPhoneField && !looksLikePhoneNumber(value)) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, labelText.substring(0, 30));
                    }
                }
            }
        }
    }
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio') || text.includes('imię') || text.includes('imie') || text.includes('nazwisko') || text.includes('telefon') || text.includes('strona'))) {
                let input = null;
                input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                if (!input) {
                    const nextSibling = textEl.nextElementSibling;
                    if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                        input = nextSibling;
                    }
                }
                if (input) {
                    const isEmailField = input.tagName === 'INPUT' && input.type === 'email' || 
                                        text.includes('email') || text.includes('e-mail') || 
                                        text.includes('adres e-mail') || text.includes('adres email');
                    if (isEmailField && !value.includes('@')) {
                        continue;
                    }
                    const isPhoneField = text.includes('phone') || text.includes('telephone') || 
                                       text.includes('telefon') || text.includes('numer telefonu') || 
                                       text.includes('telefon komórkowy') || text.includes('komórka') ||
                                       text.includes('mobile') || text.includes('cell') || text.includes('tel');
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = text.includes('location') || text.includes('city') || 
                                          text.includes('address') || text.includes('residence') ||
                                          text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                          text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
                        continue;
                    }
                    const currentValue = input.tagName === 'SELECT'
                        ? input.value
                        : input.value;
                    if (!currentValue || currentValue.trim() === '') {
                        return fillInputField(input, value, text.substring(0, 30));
                    }
                }
            }
        }
    }
    return false;
}
function findFieldByTextSearch(labelKeywords, value) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        for (const keyword of labelKeywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower) && textLower.length < 50) {
                let element = node.parentElement;
                let depth = 0;
                while (element && depth < 10) {
                    const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
                    for (const input of Array.from(inputs)) {
                        const htmlInput = input;
                        const isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email' || 
                                            textLower.includes('email') || textLower.includes('e-mail') || 
                                            textLower.includes('adres e-mail') || textLower.includes('adres email');
                        if (isEmailField && !value.includes('@')) {
                            continue;
                        }
                        const isPhoneField = textLower.includes('phone') || textLower.includes('telephone') || 
                                           textLower.includes('telefon') || textLower.includes('numer telefonu') || 
                                           textLower.includes('telefon komórkowy') || textLower.includes('komórka') ||
                                           textLower.includes('mobile') || textLower.includes('cell') || textLower.includes('tel');
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = textLower.includes('location') || textLower.includes('city') || 
                                              textLower.includes('address') || textLower.includes('residence') ||
                                              textLower.includes('lokalizacja') || textLower.includes('miejsce zamieszkania') ||
                                              textLower.includes('adres') || textLower.includes('miasto') || textLower.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
                            continue;
                        }
                        const currentValue = htmlInput.tagName === 'SELECT'
                            ? htmlInput.value
                            : htmlInput.value;
                        if (!currentValue || currentValue.trim() === '') {
                            return fillInputField(htmlInput, value, text.trim().substring(0, 30));
                        }
                    }
                    element = element.parentElement;
                    depth++;
                }
            }
        }
        node = walker.nextNode();
    }
    return false;
}

function uploadResumeFile(base64Data, fileName, fileType) {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    if (fileInputs.length === 0) {
        console.log('[AutoFill] No file inputs found on page');
        return false;
    }
        const resumeKeywords = ['resume', 'cv', 'curriculum', 'vitae', 'życiorys', 'zyciorys'];
        const documentKeywords = ['document', 'attachment', 'file', 'upload', 'attach', 'dokument', 'załącznik', 'plik', 'prześlij', 'załaduj', 'wgraj'];
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
function showNotification(message, isSuccess) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
}
function fillForm() {
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
    chrome.storage.sync.get([
        'firstName', 'lastName', 'email', 'phone',
        'github', 'linkedin', 'portfolio', 'city', 'country', 'resume'
    ], (data) => {
        const profileData = data;
        console.log('[AutoFill] Profile data:', Object.keys(profileData).filter(k => profileData[k]));
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
            { key: 'city', label: 'City', keywords: fieldMappings.city, labelKeywords: ['city', 'location city', 'city field', 'town', 'miasto'] },
            { key: 'country', label: 'Country', keywords: fieldMappings.country, labelKeywords: ['country', 'location country', 'country field', 'nation', 'kraj'] }
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
        });
    });
}

function isJobApplicationForm() {
    const jobKeywords = [
        'application', 'apply', 'resume', 'cv', 'curriculum', 'vitae',
        'firstname', 'first-name', 'first_name', 'fname', 'given-name',
        'lastname', 'last-name', 'last_name', 'lname', 'surname',
        'email', 'e-mail', 'phone', 'telephone', 'mobile',
        'github', 'linkedin', 'portfolio', 'website',
        'position', 'job', 'career', 'employment', 'hire',
        'cover-letter', 'coverletter', 'motivation',
        'experience', 'education', 'qualification', 'skill'
    ];
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    if (excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasResumeOrCv = allText.includes('resume') || allText.includes('cv');
    
    if (!hasResumeOrCv) {
        return false;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let inputCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        inputCount++;
    }
    
    return inputCount >= 3;
}

function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'paste apply';
    text.className = 'autofill-btn-text';
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        button.style.boxShadow = '0 4px 14px rgba(76, 175, 80, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        setTimeout(() => {
            text.textContent = 'paste apply';
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }, 2000);
    };
    document.body.appendChild(button);
}
function initButton() {
    if (window.self !== window.top)
        return;
    
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
    
    const hostname = window.location.hostname.toLowerCase();
    const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    
    if (isExcluded) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}



if (document.body) {
    initButton();
}
else {
    document.addEventListener('DOMContentLoaded', initButton);
}
if (document.body) {
    const observer = new MutationObserver(() => {
        if (window.self !== window.top)
            return;
        
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
        
        const hostname = window.location.hostname.toLowerCase();
        const isExcluded = excludedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
        
        if (isExcluded) {
            const existingButton = document.getElementById('job-app-autofill-btn');
            if (existingButton) {
                existingButton.remove();
            }
            return;
        }
        
        if (!document.getElementById('job-app-autofill-btn') && document.body) {
            chrome.storage.sync.get(['showAutoFillButton'], (result) => {
                const showButton = result.showAutoFillButton !== false;
                if (showButton && isJobApplicationForm()) {
                    createFillButton();
                }
            });
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        fillForm();
    }
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateButtonVisibility') {
        const existingButton = document.getElementById('job-app-autofill-btn');
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                if (!existingButton) {
                    createFillButton();
                }
            } else {
                if (existingButton) {
                    existingButton.remove();
                }
            }
        });
        sendResponse({ success: true });
        return true;
    }
    if (request.action === 'fillForm') {
        console.log('[AutoFill] Received fillForm command from background');
        try {
            fillForm();
            sendResponse({ success: true, message: 'Form fill initiated' });
        }
        catch (error) {
            console.error('Error in fillForm:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
        }
        return true;
    }
    return false;
});

})();

})();

})();

})();

})();

})();

})();

})();

})();

})();

})();

})();
