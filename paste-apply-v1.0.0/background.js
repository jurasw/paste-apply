"use strict";
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openPopup') {
        chrome.windows.create({
            url: chrome.runtime.getURL('popup.html'),
            type: 'popup',
            width: 450,
            height: 650
        });
        sendResponse({ success: true });
    }
    return true;
});

chrome.commands.onCommand.addListener((command) => {
    console.log('Command received:', command);
    if (command === 'fill-form') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                const tab = tabs[0];
                const url = tab.url || '';
                console.log('Active tab:', tab.url);
                if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
                    console.log('Skipping chrome/internal page');
                    return;
                }
                chrome.tabs.sendMessage(tab.id, { action: 'fillForm' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending fillForm message:', chrome.runtime.lastError.message);
                    } else {
                        console.log('Message sent successfully, response:', response);
                    }
                });
            }
        });
    }
});
