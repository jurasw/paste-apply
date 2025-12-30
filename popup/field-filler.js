import { isCustomDropdown, fillCustomDropdown } from './field-matcher';

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

