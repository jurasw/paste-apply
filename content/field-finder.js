import { getLabelText, isCustomDropdown, fillCustomDropdown } from './field-matcher';
import { looksLikePhoneNumber, looksLikeEmail } from './utils';
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
export function findFieldByKeywords(keywords, value) {
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
export function findFieldByLabelText(labelKeywords, value) {
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
export function findFieldByTextSearch(labelKeywords, value) {
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
