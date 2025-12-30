"use strict";
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
    const fieldMappings = {
        firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name'],
        lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname'],
        email: ['email', 'e-mail', 'email-address', 'email_address', 'mail'],
        phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell'],
        github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
        linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
        portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url'],
        location: ['location', 'city', 'address', 'residence', 'country'],
        resume: ['resume', 'cv', 'resume-url', 'resume_url', 'cv-url', 'cv_url']
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
    function findFieldByKeywords(keywords, value) {
        const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
        for (const input of allInputs) {
            const htmlInput = input;
            if (htmlInput.type === 'hidden' || htmlInput.type === 'submit' || htmlInput.type === 'button')
                continue;
            if (htmlInput.value && htmlInput.value.trim() !== '')
                continue;
            const id = (htmlInput.id || '').toLowerCase().replace(/\s+/g, ' ');
            const name = (htmlInput.name || '').toLowerCase().replace(/\s+/g, ' ');
            const placeholder = (htmlInput.placeholder || '').toLowerCase().replace(/\s+/g, ' ');
            const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase().replace(/\s+/g, ' ');
            const labelText = getLabelText(htmlInput).toLowerCase().replace(/\s+/g, ' ');
            const searchText = `${id} ${name} ${placeholder} ${ariaLabel} ${labelText}`.replace(/\s+/g, ' ');
            for (const keyword of keywords) {
                if (searchText.includes(keyword)) {
                    try {
                        htmlInput.focus();
                        htmlInput.value = value;
                        const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
                        events.forEach(eventType => {
                            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
                        });
                        htmlInput.blur();
                        return true;
                    }
                    catch (e) {
                        console.error('Error filling field:', e);
                    }
                }
            }
        }
        return false;
    }
    function findFieldByLabelText(labelKeywords, value) {
        const labels = Array.from(document.querySelectorAll('label'));
        for (const label of labels) {
            const labelText = (label.textContent || '').toLowerCase().replace(/\s+/g, ' ');
            for (const keyword of labelKeywords) {
                if (labelText.includes(keyword) && !labelText.includes('country')) {
                    const input = document.getElementById(label.getAttribute('for') || '');
                    if (input && (!input.value || input.value.trim() === '')) {
                        try {
                            input.focus();
                            input.value = value;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.blur();
                            return true;
                        }
                        catch (e) {
                            console.error('Error filling field by label:', e);
                        }
                    }
                    const parentInput = label.parentElement?.querySelector('input, textarea');
                    if (parentInput && (!parentInput.value || parentInput.value.trim() === '')) {
                        try {
                            parentInput.focus();
                            parentInput.value = value;
                            parentInput.dispatchEvent(new Event('input', { bubbles: true }));
                            parentInput.dispatchEvent(new Event('change', { bubbles: true }));
                            parentInput.blur();
                            return true;
                        }
                        catch (e) {
                            console.error('Error filling field by parent label:', e);
                        }
                    }
                }
            }
        }
        return false;
    }
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
        if (value && (findFieldByKeywords(processor.keywords, value) || findFieldByLabelText(processor.labelKeywords, value))) {
            filledCount++;
            results.push(processor.label);
        }
    }
    if (resumeData.resumeFile) {
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        for (const fileInput of fileInputs) {
            const htmlInput = fileInput;
            const id = (htmlInput.id || '').toLowerCase();
            const name = (htmlInput.name || '').toLowerCase();
            const label = getLabelText(htmlInput).toLowerCase();
            const isResumeField = id.includes('resume') || id.includes('cv') ||
                name.includes('resume') || name.includes('cv') ||
                label.includes('resume') || label.includes('cv');
            if (isResumeField) {
                try {
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
                    htmlInput.files = dataTransfer.files;
                    htmlInput.dispatchEvent(new Event('change', { bubbles: true }));
                    htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
                    filledCount++;
                    results.push('Resume File');
                    break;
                }
                catch (error) {
                    console.error('Error uploading resume file:', error);
                }
            }
        }
    }
    if (filledCount > 0) {
        const notification = document.createElement('div');
        notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:15px 20px;border-radius:5px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;';
        notification.textContent = `✓ Filled ${filledCount} field${filledCount > 1 ? 's' : ''}: ${results.join(', ')}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}
document.addEventListener('DOMContentLoaded', async () => {
    const form = getElementById('profileForm');
    const fillBtn = getElementById('fillBtn');
    const resumeInput = getElementById('resume');
    const resumeInfo = getElementById('resumeInfo');
    const parseResumeBtn = getElementById('parseResumeBtn');
    resumeInput.addEventListener('click', resizePopup);
    resumeInput.addEventListener('focus', resizePopup);
    const profileData = await loadProfileData();
    const resumeData = await loadResumeData();
    populateFormFields(profileData);
    if (resumeData.resumeFile && resumeData.resumeFileName) {
        resumeInfo.textContent = `Saved file: ${resumeData.resumeFileName}`;
        parseResumeBtn.style.display = 'inline-block';
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
        parseResumeBtn.style.display = 'inline-block';
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
                showStatus('Resume file saved successfully! Click "Extract Info" to auto-fill profile.', 'success');
                console.log('Resume saved:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);
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
            location: getElementById('location').value
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
