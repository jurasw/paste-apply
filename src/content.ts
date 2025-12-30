
const fieldMappings: Record<string, string[]> = {
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

function getLabelText(input: HTMLElement): string {
  const htmlInput = input as HTMLInputElement;
  if (htmlInput.labels && htmlInput.labels.length > 0) {
    return htmlInput.labels[0].textContent || '';
  }
  
  const id = htmlInput.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent || '';
  }
  
  let parent = htmlInput.parentElement;
  let depth = 0;
  while (parent && depth < 5) {
    const label = parent.querySelector('label');
    if (label) {
      const text = label.textContent || '';
      if (text.trim()) return text;
    }
    
    const prevSibling = parent.previousElementSibling;
    if (prevSibling) {
      const label = prevSibling.querySelector('label');
      if (label) {
        const text = label.textContent || '';
        if (text.trim()) return text;
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

function findFieldByKeywords(keywords: string[], value: string): boolean {
  const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
  
  for (const input of allInputs) {
    const htmlInput = input as HTMLInputElement | HTMLSelectElement;
    if (htmlInput.tagName === 'INPUT') {
      const inputEl = htmlInput as HTMLInputElement;
      if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button' || inputEl.type === 'file') continue;
    }
    
    const currentValue = htmlInput.tagName === 'SELECT' 
      ? (htmlInput as HTMLSelectElement).value 
      : (htmlInput as HTMLInputElement).value;
    if (currentValue && currentValue.trim() !== '') continue;
    
    const id = (htmlInput.id || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
    const name = (htmlInput.name || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
    const placeholder = (htmlInput.tagName === 'INPUT' ? (htmlInput as HTMLInputElement).placeholder : '') || '';
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
    
    const searchText = `${id} ${name} ${placeholderClean} ${ariaLabel} ${className} ${dataAttr} ${labelText}`.replace(/\s+/g, ' ').trim();
    
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        try {
          htmlInput.focus();
          
          if (htmlInput.tagName === 'SELECT') {
            const selectEl = htmlInput as HTMLSelectElement;
            const option = Array.from(selectEl.options).find(opt => 
              opt.value.toLowerCase().includes(value.toLowerCase()) || 
              opt.text.toLowerCase().includes(value.toLowerCase())
            );
            if (option) {
              selectEl.value = option.value;
            } else {
              selectEl.value = value;
            }
          } else {
            (htmlInput as HTMLInputElement).value = value;
          }
          
          const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
          events.forEach(eventType => {
            htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
          });
          
          if (htmlInput.tagName === 'INPUT' && (htmlInput as HTMLInputElement).type === 'email') {
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          
          htmlInput.blur();
          console.log(`Filled field: ${id || name || 'unknown'} with value: ${value}`);
          return true;
        } catch (e) {
          console.error('Error filling field:', e);
        }
      }
    }
  }
  
  return false;
}

function findFieldByLabelText(labelKeywords: string[], value: string): boolean {
  const labels = Array.from(document.querySelectorAll('label'));
  
  for (const label of labels) {
    let labelText = (label.textContent || '').toLowerCase();
    labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
    
    for (const keyword of labelKeywords) {
      if (labelText.includes(keyword)) {
        const forAttr = label.getAttribute('for');
        let input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null;
        
        if (forAttr) {
          input = document.getElementById(forAttr) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        }
        
        if (!input) {
          input = label.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
        }
        
        if (!input) {
          const nextSibling = label.nextElementSibling;
          if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
            input = nextSibling as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          }
        }
        
        if (input) {
          const currentValue = input.tagName === 'SELECT' 
            ? (input as HTMLSelectElement).value 
            : (input as HTMLInputElement | HTMLTextAreaElement).value;
          
          if (!currentValue || currentValue.trim() === '') {
            try {
              input.focus();
              
              if (input.tagName === 'SELECT') {
                const selectEl = input as HTMLSelectElement;
                const option = Array.from(selectEl.options).find(opt => 
                  opt.value.toLowerCase().includes(value.toLowerCase()) || 
                  opt.text.toLowerCase().includes(value.toLowerCase())
                );
                if (option) {
                  selectEl.value = option.value;
                } else {
                  selectEl.value = value;
                }
              } else {
                (input as HTMLInputElement | HTMLTextAreaElement).value = value;
              }
              
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.dispatchEvent(new Event('blur', { bubbles: true }));
              input.blur();
              console.log(`Filled field by label "${labelText}" with value: ${value}`);
              return true;
            } catch (e) {
              console.error('Error filling field by label:', e);
            }
          }
        }
      }
    }
  }
  
  return false;
}

function uploadResumeFile(base64Data: string, fileName: string, fileType: string): boolean {
  const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
  
  for (const fileInput of fileInputs) {
    const htmlInput = fileInput as HTMLInputElement;
    const id = (htmlInput.id || '').toLowerCase();
    const name = (htmlInput.name || '').toLowerCase();
    const label = getLabelText(htmlInput).toLowerCase();
    const accept = (htmlInput.accept || '').toLowerCase();
    
    const isResumeField = 
      id.includes('resume') || id.includes('cv') ||
      name.includes('resume') || name.includes('cv') ||
      label.includes('resume') || label.includes('cv') ||
      (accept.includes('pdf') && (label.includes('attach') || label.includes('upload')));
    
    if (isResumeField) {
      try {
        const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: fileType || 'application/pdf' });
        const file = new File([blob], fileName || 'resume.pdf', { type: fileType || 'application/pdf' });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        htmlInput.files = dataTransfer.files;
        
        htmlInput.dispatchEvent(new Event('change', { bubbles: true }));
        htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log(`Uploaded resume file: ${fileName}`);
        return true;
      } catch (error) {
        console.error('Error uploading resume file:', error);
      }
    }
  }
  
  return false;
}

function fillForm(): void {
  chrome.storage.sync.get([
    'firstName', 'lastName', 'email', 'phone',
    'github', 'linkedin', 'portfolio', 'location', 'resume'
  ], (data: ProfileData) => {
    const profileData = data;
    let filledCount = 0;
    const results: string[] = [];
    
    const fieldProcessors: Array<{ key: keyof ProfileData; label: string; keywords: string[]; labelKeywords: string[] }> = [
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
      if (value) {
        const filled = findFieldByKeywords(processor.keywords, value) || findFieldByLabelText(processor.labelKeywords, value);
        if (filled) {
          filledCount++;
          results.push(processor.label);
        } else {
          console.log(`Could not find field for ${processor.label} with keywords: ${processor.keywords.join(', ')}`);
        }
      }
    }
    
    chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType'], (resumeData: ResumeData) => {
      const resume = resumeData;
      if (resume.resumeFile) {
        if (uploadResumeFile(resume.resumeFile, resume.resumeFileName || 'resume.pdf', resume.resumeFileType || 'application/pdf')) {
          filledCount++;
          results.push('Resume File');
        }
      }
      
      console.log(`Auto-filled ${filledCount} fields: ${results.join(', ')}`);
      
      if (filledCount > 0) {
        const notification = document.createElement('div');
        notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:15px 20px;border-radius:5px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;';
        notification.textContent = `✓ Filled ${filledCount} field${filledCount > 1 ? 's' : ''}: ${results.join(', ')}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      }
    });
  });
}

function createFillButton(): void {
  if (document.getElementById('job-app-autofill-btn')) return;
  
  const button = document.createElement('button');
  button.id = 'job-app-autofill-btn';
  
  const icon = document.createElement('span');
  icon.style.cssText = `
    display: inline-block;
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #42a5f5 0%, #1976d2 100%);
    border-radius: 50%;
    margin-right: 10px;
    position: relative;
    vertical-align: middle;
    box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
  `;
  
  const iconHighlight = document.createElement('span');
  iconHighlight.style.cssText = `
    position: absolute;
    top: 3px;
    left: 3px;
    width: 6px;
    height: 6px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 50%;
    pointer-events: none;
  `;
  icon.appendChild(iconHighlight);
  
  const text = document.createElement('span');
  text.textContent = 'Auto-Fill Form';
  text.className = 'autofill-btn-text';
  
  button.appendChild(icon);
  button.appendChild(text);
  
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let currentPosition = { top: 80, right: 20 };
  
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
      padding: 12px 20px;
      border-radius: 10px;
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
  
  const startDrag = (e: MouseEvent | TouchEvent) => {
    isDragging = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const rect = button.getBoundingClientRect();
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;
    
    button.style.cursor = 'grabbing';
    button.style.transition = 'none';
    e.preventDefault();
  };
  
  const drag = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
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
    if (!isDragging) return;
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
    if (isDragging) {
      e.preventDefault();
      return;
    }
    fillForm();
    icon.style.display = 'none';
    text.textContent = '✓ Filled!';
    button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
    button.style.boxShadow = '0 4px 14px rgba(76, 175, 80, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
    setTimeout(() => {
      icon.style.display = 'inline-block';
      text.textContent = 'Auto-Fill Form';
      button.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
      button.style.boxShadow = '0 4px 14px rgba(33, 150, 243, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)';
    }, 2000);
  };
  
  document.body.appendChild(button);
}

function initButton(): void {
  if (window.self !== window.top) return;
  if (document.getElementById('job-app-autofill-btn')) return;
  if (document.body) {
    createFillButton();
  }
}

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

