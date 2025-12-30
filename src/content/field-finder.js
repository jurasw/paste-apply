import { getLabelText, isCustomDropdown, fillCustomDropdown } from './field-matcher';
import { looksLikePhoneNumber, looksLikeEmail } from './utils';
function fillInputField(htmlInput, value, fieldId) {
    try {
        htmlInput.focus();
        if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput;
                const valueLower = value.toLowerCase();
            let option = null;
            for (let i = 0; i < selectEl.options.length; i++) {
                const opt = selectEl.options[i];
                if (opt.value.toLowerCase().includes(valueLower) || opt.text.toLowerCase().includes(valueLower)) {
                    option = opt;
                    break;
                }
            }
            if (option) {
                selectEl.value = option.value;
            }
            else {
                selectEl.value = value;
            }
        }
        else if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'radio') {
                const name = inputEl.name;
                if (name) {
                    const valueLower = value.toLowerCase().trim();
                    const radioGroup = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
                    for (const radio of Array.from(radioGroup)) {
                        const radioValue = (radio.value || '').toLowerCase().trim();
                        const radioLabel = getLabelText(radio).toLowerCase().trim();
                        const radioText = (radio.parentElement?.textContent || '').toLowerCase().trim();
                        if (radioValue === valueLower || radioLabel === valueLower || radioText.includes(valueLower) ||
                            radioValue.includes(valueLower) || radioLabel.includes(valueLower) ||
                            valueLower.includes(radioValue) || valueLower.includes(radioLabel)) {
                            radio.checked = true;
                            radio.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                            radio.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
                            radio.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                            console.log(`[AutoFill] Selected radio button: ${fieldId} with value: ${value.substring(0, 20)}`);
                            return true;
                        }
                    }
                }
                return false;
            }
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
export function fillRadioButtonGroup(keywords, value) {
    const valueLower = value.toLowerCase().trim();
    const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
    for (const radio of allRadios) {
        const name = radio.name;
        if (!name) continue;
        const id = (radio.id || '').toLowerCase();
        const labelText = getLabelText(radio).toLowerCase();
        const parentText = (radio.parentElement?.textContent || '').toLowerCase();
        const searchText = `${id} ${labelText} ${parentText}`;
        let foundKeyword = false;
        for (const keyword of keywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                foundKeyword = true;
                break;
            }
        }
        if (!foundKeyword) continue;
        const radioGroup = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
        for (const radioOption of Array.from(radioGroup)) {
            const radioValue = (radioOption.value || '').toLowerCase().trim();
            const radioLabel = getLabelText(radioOption).toLowerCase().trim();
            const radioText = (radioOption.parentElement?.textContent || '').toLowerCase().trim();
            if (radioValue === valueLower || radioLabel === valueLower || radioText.includes(valueLower) ||
                radioValue.includes(valueLower) || radioLabel.includes(valueLower) ||
                valueLower.includes(radioValue) || valueLower.includes(radioLabel)) {
                radioOption.checked = true;
                radioOption.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                radioOption.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
                radioOption.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                console.log(`[AutoFill] Selected radio button: ${name} with value: ${value.substring(0, 20)}`);
                return true;
            }
        }
    }
    return false;
}
export function findFieldByKeywords(keywords, value) {
    const keywordsSet = new Set(keywords.map(k => k.toLowerCase()));
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    const emailKeywords = new Set(['email', 'e-mail', 'adres e-mail', 'adres email']);
    const phoneKeywords = new Set(['phone', 'telephone', 'telefon', 'numer telefonu', 'telefon komórkowy', 'komórka', 'mobile', 'cell', 'tel']);
    const locationKeywords = new Set(['location', 'city', 'address', 'residence', 'lokalizacja', 'miejsce zamieszkania', 'adres', 'miasto', 'kraj']);
    for (const input of allInputs) {
        const htmlInput = input;
        if (htmlInput.tagName === 'INPUT') {
            const inputEl = htmlInput;
            if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file')
                continue;
            if (inputEl.type === 'radio' && inputEl.checked) {
                continue;
            }
        }
        const currentValue = htmlInput.tagName === 'SELECT'
            ? htmlInput.value
            : htmlInput.value;
        if (htmlInput.tagName === 'INPUT' && htmlInput.type === 'radio') {
        } else if (currentValue && currentValue.trim() !== '') {
            continue;
        }
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
        let foundKeyword = false;
        for (const keyword of keywordsSet) {
            if (searchText.includes(keyword)) {
                foundKeyword = true;
                break;
            }
        }
        if (!foundKeyword) continue;
        let isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email';
        if (!isEmailField) {
            for (const k of emailKeywords) {
                if (searchText.includes(k)) {
                    isEmailField = true;
                    break;
                }
            }
        }
        if (isEmailField && !value.includes('@')) {
            continue;
        }
        let isPhoneField = false;
        for (const k of phoneKeywords) {
            if (searchText.includes(k)) {
                isPhoneField = true;
                break;
            }
        }
        if (isPhoneField && !looksLikePhoneNumber(value)) {
            continue;
        }
        let isLocationField = false;
        for (const k of locationKeywords) {
            if (searchText.includes(k)) {
                isLocationField = true;
                break;
            }
        }
        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
            continue;
        }
        const fieldId = id || name || ariaLabel || 'unknown';
        return fillInputField(htmlInput, value, fieldId);
    }
    return false;
}
export function findFieldByLabelText(labelKeywords, value) {
    const keywordsSet = new Set(labelKeywords.map(k => k.toLowerCase()));
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    const emailKeywords = new Set(['email', 'e-mail', 'adres e-mail', 'adres email']);
    const phoneKeywords = new Set(['phone', 'telephone', 'telefon', 'numer telefonu', 'telefon komórkowy', 'komórka', 'mobile', 'cell', 'tel']);
    const locationKeywords = new Set(['location', 'city', 'address', 'residence', 'lokalizacja', 'miejsce zamieszkania', 'adres', 'miasto', 'kraj']);
    const fieldTypeKeywords = new Set(['first name', 'last name', 'email', 'phone', 'github', 'linkedin', 'website', 'portfolio', 'imię', 'imie', 'nazwisko', 'telefon', 'strona']);
    for (const label of labels) {
        let labelText = (label.textContent || '').toLowerCase();
        labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        let foundKeyword = false;
        for (const keyword of keywordsSet) {
            if (labelText.includes(keyword)) {
                foundKeyword = true;
                break;
            }
        }
        if (!foundKeyword) continue;
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
            let isEmailField = input.tagName === 'INPUT' && input.type === 'email';
            if (!isEmailField) {
                for (const k of emailKeywords) {
                    if (labelText.includes(k)) {
                        isEmailField = true;
                        break;
                    }
                }
            }
            if (isEmailField && !value.includes('@')) {
                continue;
            }
            let isPhoneField = false;
            for (const k of phoneKeywords) {
                if (labelText.includes(k)) {
                    isPhoneField = true;
                    break;
                }
            }
            if (isPhoneField && !looksLikePhoneNumber(value)) {
                continue;
            }
            let isLocationField = false;
            for (const k of locationKeywords) {
                if (labelText.includes(k)) {
                    isLocationField = true;
                    break;
                }
            }
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
    for (const textEl of allTextElements) {
        const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
        if (text.length > 50 || text.length < 3)
            continue;
        let foundKeyword = false;
        let hasFieldType = false;
        for (const keyword of keywordsSet) {
            if (text.includes(keyword)) {
                foundKeyword = true;
                break;
            }
        }
        if (!foundKeyword) continue;
        for (const fieldType of fieldTypeKeywords) {
            if (text.includes(fieldType)) {
                hasFieldType = true;
                break;
            }
        }
        if (!hasFieldType) continue;
        let input = null;
        input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
        if (!input) {
            const nextSibling = textEl.nextElementSibling;
            if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
                input = nextSibling;
            }
        }
        if (input) {
            let isEmailField = input.tagName === 'INPUT' && input.type === 'email';
            if (!isEmailField) {
                for (const k of emailKeywords) {
                    if (text.includes(k)) {
                        isEmailField = true;
                        break;
                    }
                }
            }
            if (isEmailField && !value.includes('@')) {
                continue;
            }
            let isPhoneField = false;
            for (const k of phoneKeywords) {
                if (text.includes(k)) {
                    isPhoneField = true;
                    break;
                }
            }
            if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                continue;
            }
            let isLocationField = false;
            for (const k of locationKeywords) {
                if (text.includes(k)) {
                    isLocationField = true;
                    break;
                }
            }
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
    return false;
}
export function findFieldByTextSearch(labelKeywords, value) {
    const keywordsSet = new Set(labelKeywords.map(k => k.toLowerCase()));
    const emailKeywords = new Set(['email', 'e-mail', 'adres e-mail', 'adres email']);
    const phoneKeywords = new Set(['phone', 'telephone', 'telefon', 'numer telefonu', 'telefon komórkowy', 'komórka', 'mobile', 'cell', 'tel']);
    const locationKeywords = new Set(['location', 'city', 'address', 'residence', 'lokalizacja', 'miejsce zamieszkania', 'adres', 'miasto', 'kraj']);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
        const text = node.textContent || '';
        const textLower = text.toLowerCase().trim();
        if (textLower.length >= 50) {
            node = walker.nextNode();
            continue;
        }
        let foundKeyword = false;
        for (const keyword of keywordsSet) {
            if (textLower.includes(keyword)) {
                foundKeyword = true;
                break;
            }
        }
        if (!foundKeyword) {
            node = walker.nextNode();
            continue;
        }
        let element = node.parentElement;
        let depth = 0;
        while (element && depth < 10) {
            const inputs = element.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select');
            for (const input of Array.from(inputs)) {
                const htmlInput = input;
                let isEmailField = htmlInput.tagName === 'INPUT' && htmlInput.type === 'email';
                if (!isEmailField) {
                    for (const k of emailKeywords) {
                        if (textLower.includes(k)) {
                            isEmailField = true;
                            break;
                        }
                    }
                }
                if (isEmailField && !value.includes('@')) {
                    continue;
                }
                let isPhoneField = false;
                for (const k of phoneKeywords) {
                    if (textLower.includes(k)) {
                        isPhoneField = true;
                        break;
                    }
                }
                if (isPhoneField && !looksLikePhoneNumber(value)) {
                    continue;
                }
                let isLocationField = false;
                for (const k of locationKeywords) {
                    if (textLower.includes(k)) {
                        isLocationField = true;
                        break;
                    }
                }
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
        node = walker.nextNode();
    }
    return false;
}
