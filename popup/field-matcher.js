export const fieldMappings = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name', 'imię', 'imie', 'imie_field', 'imię_field'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname', 'nazwisko', 'nazwisko_field'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail', 'adres e-mail', 'adres_email', 'e-mail_field'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'telefon', 'numer telefonu', 'numer_telefonu', 'telefon komórkowy', 'telefon_komórkowy', 'komórka'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url', 'strona', 'strona internetowa', 'strona_internetowa'],
    location: ['location', 'city', 'address', 'residence', 'country', 'location country', 'location city', 'lokalizacja', 'miejsce zamieszkania', 'adres', 'miasto', 'kraj'],
    resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url', 'życiorys', 'zyciorys', 'curriculum vitae']
};

export function getLabelText(input) {
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

export function isCustomDropdown(input) {
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

export function findDropdownOption(input, searchValue) {
    const valueLower = searchValue.toLowerCase().trim();
    const valueParts = valueLower.split(/[,\s]+/).filter(part => part.length > 2);
    const valuePartsSet = new Set(valueParts);
    const searchTerms = new Set([valueLower, ...valueParts]);
    let container = input.parentElement;
    for (let i = 0; i < 5 && container; i++) {
        const dropdowns = container.querySelectorAll('[role="listbox"], [role="menu"], .dropdown-menu, .select-menu, .autocomplete-list, [class*="dropdown"], [class*="select"], [class*="option"], ul[class*="list"], div[class*="list"]');
        for (const dropdown of Array.from(dropdowns)) {
            const options = dropdown.querySelectorAll('[role="option"], li, div[class*="option"], div[class*="item"]');
            for (const option of Array.from(options)) {
                const optionText = (option.textContent || '').toLowerCase().trim();
                const optionValue = option.getAttribute('value') || option.getAttribute('data-value') || '';
                const optionValueLower = optionValue.toLowerCase();
                const optionTextLower = optionText.toLowerCase();
                for (const term of searchTerms) {
                    if (optionTextLower.includes(term) || optionValueLower.includes(term)) {
                        return option;
                    }
                }
            }
        }
        container = container.parentElement;
    }
    return null;
}

export async function fillCustomDropdown(input, value) {
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

