import { fillForm } from './content-form-filler';

function isJobApplicationForm() {
    const jobKeywords = [
        'application', 'apply', 'resume', 'cv', 'curriculum', 'vitae',
        'firstname', 'first-name', 'first_name', 'fname', 'given-name',
        'lastname', 'last-name', 'last_name', 'lname', 'surname',
        'email', 'e-mail', 'phone', 'telephone', 'mobile',
        'github', 'linkedin', 'portfolio', 'website',
        'position', 'job', 'career', 'employment', 'hire',
        'cover-letter', 'coverletter', 'motivation',
        'experience', 'education', 'qualification', 'skill'
    ];
    
    const pageText = (document.body?.textContent || '').toLowerCase();
    const pageTitle = (document.title || '').toLowerCase();
    const pageUrl = (window.location.href || '').toLowerCase();
    
    const allText = `${pageText} ${pageTitle} ${pageUrl}`;
    
    const hasJobKeyword = jobKeywords.some(keyword => 
        allText.includes(keyword)
    );
    
    if (hasJobKeyword) {
        return true;
    }
    
    const formInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let relevantFieldCount = 0;
    
    for (const input of formInputs) {
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') {
            continue;
        }
        
        const id = (input.id || '').toLowerCase();
        const name = (input.name || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const label = input.labels?.[0]?.textContent?.toLowerCase() || '';
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
        
        const fieldText = `${id} ${name} ${placeholder} ${label} ${ariaLabel}`;
        
        const hasRelevantField = jobKeywords.some(keyword => 
            fieldText.includes(keyword)
        );
        
        if (hasRelevantField) {
            relevantFieldCount++;
        }
    }
    
    return relevantFieldCount >= 2;
}

export function createFillButton() {
    if (document.getElementById('job-app-autofill-btn'))
        return;
    
    chrome.storage.sync.get(['showAutoFillButton'], (result) => {
        const showButton = result.showAutoFillButton !== false;
        if (!showButton) {
            return;
        }
        
        if (!isJobApplicationForm()) {
            return;
        }
        
        createButtonElement();
    });
}

function createButtonElement() {
    const button = document.createElement('button');
    button.id = 'job-app-autofill-btn';
    const text = document.createElement('span');
    text.textContent = 'Auto-Fill Form';
    text.className = 'autofill-btn-text';
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
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      padding: 12px 20px;
      cursor: move;
      font-size: 14px;
      font-weight: 600;
      z-index: 99999;
      box-shadow: 0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      touch-action: none;
    `;
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
            button.style.background = 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    };
    button.onmouseout = () => {
        if (!isDragging) {
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
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
        button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        button.style.boxShadow = '0 4px 14px rgba(76, 175, 80, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        setTimeout(() => {
            text.textContent = 'Auto-Fill Form';
            button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
            button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }, 2000);
    };
    document.body.appendChild(button);
}
export function initButton() {
    if (window.self !== window.top)
        return;
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
