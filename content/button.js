import { fillForm } from './form-filler';
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

let buttonCreationInProgress = false;

export function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    if (buttonCreationInProgress)
        return;
    
    buttonCreationInProgress = true;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            buttonCreationInProgress = false;
            return;
        }
        
        if (!isJobApplicationForm()) {
            buttonCreationInProgress = false;
            return;
        }
        
        if (document.getElementById('job-app-autofill-btn')) {
            buttonCreationInProgress = false;
            return;
        }
        
        createButtonElement();
        buttonCreationInProgress = false;
    });
}

function createButtonElement() {
    if (document.getElementById('job-app-autofill-btn')) {
        return;
    }
    
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'Paste Apply';
    text.className = 'autofill-btn-text';
    text.style.cssText = `
      text-transform: none;
      font-size: 18px;
      font-weight: 600;
    `;
    const editIcon = document.createElement('span');
    editIcon.innerHTML = '✎';
    editIcon.style.cssText = `
    margin-left: 10px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
    user-select: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  `;
    editIcon.title = 'Edit Profile';
    editIcon.onmouseover = () => {
        editIcon.style.opacity = '1';
        editIcon.style.transform = 'scale(1.1)';
    };
    editIcon.onmouseout = () => {
        editIcon.style.opacity = '0.8';
        editIcon.style.transform = 'scale(1)';
    };
    editIcon.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
    };
    button.appendChild(text);
    button.appendChild(editIcon);
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { top: 80, right: 20 };
    let startPosition = { x: 0, y: 0 };
    chrome.storage.local.get(['buttonPosition'], (result) => {
        const savedPosition = result.buttonPosition;
        const top = savedPosition?.top || '80px';
        const right = savedPosition?.right || '20px';
        const left = savedPosition?.left || 'auto';
        const bottom = savedPosition?.bottom || 'auto';
        button.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      left: ${left};
      bottom: ${bottom};
      background: #3566E6;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 20px;
      cursor: move;
      font-size: 16px;
      font-weight: 600;
      text-transform: none;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(53, 102, 230, 0.25);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
        button.style.setProperty('background', '#3566E6', 'important');
        if (savedPosition && savedPosition.left && savedPosition.left !== 'auto') {
            setTimeout(() => {
                const rect = button.getBoundingClientRect();
                currentPosition = { top: rect.top, right: window.innerWidth - rect.right };
            }, 0);
        }
    });
    const startDrag = (e) => {
        const target = e.target;
        if (target === editIcon || editIcon.contains(target)) {
            return;
        }
        isDragging = true;
        hasMoved = false;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startPosition.x = clientX;
        startPosition.y = clientY;
        const rect = button.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        button.style.cursor = 'grabbing';
        button.style.transition = 'none';
        e.preventDefault();
    };
    const drag = (e) => {
        if (!isDragging)
            return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - startPosition.x);
        const deltaY = Math.abs(clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
        }
        const x = clientX - dragOffset.x;
        const y = clientY - dragOffset.y;
        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        button.style.left = `${clampedX}px`;
        button.style.top = `${clampedY}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        currentPosition = { top: clampedY, right: window.innerWidth - clampedX - button.offsetWidth };
        e.preventDefault();
    };
    const endDrag = () => {
        if (!isDragging)
            return;
        isDragging = false;
        button.style.cursor = 'move';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        const rect = button.getBoundingClientRect();
        chrome.storage.local.set({
            buttonPosition: {
                top: `${rect.top}px`,
                right: `${window.innerWidth - rect.right}px`,
                left: `${rect.left}px`,
                bottom: 'auto'
            }
        });
    };
    button.addEventListener('mousedown', startDrag);
    button.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    button.onmouseover = () => {
        if (!isDragging) {
            button.style.setProperty('background', '#3566E6', 'important');
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(53, 102, 230, 0.35)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.setProperty('background', '#3566E6', 'important');
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(53, 102, 230, 0.25)';
        }
    };
    button.onclick = (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            hasMoved = false;
            return;
        }
        fillForm();
        text.textContent = '✓ Filled!';
        button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        button.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)';
        setTimeout(() => {
            text.textContent = 'Paste Apply';
            button.style.setProperty('background', '#3566E6', 'important');
            button.style.boxShadow = '0 4px 12px rgba(53, 102, 230, 0.25)';
        }, 2000);
    };
    if (!document.getElementById('job-app-autofill-btn')) {
        document.body.appendChild(button);
    }
}
export function initButton() {
    if (window.self !== window.top)
        return;
    
    if (isExcludedDomain(window.location.hostname)) {
        const existingButton = document.getElementById('job-app-autofill-btn');
        if (existingButton) {
            existingButton.remove();
        }
        return;
    }
    
    if (document.getElementById('job-app-autofill-btn'))
        return;
    if (document.body) {
        chrome.storage.sync.get(['showAutoFillButton'], (result) => {
            const showButton = result.showAutoFillButton !== false;
            if (showButton && isJobApplicationForm()) {
                createFillButton();
            }
        });
    }
}
