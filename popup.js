(function() {
const profileFields = [
    'firstName', 'lastName', 'email', 'phone',
    'github', 'linkedin', 'portfolio', 'location'
];
const resizeDimensions = { width: '400px', height: '600px' };
const maxFileSizeMb = 7;
function getElementById(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Element with id "${id}" not found`);
    return element;
}
function showStatus(message, type) {
    const status = getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => {
        status.className = 'status';
    }, 5000);
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function resizePopup() {
    document.body.style.width = resizeDimensions.width;
    document.body.style.height = resizeDimensions.height;
    document.documentElement.style.width = resizeDimensions.width;
    document.documentElement.style.height = resizeDimensions.height;
}
function getPdfJsLib() {
    return window.pdfjsLib || window['pdfjs-dist/build/pdf'];
}
async function loadProfileData() {
    const data = await chrome.storage.sync.get(profileFields);
    return data;
}
async function loadResumeData() {
    const data = await chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType']);
    return data;
}
function populateFormFields(data) {
    profileFields.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field]) {
            element.value = data[field];
        }
    });
}


function parseResumeText(text) {
    const result = {};
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
        result.email = emailMatch[0];
    }
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,9}/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        result.phone = phoneMatch[0].trim();
    }
    const githubRegex = /(?:github\.com\/|@)([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})/gi;
    const githubMatch = text.match(githubRegex);
    if (githubMatch) {
        const githubUrl = githubMatch[0].startsWith('http') ? githubMatch[0] :
            githubMatch[0].startsWith('github.com') ? 'https://' + githubMatch[0] :
                'https://github.com/' + githubMatch[0].replace('@', '');
        result.github = githubUrl;
    }
    const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9-]+)/gi;
    const linkedinMatch = text.match(linkedinRegex);
    if (linkedinMatch) {
        const linkedinUrl = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] :
            'https://www.' + linkedinMatch[0];
        result.linkedin = linkedinUrl;
    }
    const portfolioRegex = /(?:portfolio|website|personal\s+site)[\s:]*([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/gi;
    const portfolioMatch = text.match(portfolioRegex);
    if (portfolioMatch) {
        const url = portfolioMatch[0].match(/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
        if (url) {
            result.portfolio = url[0].startsWith('http') ? url[0] : 'https://' + url[0];
        }
    }
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const firstFewLines = lines.slice(0, 10).join(' ');
    const namePattern = /^([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/;
    const nameMatch = firstFewLines.match(namePattern);
    if (nameMatch) {
        const fullName = nameMatch[0].trim().split(/\s+/);
        if (fullName.length >= 2) {
            result.firstName = fullName[0];
            result.lastName = fullName.slice(1).join(' ');
        }
    }
    const locationPatterns = [
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[A-Z]{2}\s+\d{5}/
    ];
    for (const pattern of locationPatterns) {
        const locationMatch = text.match(pattern);
        if (locationMatch) {
            result.location = locationMatch[0];
            break;
        }
    }
    return result;
}
async function parseResume() {
    const parseResumeBtn = getElementById('parseResumeBtn');
    const resumeData = await loadResumeData();
    if (!resumeData.resumeFile) {
        showStatus('Please select a resume file first', 'error');
        return;
    }
    try {
        showStatus('Extracting information from resume...', 'success');
        parseResumeBtn.disabled = true;
        parseResumeBtn.textContent = 'Extracting...';
        const base64Data = resumeData.resumeFile.split(',')[1] || resumeData.resumeFile;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const pdfjsLib = getPdfJsLib();
        if (!pdfjsLib) {
            throw new Error('PDF.js library not loaded. Please refresh the extension popup.');
        }
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
        }
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += pageText + ' ';
        }
        const extractedData = parseResumeText(fullText);
        populateFormFields(extractedData);
        const foundFields = Object.entries(extractedData)
            .filter(([, value]) => value)
            .map(([key]) => key)
            .join(', ');
        showStatus(`Extracted: ${foundFields || 'No information found'}`, 'success');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showStatus('Error parsing resume: ' + errorMessage, 'error');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
        console.error('PDF parsing error:', error);
    }
}

function injectFillFunction(profileData, resumeData) {
    function looksLikePhoneNumber(value) {
        const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
        return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
    }
    function looksLikeEmail(value) {
        return value.includes('@') && value.includes('.');
    }
    function looksLikeName(value) {
        return !looksLikePhoneNumber(value) && !looksLikeEmail(value) && /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/.test(value.trim());
    }
    const fieldMappings = {
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
                        if (isPhoneField && !looksLikePhoneNumber(value)) {
                            continue;
                        }
                        const isLocationField = text.includes('location') || text.includes('city') || 
                                              text.includes('address') || text.includes('residence') ||
                                              text.includes('lokalizacja') || text.includes('miejsce zamieszkania') ||
                                              text.includes('adres') || text.includes('miasto') || text.includes('kraj');
                        if (isLocationField && (looksLikePhoneNumber(value) || looksLikeEmail(value))) {
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
    function uploadResumeFile() {
        if (!resumeData.resumeFile)
            return false;
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
            const base64 = resumeData.resumeFile.includes(',') ? resumeData.resumeFile.split(',')[1] : resumeData.resumeFile;
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: resumeData.resumeFileType || 'application/pdf' });
            const file = new File([blob], resumeData.resumeFileName || 'resume.pdf', { type: resumeData.resumeFileType || 'application/pdf' });
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
            console.log(`[AutoFill] ✓ Successfully uploaded resume file: ${resumeData.resumeFileName || 'resume.pdf'} to input with id="${targetInput.id || 'none'}", name="${targetInput.name || 'none'}"`);
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
        { key: 'location', label: 'Location', keywords: fieldMappings.location, labelKeywords: ['location', 'city', 'location field', 'city field', 'lokalizacja', 'miasto', 'miejsce zamieszkania', 'adres'] }
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
    if (uploadResumeFile()) {
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

(function() {
const profileFields = [
    'firstName', 'lastName', 'email', 'phone',
    'github', 'linkedin', 'portfolio', 'location'
];
const resizeDimensions = { width: '400px', height: '600px' };
const maxFileSizeMb = 7;
function getElementById(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Element with id "${id}" not found`);
    return element;
}
function showStatus(message, type) {
    const status = getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => {
        status.className = 'status';
    }, 5000);
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function resizePopup() {
    document.body.style.width = resizeDimensions.width;
    document.body.style.height = resizeDimensions.height;
    document.documentElement.style.width = resizeDimensions.width;
    document.documentElement.style.height = resizeDimensions.height;
}
function getPdfJsLib() {
    return window.pdfjsLib || window['pdfjs-dist/build/pdf'];
}
async function loadProfileData() {
    const data = await chrome.storage.sync.get(profileFields);
    return data;
}
async function loadResumeData() {
    const data = await chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType']);
    return data;
}
function populateFormFields(data) {
    profileFields.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field]) {
            element.value = data[field];
        }
    });
}


