import { fillForm } from './form-filler';
import { createFillButton, initButton } from './button';
import { isExcludedDomain } from './utils';

function isJobApplicationForm() {
    if (isExcludedDomain(window.location.hostname)) {
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

export function initialize() {
    if (document.body) {
        initButton();
    } else {
        document.addEventListener('DOMContentLoaded', initButton);
    }
    
    if (document.body) {
        const observer = new MutationObserver((mutations) => {
            if (window.self !== window.top)
                return;
            
            const button = document.getElementById('job-app-autofill-btn');
            const isOnlyButtonMutation = mutations.every(mutation => {
                if (mutation.type === 'attributes') {
                    return mutation.target === button || button?.contains(mutation.target);
                }
                if (mutation.type === 'childList') {
                    return Array.from(mutation.addedNodes).every(node => 
                        node === button || (node.nodeType === 1 && button?.contains(node))
                    ) && Array.from(mutation.removedNodes).every(node => 
                        node === button || (node.nodeType === 1 && button?.contains(node))
                    );
                }
                return false;
            });
            
            if (isOnlyButtonMutation && button) {
                return;
            }
            
            if (isExcludedDomain(window.location.hostname)) {
                if (button) {
                    button.remove();
                }
                return;
            }
            
            if (!button && document.body) {
                try {
                    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
                        if (chrome.runtime.lastError) {
                            console.warn('[AutoFill] Storage error:', chrome.runtime.lastError.message);
                            return;
                        }
                        const showButton = result.showAutoFillButton !== false;
                        if (showButton && isJobApplicationForm() && !document.getElementById('job-app-autofill-btn')) {
                            createFillButton();
                        }
                    });
                } catch (e) {
                    console.warn('[AutoFill] Extension context invalidated:', e.message);
                }
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
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
            try {
                chrome.storage.sync.get(['showAutoFillButton'], (result) => {
                    if (chrome.runtime.lastError) {
                        console.warn('[AutoFill] Storage error:', chrome.runtime.lastError.message);
                        sendResponse({ success: true });
                        return;
                    }
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
                    sendResponse({ success: true });
                });
            } catch (e) {
                console.warn('[AutoFill] Extension context invalidated:', e.message);
                sendResponse({ success: true });
            }
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
}

