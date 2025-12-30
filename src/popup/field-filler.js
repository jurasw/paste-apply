import { isCustomDropdown, fillCustomDropdown, getLabelText } from './field-matcher';

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

export function fillInputField(htmlInput, value, fieldId) {
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