function parseResumeText(text) {
    const result = {};
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
        result.email = emailMatch[0];
    }
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,9}/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        result.phone = phoneMatch[0].trim();
    }
    const githubRegex = /(?:github\.com\/|@)([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})/gi;
    const githubMatch = text.match(githubRegex);
    if (githubMatch) {
        const githubUrl = githubMatch[0].startsWith('http') ? githubMatch[0] :
            githubMatch[0].startsWith('github.com') ? 'https://' + githubMatch[0] :
                'https://github.com/' + githubMatch[0].replace('@', '');
        result.github = githubUrl;
    }
    const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9-]+)/gi;
    const linkedinMatch = text.match(linkedinRegex);
    if (linkedinMatch) {
        const linkedinUrl = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] :
            'https://www.' + linkedinMatch[0];
        result.linkedin = linkedinUrl;
    }
    const portfolioRegex = /(?:portfolio|website|personal\s+site)[\s:]*([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/gi;
    const portfolioMatch = text.match(portfolioRegex);
    if (portfolioMatch) {
        const url = portfolioMatch[0].match(/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
        if (url) {
            result.portfolio = url[0].startsWith('http') ? url[0] : 'https://' + url[0];
        }
    }
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const firstFewLines = lines.slice(0, 10).join(' ');
    const namePattern = /^([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/;
    const nameMatch = firstFewLines.match(namePattern);
    if (nameMatch) {
        const fullName = nameMatch[0].trim().split(/\s+/);
        if (fullName.length >= 2) {
            result.firstName = fullName[0];
            result.lastName = fullName.slice(1).join(' ');
        }
    }
    const locationPatterns = [
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[A-Z]{2}\s+\d{5}/
    ];
    for (const pattern of locationPatterns) {
        const locationMatch = text.match(pattern);
        if (locationMatch) {
            result.location = locationMatch[0];
            break;
        }
    }
    return result;
}
async function parseResume() {
    const parseResumeBtn = getElementById('parseResumeBtn');
    const resumeData = await loadResumeData();
    if (!resumeData.resumeFile) {
        showStatus('Please select a resume file first', 'error');
        return;
    }
    try {
        showStatus('Extracting information from resume...', 'success');
        parseResumeBtn.disabled = true;
        parseResumeBtn.textContent = 'Extracting...';
        const base64Data = resumeData.resumeFile.split(',')[1] || resumeData.resumeFile;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const pdfjsLib = getPdfJsLib();
        if (!pdfjsLib) {
            throw new Error('PDF.js library not loaded. Please refresh the extension popup.');
        }
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
        }
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += pageText + ' ';
        }
        const extractedData = parseResumeText(fullText);
        populateFormFields(extractedData);
        const foundFields = Object.entries(extractedData)
            .filter(([, value]) => value)
            .map(([key]) => key)
            .join(', ');
        showStatus(`Extracted: ${foundFields || 'No information found'}`, 'success');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showStatus('Error parsing resume: ' + errorMessage, 'error');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
        console.error('PDF parsing error:', error);
    }
}

function injectFillFunction(profileData, resumeData) {
    function looksLikePhoneNumber(value) {
        if (!value || typeof value !== 'string') return false;
        const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
        return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
    }
    function looksLikeEmail(value) {
        if (!value || typeof value !== 'string') return false;
        return value.includes('@') && value.includes('.');
    }
    function looksLikeName(value) {
        if (!value || typeof value !== 'string') return false;
        return !looksLikePhoneNumber(value) && !looksLikeEmail(value) && /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/.test(value.trim());
    }
    const fieldMappings = {
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
                    if (isPhoneField && (value.includes('@') || value.includes('http') || value.includes('www.'))) {
                        continue;
                    }
                    const isLocationField = labelText.includes('location') || labelText.includes('city') || 
                                          labelText.includes('address') || labelText.includes('residence') ||
                                          labelText.includes('lokalizacja') || labelText.includes('miejsce zamieszkania') ||
                                          labelText.includes('adres') || labelText.includes('miasto') || labelText.includes('kraj');
                    if (isLocationField && (value.includes('@') || /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && value.replace(/[\s\-\(\)]/g, '').length >= 7)) {
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
    function uploadResumeFile() {
        if (!resumeData.resumeFile)
            return false;
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
            const base64 = resumeData.resumeFile.includes(',') ? resumeData.resumeFile.split(',')[1] : resumeData.resumeFile;
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: resumeData.resumeFileType || 'application/pdf' });
            const file = new File([blob], resumeData.resumeFileName || 'resume.pdf', { type: resumeData.resumeFileType || 'application/pdf' });
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
            console.log(`[AutoFill] ✓ Successfully uploaded resume file: ${resumeData.resumeFileName || 'resume.pdf'} to input with id="${targetInput.id || 'none'}", name="${targetInput.name || 'none'}"`);
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
        { key: 'location', label: 'Location', keywords: fieldMappings.location, labelKeywords: ['location', 'city', 'location field', 'city field', 'lokalizacja', 'miasto', 'miejsce zamieszkania', 'adres'] }
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
    if (uploadResumeFile()) {
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

(function() {
const profileFields = [
    'firstName', 'lastName', 'email', 'phone',
    'github', 'linkedin', 'portfolio', 'location'
];
const resizeDimensions = { width: '400px', height: '600px' };
const maxFileSizeMb = 7;
function getElementById(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Element with id "${id}" not found`);
    return element;
}
function showStatus(message, type) {
    const status = getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => {
        status.className = 'status';
    }, 5000);
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function resizePopup() {
    document.body.style.width = resizeDimensions.width;
    document.body.style.height = resizeDimensions.height;
    document.documentElement.style.width = resizeDimensions.width;
    document.documentElement.style.height = resizeDimensions.height;
}
function getPdfJsLib() {
    return window.pdfjsLib || window['pdfjs-dist/build/pdf'];
}
async function loadProfileData() {
    const data = await chrome.storage.sync.get(profileFields);
    return data;
}
async function loadResumeData() {
    const data = await chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType']);
    return data;
}
function populateFormFields(data) {
    profileFields.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field]) {
            element.value = data[field];
        }
    });
}


function parseResumeText(text) {
    const result = {};
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
        result.email = emailMatch[0];
    }
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,9}/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        result.phone = phoneMatch[0].trim();
    }
    const githubRegex = /(?:github\.com\/|@)([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})/gi;
    const githubMatch = text.match(githubRegex);
    if (githubMatch) {
        const githubUrl = githubMatch[0].startsWith('http') ? githubMatch[0] :
            githubMatch[0].startsWith('github.com') ? 'https://' + githubMatch[0] :
                'https://github.com/' + githubMatch[0].replace('@', '');
        result.github = githubUrl;
    }
    const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9-]+)/gi;
    const linkedinMatch = text.match(linkedinRegex);
    if (linkedinMatch) {
        const linkedinUrl = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] :
            'https://www.' + linkedinMatch[0];
        result.linkedin = linkedinUrl;
    }
    const portfolioRegex = /(?:portfolio|website|personal\s+site)[\s:]*([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/gi;
    const portfolioMatch = text.match(portfolioRegex);
    if (portfolioMatch) {
        const url = portfolioMatch[0].match(/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
        if (url) {
            result.portfolio = url[0].startsWith('http') ? url[0] : 'https://' + url[0];
        }
    }
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const firstFewLines = lines.slice(0, 10).join(' ');
    const namePattern = /^([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/;
    const nameMatch = firstFewLines.match(namePattern);
    if (nameMatch) {
        const fullName = nameMatch[0].trim().split(/\s+/);
        if (fullName.length >= 2) {
            result.firstName = fullName[0];
            result.lastName = fullName.slice(1).join(' ');
        }
    }
    const locationPatterns = [
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[A-Z]{2}\s+\d{5}/
    ];
    for (const pattern of locationPatterns) {
        const locationMatch = text.match(pattern);
        if (locationMatch) {
            result.location = locationMatch[0];
            break;
        }
    }
    return result;
}
async function parseResume() {
    const parseResumeBtn = getElementById('parseResumeBtn');
    const resumeData = await loadResumeData();
    if (!resumeData.resumeFile) {
        showStatus('Please select a resume file first', 'error');
        return;
    }
    try {
        showStatus('Extracting information from resume...', 'success');
        parseResumeBtn.disabled = true;
        parseResumeBtn.textContent = 'Extracting...';
        const base64Data = resumeData.resumeFile.split(',')[1] || resumeData.resumeFile;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const pdfjsLib = getPdfJsLib();
        if (!pdfjsLib) {
            throw new Error('PDF.js library not loaded. Please refresh the extension popup.');
        }
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
        }
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += pageText + ' ';
        }
        const extractedData = parseResumeText(fullText);
        populateFormFields(extractedData);
        const foundFields = Object.entries(extractedData)
            .filter(([, value]) => value)
            .map(([key]) => key)
            .join(', ');
        showStatus(`Extracted: ${foundFields || 'No information found'}`, 'success');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showStatus('Error parsing resume: ' + errorMessage, 'error');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
        console.error('PDF parsing error:', error);
    }
}

function injectFillFunction(profileData, resumeData) {
    function looksLikePhoneNumber(value) {
        if (!value || typeof value !== 'string') return false;
        const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
        return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
    }
    function looksLikeEmail(value) {
        if (!value || typeof value !== 'string') return false;
        return value.includes('@') && value.includes('.');
    }
    function looksLikeName(value) {
        if (!value || typeof value !== 'string') return false;
        return !looksLikePhoneNumber(value) && !looksLikeEmail(value) && /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/.test(value.trim());
    }
    const fieldMappings = {
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
    function uploadResumeFile() {
        if (!resumeData.resumeFile)
            return false;
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
            const base64 = resumeData.resumeFile.includes(',') ? resumeData.resumeFile.split(',')[1] : resumeData.resumeFile;
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: resumeData.resumeFileType || 'application/pdf' });
            const file = new File([blob], resumeData.resumeFileName || 'resume.pdf', { type: resumeData.resumeFileType || 'application/pdf' });
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
            console.log(`[AutoFill] ✓ Successfully uploaded resume file: ${resumeData.resumeFileName || 'resume.pdf'} to input with id="${targetInput.id || 'none'}", name="${targetInput.name || 'none'}"`);
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
        { key: 'location', label: 'Location', keywords: fieldMappings.location, labelKeywords: ['location', 'city', 'location field', 'city field', 'lokalizacja', 'miasto', 'miejsce zamieszkania', 'adres'] }
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
    if (uploadResumeFile()) {
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

(function() {
const profileFields = [
    'firstName', 'lastName', 'email', 'phone',
    'github', 'linkedin', 'portfolio', 'location'
];
const resizeDimensions = { width: '400px', height: '600px' };
const maxFileSizeMb = 7;
function getElementById(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Element with id "${id}" not found`);
    return element;
}
function showStatus(message, type) {
    const status = getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => {
        status.className = 'status';
    }, 5000);
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function resizePopup() {
    document.body.style.width = resizeDimensions.width;
    document.body.style.height = resizeDimensions.height;
    document.documentElement.style.width = resizeDimensions.width;
    document.documentElement.style.height = resizeDimensions.height;
}
function getPdfJsLib() {
    return window.pdfjsLib || window['pdfjs-dist/build/pdf'];
}
async function loadProfileData() {
    const data = await chrome.storage.sync.get(profileFields);
    return data;
}
async function loadResumeData() {
    const data = await chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType']);
    return data;
}
function populateFormFields(data) {
    profileFields.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field]) {
            element.value = data[field];
        }
    });
}


function parseResumeText(text) {
    const result = {};
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
        result.email = emailMatch[0];
    }
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,9}/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        result.phone = phoneMatch[0].trim();
    }
    const githubRegex = /(?:github\.com\/|@)([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})/gi;
    const githubMatch = text.match(githubRegex);
    if (githubMatch) {
        const githubUrl = githubMatch[0].startsWith('http') ? githubMatch[0] :
            githubMatch[0].startsWith('github.com') ? 'https://' + githubMatch[0] :
                'https://github.com/' + githubMatch[0].replace('@', '');
        result.github = githubUrl;
    }
    const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9-]+)/gi;
    const linkedinMatch = text.match(linkedinRegex);
    if (linkedinMatch) {
        const linkedinUrl = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] :
            'https://www.' + linkedinMatch[0];
        result.linkedin = linkedinUrl;
    }
    const portfolioRegex = /(?:portfolio|website|personal\s+site)[\s:]*([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/gi;
    const portfolioMatch = text.match(portfolioRegex);
    if (portfolioMatch) {
        const url = portfolioMatch[0].match(/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
        if (url) {
            result.portfolio = url[0].startsWith('http') ? url[0] : 'https://' + url[0];
        }
    }
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const firstFewLines = lines.slice(0, 10).join(' ');
    const namePattern = /^([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/;
    const nameMatch = firstFewLines.match(namePattern);
    if (nameMatch) {
        const fullName = nameMatch[0].trim().split(/\s+/);
        if (fullName.length >= 2) {
            result.firstName = fullName[0];
            result.lastName = fullName.slice(1).join(' ');
        }
    }
    const locationPatterns = [
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[A-Z]{2}\s+\d{5}/
    ];
    for (const pattern of locationPatterns) {
        const locationMatch = text.match(pattern);
        if (locationMatch) {
            result.location = locationMatch[0];
            break;
        }
    }
    return result;
}
async function parseResume() {
    const parseResumeBtn = getElementById('parseResumeBtn');
    const resumeData = await loadResumeData();
    if (!resumeData.resumeFile) {
        showStatus('Please select a resume file first', 'error');
        return;
    }
    try {
        showStatus('Extracting information from resume...', 'success');
        parseResumeBtn.disabled = true;
        parseResumeBtn.textContent = 'Extracting...';
        const base64Data = resumeData.resumeFile.split(',')[1] || resumeData.resumeFile;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const pdfjsLib = getPdfJsLib();
        if (!pdfjsLib) {
            throw new Error('PDF.js library not loaded. Please refresh the extension popup.');
        }
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
        }
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += pageText + ' ';
        }
        const extractedData = parseResumeText(fullText);
        populateFormFields(extractedData);
        const foundFields = Object.entries(extractedData)
            .filter(([, value]) => value)
            .map(([key]) => key)
            .join(', ');
        showStatus(`Extracted: ${foundFields || 'No information found'}`, 'success');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showStatus('Error parsing resume: ' + errorMessage, 'error');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
        console.error('PDF parsing error:', error);
    }
}

function injectFillFunction(profileData, resumeData) {
    function looksLikePhoneNumber(value) {
        if (!value || typeof value !== 'string') return false;
        const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
        return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
    }
    function looksLikeEmail(value) {
        if (!value || typeof value !== 'string') return false;
        return value.includes('@') && value.includes('.');
    }
    function looksLikeName(value) {
        if (!value || typeof value !== 'string') return false;
        return !looksLikePhoneNumber(value) && !looksLikeEmail(value) && /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/.test(value.trim());
    }
    const fieldMappings = {
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
    function uploadResumeFile() {
        if (!resumeData.resumeFile)
            return false;
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
            const base64 = resumeData.resumeFile.includes(',') ? resumeData.resumeFile.split(',')[1] : resumeData.resumeFile;
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: resumeData.resumeFileType || 'application/pdf' });
            const file = new File([blob], resumeData.resumeFileName || 'resume.pdf', { type: resumeData.resumeFileType || 'application/pdf' });
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
            console.log(`[AutoFill] ✓ Successfully uploaded resume file: ${resumeData.resumeFileName || 'resume.pdf'} to input with id="${targetInput.id || 'none'}", name="${targetInput.name || 'none'}"`);
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
        { key: 'location', label: 'Location', keywords: fieldMappings.location, labelKeywords: ['location', 'city', 'location field', 'city field', 'lokalizacja', 'miasto', 'miejsce zamieszkania', 'adres'] }
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
    if (uploadResumeFile()) {
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

(function() {
const profileFields = [
    'firstName', 'lastName', 'email', 'phone',
    'github', 'linkedin', 'portfolio', 'location'
];
const resizeDimensions = { width: '400px', height: '600px' };
const maxFileSizeMb = 7;
function getElementById(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Element with id "${id}" not found`);
    return element;
}
function showStatus(message, type) {
    const status = getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => {
        status.className = 'status';
    }, 5000);
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function resizePopup() {
    document.body.style.width = resizeDimensions.width;
    document.body.style.height = resizeDimensions.height;
    document.documentElement.style.width = resizeDimensions.width;
    document.documentElement.style.height = resizeDimensions.height;
}
function getPdfJsLib() {
    return window.pdfjsLib || window['pdfjs-dist/build/pdf'];
}
async function loadProfileData() {
    const data = await chrome.storage.sync.get(profileFields);
    return data;
}
async function loadResumeData() {
    const data = await chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType']);
    return data;
}
function populateFormFields(data) {
    profileFields.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field]) {
            element.value = data[field];
        }
    });
}


function parseResumeText(text) {
    const result = {};
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
        result.email = emailMatch[0];
    }
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,9}/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        result.phone = phoneMatch[0].trim();
    }
    const githubRegex = /(?:github\.com\/|@)([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})/gi;
    const githubMatch = text.match(githubRegex);
    if (githubMatch) {
        const githubUrl = githubMatch[0].startsWith('http') ? githubMatch[0] :
            githubMatch[0].startsWith('github.com') ? 'https://' + githubMatch[0] :
                'https://github.com/' + githubMatch[0].replace('@', '');
        result.github = githubUrl;
    }
    const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9-]+)/gi;
    const linkedinMatch = text.match(linkedinRegex);
    if (linkedinMatch) {
        const linkedinUrl = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] :
            'https://www.' + linkedinMatch[0];
        result.linkedin = linkedinUrl;
    }
    const portfolioRegex = /(?:portfolio|website|personal\s+site)[\s:]*([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/gi;
    const portfolioMatch = text.match(portfolioRegex);
    if (portfolioMatch) {
        const url = portfolioMatch[0].match(/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
        if (url) {
            result.portfolio = url[0].startsWith('http') ? url[0] : 'https://' + url[0];
        }
    }
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const firstFewLines = lines.slice(0, 10).join(' ');
    const namePattern = /^([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/;
    const nameMatch = firstFewLines.match(namePattern);
    if (nameMatch) {
        const fullName = nameMatch[0].trim().split(/\s+/);
        if (fullName.length >= 2) {
            result.firstName = fullName[0];
            result.lastName = fullName.slice(1).join(' ');
        }
    }
    const locationPatterns = [
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[A-Z]{2}\s+\d{5}/
    ];
    for (const pattern of locationPatterns) {
        const locationMatch = text.match(pattern);
        if (locationMatch) {
            result.location = locationMatch[0];
            break;
        }
    }
    return result;
}
async function parseResume() {
    const parseResumeBtn = getElementById('parseResumeBtn');
    const resumeData = await loadResumeData();
    if (!resumeData.resumeFile) {
        showStatus('Please select a resume file first', 'error');
        return;
    }
    try {
        showStatus('Extracting information from resume...', 'success');
        parseResumeBtn.disabled = true;
        parseResumeBtn.textContent = 'Extracting...';
        const base64Data = resumeData.resumeFile.split(',')[1] || resumeData.resumeFile;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const pdfjsLib = getPdfJsLib();
        if (!pdfjsLib) {
            throw new Error('PDF.js library not loaded. Please refresh the extension popup.');
        }
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
        }
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += pageText + ' ';
        }
        const extractedData = parseResumeText(fullText);
        populateFormFields(extractedData);
        const foundFields = Object.entries(extractedData)
            .filter(([, value]) => value)
            .map(([key]) => key)
            .join(', ');
        showStatus(`Extracted: ${foundFields || 'No information found'}`, 'success');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showStatus('Error parsing resume: ' + errorMessage, 'error');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
        console.error('PDF parsing error:', error);
    }
}

function injectFillFunction(profileData, resumeData) {
    function looksLikePhoneNumber(value) {
        if (!value || typeof value !== 'string') return false;
        const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
        return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
    }
    function looksLikeEmail(value) {
        if (!value || typeof value !== 'string') return false;
        return value.includes('@') && value.includes('.');
    }
    function looksLikeName(value) {
        if (!value || typeof value !== 'string') return false;
        return !looksLikePhoneNumber(value) && !looksLikeEmail(value) && /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/.test(value.trim());
    }
    const fieldMappings = {
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
    function uploadResumeFile() {
        if (!resumeData.resumeFile)
            return false;
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
            const base64 = resumeData.resumeFile.includes(',') ? resumeData.resumeFile.split(',')[1] : resumeData.resumeFile;
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: resumeData.resumeFileType || 'application/pdf' });
            const file = new File([blob], resumeData.resumeFileName || 'resume.pdf', { type: resumeData.resumeFileType || 'application/pdf' });
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
            console.log(`[AutoFill] ✓ Successfully uploaded resume file: ${resumeData.resumeFileName || 'resume.pdf'} to input with id="${targetInput.id || 'none'}", name="${targetInput.name || 'none'}"`);
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
        { key: 'location', label: 'Location', keywords: fieldMappings.location, labelKeywords: ['location', 'city', 'location field', 'city field', 'lokalizacja', 'miasto', 'miejsce zamieszkania', 'adres'] }
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
    if (uploadResumeFile()) {
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

(function() {
const profileFields = [
    'firstName', 'lastName', 'email', 'phone',
    'github', 'linkedin', 'portfolio', 'city', 'country'
];
const resizeDimensions = { width: '400px', height: '600px' };
const maxFileSizeMb = 7;
function getElementById(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Element with id "${id}" not found`);
    return element;
}
function showStatus(message, type) {
    const status = getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => {
        status.className = 'status';
    }, 5000);
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function resizePopup() {
    document.body.style.width = resizeDimensions.width;
    document.body.style.height = resizeDimensions.height;
    document.documentElement.style.width = resizeDimensions.width;
    document.documentElement.style.height = resizeDimensions.height;
}
function getPdfJsLib() {
    return window.pdfjsLib || window['pdfjs-dist/build/pdf'];
}
async function loadProfileData() {
    const data = await chrome.storage.sync.get(profileFields);
    return data;
}
async function loadResumeData() {
    const data = await chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType']);
    return data;
}
function populateFormFields(data) {
    profileFields.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field]) {
            element.value = data[field];
        }
    });
}


function parseResumeText(text) {
    const result = {};
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
        result.email = emailMatch[0];
    }
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,9}/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        result.phone = phoneMatch[0].trim();
    }
    const githubRegex = /(?:github\.com\/|@)([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})/gi;
    const githubMatch = text.match(githubRegex);
    if (githubMatch) {
        const githubUrl = githubMatch[0].startsWith('http') ? githubMatch[0] :
            githubMatch[0].startsWith('github.com') ? 'https://' + githubMatch[0] :
                'https://github.com/' + githubMatch[0].replace('@', '');
        result.github = githubUrl;
    }
    const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9-]+)/gi;
    const linkedinMatch = text.match(linkedinRegex);
    if (linkedinMatch) {
        const linkedinUrl = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] :
            'https://www.' + linkedinMatch[0];
        result.linkedin = linkedinUrl;
    }
    const portfolioRegex = /(?:portfolio|website|personal\s+site)[\s:]*([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/gi;
    const portfolioMatch = text.match(portfolioRegex);
    if (portfolioMatch) {
        const url = portfolioMatch[0].match(/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
        if (url) {
            result.portfolio = url[0].startsWith('http') ? url[0] : 'https://' + url[0];
        }
    }
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const firstFewLines = lines.slice(0, 10).join(' ');
    const namePattern = /^([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/;
    const nameMatch = firstFewLines.match(namePattern);
    if (nameMatch) {
        const fullName = nameMatch[0].trim().split(/\s+/);
        if (fullName.length >= 2) {
            result.firstName = fullName[0];
            result.lastName = fullName.slice(1).join(' ');
        }
    }
    const locationPatterns = [
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[A-Z]{2}\s+\d{5}/
    ];
    for (const pattern of locationPatterns) {
        const locationMatch = text.match(pattern);
        if (locationMatch) {
            if (locationMatch[1] && locationMatch[2]) {
                result.city = locationMatch[1].trim();
                result.country = locationMatch[2].trim();
            } else if (locationMatch[0]) {
                const parts = locationMatch[0].split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    result.city = parts[0];
                    result.country = parts.slice(1).join(', ');
                } else {
                    result.city = parts[0];
                }
            }
            break;
        }
    }
    return result;
}
async function parseResume() {
    const parseResumeBtn = getElementById('parseResumeBtn');
    const resumeData = await loadResumeData();
    if (!resumeData.resumeFile) {
        showStatus('Please select a resume file first', 'error');
        return;
    }
    try {
        showStatus('Extracting information from resume...', 'success');
        parseResumeBtn.disabled = true;
        parseResumeBtn.textContent = 'Extracting...';
        const base64Data = resumeData.resumeFile.split(',')[1] || resumeData.resumeFile;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const pdfjsLib = getPdfJsLib();
        if (!pdfjsLib) {
            throw new Error('PDF.js library not loaded. Please refresh the extension popup.');
        }
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
        }
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += pageText + ' ';
        }
        const extractedData = parseResumeText(fullText);
        populateFormFields(extractedData);
        const foundFields = Object.entries(extractedData)
            .filter(([, value]) => value)
            .map(([key]) => key)
            .join(', ');
        showStatus(`Extracted: ${foundFields || 'No information found'}`, 'success');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showStatus('Error parsing resume: ' + errorMessage, 'error');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
        console.error('PDF parsing error:', error);
    }
}

function injectFillFunction(profileData, resumeData) {
    function looksLikePhoneNumber(value) {
        if (!value || typeof value !== 'string') return false;
        const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
        return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
    }
    function looksLikeEmail(value) {
        if (!value || typeof value !== 'string') return false;
        return value.includes('@') && value.includes('.');
    }
    function looksLikeName(value) {
        if (!value || typeof value !== 'string') return false;
        return !looksLikePhoneNumber(value) && !looksLikeEmail(value) && /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/.test(value.trim());
    }
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
    function uploadResumeFile() {
        if (!resumeData.resumeFile)
            return false;
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
            const base64 = resumeData.resumeFile.includes(',') ? resumeData.resumeFile.split(',')[1] : resumeData.resumeFile;
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: resumeData.resumeFileType || 'application/pdf' });
            const file = new File([blob], resumeData.resumeFileName || 'resume.pdf', { type: resumeData.resumeFileType || 'application/pdf' });
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
            console.log(`[AutoFill] ✓ Successfully uploaded resume file: ${resumeData.resumeFileName || 'resume.pdf'} to input with id="${targetInput.id || 'none'}", name="${targetInput.name || 'none'}"`);
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
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
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
    if (uploadResumeFile()) {
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

(function() {
const profileFields = [
    'firstName', 'lastName', 'email', 'phone',
    'github', 'linkedin', 'portfolio', 'city', 'country'
];
const resizeDimensions = { width: '400px', height: '600px' };
const maxFileSizeMb = 7;
function getElementById(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Element with id "${id}" not found`);
    return element;
}
function showStatus(message, type) {
    const status = getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => {
        status.className = 'status';
    }, 5000);
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function resizePopup() {
    document.body.style.width = resizeDimensions.width;
    document.body.style.height = resizeDimensions.height;
    document.documentElement.style.width = resizeDimensions.width;
    document.documentElement.style.height = resizeDimensions.height;
}
function getPdfJsLib() {
    return window.pdfjsLib || window['pdfjs-dist/build/pdf'];
}
async function loadProfileData() {
    const data = await chrome.storage.sync.get(profileFields);
    return data;
}
async function loadResumeData() {
    const data = await chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType']);
    return data;
}
function populateFormFields(data) {
    profileFields.forEach(field => {
        const element = document.getElementById(field);
        if (element && data[field]) {
            element.value = data[field];
        }
    });
}


function parseResumeText(text) {
    const result = {};
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
        result.email = emailMatch[0];
    }
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,9}/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        result.phone = phoneMatch[0].trim();
    }
    const githubRegex = /(?:github\.com\/|@)([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})/gi;
    const githubMatch = text.match(githubRegex);
    if (githubMatch) {
        const githubUrl = githubMatch[0].startsWith('http') ? githubMatch[0] :
            githubMatch[0].startsWith('github.com') ? 'https://' + githubMatch[0] :
                'https://github.com/' + githubMatch[0].replace('@', '');
        result.github = githubUrl;
    }
    const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9-]+)/gi;
    const linkedinMatch = text.match(linkedinRegex);
    if (linkedinMatch) {
        const linkedinUrl = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] :
            'https://www.' + linkedinMatch[0];
        result.linkedin = linkedinUrl;
    }
    const portfolioRegex = /(?:portfolio|website|personal\s+site)[\s:]*([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/gi;
    const portfolioMatch = text.match(portfolioRegex);
    if (portfolioMatch) {
        const url = portfolioMatch[0].match(/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
        if (url) {
            result.portfolio = url[0].startsWith('http') ? url[0] : 'https://' + url[0];
        }
    }
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const firstFewLines = lines.slice(0, 10).join(' ');
    const namePattern = /^([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/;
    const nameMatch = firstFewLines.match(namePattern);
    if (nameMatch) {
        const fullName = nameMatch[0].trim().split(/\s+/);
        if (fullName.length >= 2) {
            result.firstName = fullName[0];
            result.lastName = fullName.slice(1).join(' ');
        }
    }
    const locationPatterns = [
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[A-Z]{2}\s+\d{5}/
    ];
    for (const pattern of locationPatterns) {
        const locationMatch = text.match(pattern);
        if (locationMatch) {
            if (locationMatch[1] && locationMatch[2]) {
                result.city = locationMatch[1].trim();
                result.country = locationMatch[2].trim();
            } else if (locationMatch[0]) {
                const parts = locationMatch[0].split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    result.city = parts[0];
                    result.country = parts.slice(1).join(', ');
                } else {
                    result.city = parts[0];
                }
            }
            break;
        }
    }
    return result;
}
async function parseResume() {
    const parseResumeBtn = getElementById('parseResumeBtn');
    const resumeData = await loadResumeData();
    if (!resumeData.resumeFile) {
        showStatus('Please select a resume file first', 'error');
        return;
    }
    try {
        showStatus('Extracting information from resume...', 'success');
        parseResumeBtn.disabled = true;
        parseResumeBtn.textContent = 'Extracting...';
        const base64Data = resumeData.resumeFile.split(',')[1] || resumeData.resumeFile;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const pdfjsLib = getPdfJsLib();
        if (!pdfjsLib) {
            throw new Error('PDF.js library not loaded. Please refresh the extension popup.');
        }
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
        }
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += pageText + ' ';
        }
        const extractedData = parseResumeText(fullText);
        populateFormFields(extractedData);
        const foundFields = Object.entries(extractedData)
            .filter(([, value]) => value)
            .map(([key]) => key)
            .join(', ');
        showStatus(`Extracted: ${foundFields || 'No information found'}`, 'success');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showStatus('Error parsing resume: ' + errorMessage, 'error');
        parseResumeBtn.disabled = false;
        parseResumeBtn.textContent = 'Extract Info from Resume';
        console.error('PDF parsing error:', error);
    }
}

function injectFillFunction(profileData, resumeData) {
    function looksLikePhoneNumber(value) {
        if (!value || typeof value !== 'string') return false;
        const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
        return /^\+?[\d\s\-\(\)]+$/.test(value.trim()) && cleaned.length >= 7 && /^\d+$/.test(cleaned);
    }
    function looksLikeEmail(value) {
        if (!value || typeof value !== 'string') return false;
        return value.includes('@') && value.includes('.');
    }
    function looksLikeName(value) {
        if (!value || typeof value !== 'string') return false;
        return !looksLikePhoneNumber(value) && !looksLikeEmail(value) && /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/.test(value.trim());
    }
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
    function uploadResumeFile() {
        if (!resumeData.resumeFile)
            return false;
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
            const base64 = resumeData.resumeFile.includes(',') ? resumeData.resumeFile.split(',')[1] : resumeData.resumeFile;
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: resumeData.resumeFileType || 'application/pdf' });
            const file = new File([blob], resumeData.resumeFileName || 'resume.pdf', { type: resumeData.resumeFileType || 'application/pdf' });
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
            console.log(`[AutoFill] ✓ Successfully uploaded resume file: ${resumeData.resumeFileName || 'resume.pdf'} to input with id="${targetInput.id || 'none'}", name="${targetInput.name || 'none'}"`);
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
    console.log('[AutoFill] Starting form fill in frame:', window.location.href);
    console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
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
    if (uploadResumeFile()) {
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




document.addEventListener('DOMContentLoaded', async () => {
    const form = getElementById('profileForm');
    const fillBtn = getElementById('fillBtn');
    const resumeInput = getElementById('resume');
    const resumeInfo = getElementById('resumeInfo');
    const parseResumeBtn = getElementById('parseResumeBtn');
    const parseResumeHint = getElementById('parseResumeHint');
    const showButtonSetting = getElementById('showButtonSetting');
    
    resumeInput.addEventListener('click', resizePopup);
    resumeInput.addEventListener('focus', resizePopup);
    
    const profileData = await loadProfileData();
    const resumeData = await loadResumeData();
    populateFormFields(profileData);
    
    const settings = await chrome.storage.sync.get(['showAutoFillButton']);
    showButtonSetting.checked = settings.showAutoFillButton !== false;
    
    showButtonSetting.addEventListener('change', async (e) => {
        await chrome.storage.sync.set({ showAutoFillButton: e.target.checked });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'updateButtonVisibility' }).catch(() => {
                    chrome.tabs.reload(tabs[0].id);
                });
            }
        });
    });
    if (resumeData.resumeFile && resumeData.resumeFileName) {
        resumeInfo.textContent = `Saved file: ${resumeData.resumeFileName}`;
        parseResumeBtn.style.display = 'block';
        parseResumeHint.style.display = 'block';
        parseResumeHint.style.visibility = 'visible';
        parseResumeHint.style.opacity = '1';
        console.log('Loaded saved resume:', resumeData.resumeFileName);
    }
    resumeInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
            showStatus('Please upload a PDF file', 'error');
            return;
        }
        const fileSizeMb = file.size / (1024 * 1024);
        if (fileSizeMb > maxFileSizeMb) {
            showStatus(`File too large (${fileSizeMb.toFixed(1)}MB). Maximum size is ${maxFileSizeMb}MB.`, 'error');
            resumeInput.value = '';
            return;
        }
        resumeInfo.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        parseResumeBtn.style.display = 'block';
        parseResumeHint.style.display = 'block';
        parseResumeHint.style.visibility = 'visible';
        parseResumeHint.style.opacity = '1';
        try {
            showStatus('Saving resume file...', 'success');
            const base64 = await fileToBase64(file);
            const dataToSave = {
                resumeFile: base64,
                resumeFileName: file.name,
                resumeFileType: file.type
            };
            await chrome.storage.local.set(dataToSave);
            const verify = await chrome.storage.local.get(['resumeFile', 'resumeFileName']);
            if (verify.resumeFile && verify.resumeFileName === file.name) {
                showStatus('Resume file saved! Auto-filling profile...', 'success');
                console.log('Resume saved:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);
                try {
                    await parseResume();
                    showStatus('Profile auto-filled from resume!', 'success');
                }
                catch (parseError) {
                    console.error('Auto-fill error:', parseError);
                    showStatus('Resume saved. Click "Auto-Fill Profile" button to extract info.', 'success');
                }
            }
            else {
                throw new Error('Failed to verify save');
            }
        }
        catch (error) {
            console.error('Error saving resume:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('QUOTA_BYTES')) {
                showStatus('Error: File too large for storage. Please use a smaller file.', 'error');
            }
            else {
                showStatus('Error saving resume: ' + errorMessage, 'error');
            }
            resumeInfo.textContent = '';
            parseResumeBtn.style.display = 'none';
            parseResumeHint.style.display = 'none';
        }
    });
    parseResumeBtn.addEventListener('click', parseResume);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            firstName: getElementById('firstName').value,
            lastName: getElementById('lastName').value,
            email: getElementById('email').value,
            phone: getElementById('phone').value,
            github: getElementById('github').value,
            linkedin: getElementById('linkedin').value,
            portfolio: getElementById('portfolio').value,
            city: getElementById('city').value,
            country: getElementById('country').value
        };
        try {
            await chrome.storage.sync.set(data);
            showStatus('Profile saved successfully!', 'success');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            showStatus('Error saving profile: ' + errorMessage, 'error');
        }
    });
    fillBtn.addEventListener('click', async () => {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tab = tabs[0];
            if (!tab || !tab.url) {
                showStatus('Error: Could not access current tab', 'error');
                return;
            }
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
                showStatus('Error: Cannot fill forms on this page type', 'error');
                return;
            }
            const profileData = await loadProfileData();
            const resumeData = await loadResumeData();
            try {
                await chrome.tabs.sendMessage(tab.id, { action: 'fillForm' });
                showStatus('Form fill attempted! Check the page.', 'success');
            }
            catch (messageError) {
                const errorMessage = messageError instanceof Error ? messageError.message : 'Unknown error';
                if (errorMessage.includes('Receiving end does not exist') || errorMessage.includes('Could not establish connection')) {
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id, allFrames: true },
                            func: injectFillFunction,
                            args: [profileData, resumeData]
                        });
                        showStatus('Form fill attempted! Check the page.', 'success');
                    }
                    catch (injectError) {
                        const injectErrorMessage = injectError instanceof Error ? injectError.message : 'Unknown error';
                        showStatus('Error: ' + injectErrorMessage, 'error');
                        console.error('Injection error:', injectError);
                    }
                }
                else {
                    throw messageError;
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            showStatus('Error: ' + errorMessage, 'error');
            console.error('Fill error:', error);
        }
    });
});

})();

})();

})();

})();

})();

})();

})();
