import { fillForm } from './content-form-filler';
import { createFillButton, initButton } from './content-button';

if (document.body) {
  initButton();
} else {
  document.addEventListener('DOMContentLoaded', initButton);
}

if (document.body) {
  const observer = new MutationObserver(() => {
    if (window.self !== window.top) return;
    if (!document.getElementById('job-app-autofill-btn') && document.body) {
      createFillButton();
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

chrome.runtime.onMessage.addListener((request: { action: string }, sender: ChromeMessageSender, sendResponse: (response: { success: boolean; message?: string; error?: string }) => void) => {
  if (request.action === 'fillForm') {
    try {
      fillForm();
      sendResponse({ success: true, message: 'Form fill initiated' });
    } catch (error) {
      console.error('Error in fillForm:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendResponse({ success: false, error: errorMessage });
    }
    return true;
  }
  return false;
});
