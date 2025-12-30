import { fillForm } from './form-filler';
import { createFillButton, initButton } from './button';
import { isExcludedDomain } from './utils';

function isEmailInboxPage() {
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname === "mail.google.com" || hostname.endsWith(".mail.google.com")) {
    return true;
  }
  
  if (hostname === "gmail.com" || hostname.endsWith(".gmail.com")) {
    return true;
  }
  
  if (hostname === "outlook.live.com" || hostname.endsWith(".outlook.live.com")) {
    return true;
  }
  
  if (hostname === "mail.live.com" || hostname.endsWith(".mail.live.com")) {
    return true;
  }
  
  if (hostname === "outlook.com" || hostname.endsWith(".outlook.com")) {
    return true;
  }
  
  if (hostname === "hotmail.com" || hostname.endsWith(".hotmail.com")) {
    return true;
  }
  
  return false;
}

function isJobApplicationForm() {
    if (isExcludedDomain(window.location.hostname)) {
        return false;
    }
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasKeyword = allText.includes('resume') || 
                      allText.includes('cv') || 
                      allText.includes('name') || 
                      allText.includes('imie') ||
                      allText.includes('imię');
    
    if (!hasKeyword) {
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
    
    return inputCount >= 4;
}

function removeButtonIfOnEmailInbox() {
    if (isEmailInboxPage()) {
        const button = document.getElementById('job-app-autofill-btn');
        if (button) {
            button.remove();
        }
    }
}

export function initialize() {
    if (document.body) {
        initButton();
        removeButtonIfOnEmailInbox();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            initButton();
            removeButtonIfOnEmailInbox();
        });
    }
    
    window.addEventListener('hashchange', removeButtonIfOnEmailInbox);
    window.addEventListener('popstate', removeButtonIfOnEmailInbox);
    
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
            
            if (isEmailInboxPage()) {
                if (button) {
                    button.remove();
                }
                return;
            }
            
            if (!button && document.body) {
                if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
                    return;
                }
                try {
                    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                        const showButton = result.showAutoFillButton !== false;
                        if (showButton && isJobApplicationForm() && !document.getElementById('job-app-autofill-btn')) {
                            createFillButton();
                        }
                    });
                } catch (e) {
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
    
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'updateButtonVisibility') {
                const existingButton = document.getElementById('job-app-autofill-btn');
                if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
                    sendResponse({ success: true });
                    return true;
                }
                try {
                    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
                        if (chrome.runtime.lastError) {
                            sendResponse({ success: true });
                            return;
                        }
                        const showButton = result.showAutoFillButton !== false;
                        if (showButton && isJobApplicationForm() && !isEmailInboxPage()) {
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
}

