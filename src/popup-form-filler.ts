export function injectFillFunction(profileData: ProfileData, resumeData: ResumeData): void {
  const fieldMappings: Record<string, string[]> = {
    firstName: ['firstname', 'first-name', 'first_name', 'fname', 'given-name', 'given_name', 'name'],
    lastName: ['lastname', 'last-name', 'last_name', 'lname', 'family-name', 'family_name', 'surname'],
    email: ['email', 'e-mail', 'email-address', 'email_address', 'mail'],
    phone: ['phone', 'phone-number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell'],
    github: ['github', 'github-url', 'github_url', 'github-link', 'github_link', 'github-profile'],
    linkedin: ['linkedin', 'linkedin-url', 'linkedin_url', 'linkedin-link', 'linkedin_link', 'linkedin-profile'],
    portfolio: ['portfolio', 'portfolio-url', 'portfolio_url', 'website', 'personal-website', 'personal_website', 'url'],
    location: ['location', 'city', 'address', 'residence', 'country', 'location country', 'location city'],
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
  
  function isCustomDropdown(input: HTMLInputElement): boolean {
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
  
  function findDropdownOption(input: HTMLInputElement, searchValue: string): HTMLElement | null {
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
            return option as HTMLElement;
          }
          
          for (const part of valueParts) {
            if (part.length > 2 && (optionText.includes(part) || optionValueLower.includes(part))) {
              return option as HTMLElement;
            }
          }
        }
      }
      
      container = container.parentElement;
    }
    
    return null;
  }
  
  async function fillCustomDropdown(input: HTMLInputElement, value: string): Promise<boolean> {
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
      } else {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
        console.log(`[AutoFill] Could not find dropdown option, set value directly: ${value.substring(0, 30)}`);
        return true;
      }
    } catch (e) {
      console.error('[AutoFill] Error filling custom dropdown:', e);
      return false;
    }
  }
  
  function fillInputField(htmlInput: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string, fieldId: string): boolean {
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
      } else if (htmlInput.tagName === 'INPUT') {
        const inputEl = htmlInput as HTMLInputElement;
        if (isCustomDropdown(inputEl)) {
          fillCustomDropdown(inputEl, value).then(success => {
            if (success) {
              console.log(`[AutoFill] Filled custom dropdown: ${fieldId} with value: ${value.substring(0, 20)}`);
            }
          });
          return true;
        } else {
          inputEl.value = value;
        }
      } else {
        (htmlInput as HTMLTextAreaElement).value = value;
      }
      
      const events = ['input', 'change', 'blur', 'keyup', 'keydown'];
      events.forEach(eventType => {
        htmlInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
      });
      
      if (htmlInput.tagName === 'INPUT' && (htmlInput as HTMLInputElement).type === 'email') {
        htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      htmlInput.dispatchEvent(new Event('focus', { bubbles: true }));
      htmlInput.dispatchEvent(new Event('blur', { bubbles: true }));
      
      htmlInput.blur();
      console.log(`[AutoFill] Filled field: ${fieldId} with value: ${value.substring(0, 20)}`);
      return true;
    } catch (e) {
      console.error('[AutoFill] Error filling field:', e);
      return false;
    }
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
          const fieldId = id || name || ariaLabel || 'unknown';
          return fillInputField(htmlInput, value, fieldId);
        }
      }
    }
    
    return false;
  }
  
  function findFieldByLabelText(labelKeywords: string[], value: string): boolean {
    const labels = Array.from(document.querySelectorAll('label'));
    const allTextElements = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6'));
    
    for (const label of labels) {
      let labelText = (label.textContent || '').toLowerCase();
      labelText = labelText.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
      
      for (const keyword of labelKeywords) {
        const keywordLower = keyword.toLowerCase();
        if (labelText.includes(keywordLower)) {
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
              return fillInputField(input, value, labelText.substring(0, 30));
            }
          }
        }
      }
    }
    
    for (const textEl of allTextElements) {
      const text = (textEl.textContent || '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
      if (text.length > 50 || text.length < 3) continue;
      
      for (const keyword of labelKeywords) {
        const keywordLower = keyword.toLowerCase();
        if (text.includes(keywordLower) && (text.includes('first name') || text.includes('last name') || text.includes('email') || text.includes('phone') || text.includes('github') || text.includes('linkedin') || text.includes('website') || text.includes('portfolio'))) {
          let input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null;
          
          input = textEl.parentElement?.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
          
          if (!input) {
            const nextSibling = textEl.nextElementSibling;
            if (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT')) {
              input = nextSibling as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            }
          }
          
          if (input) {
            const currentValue = input.tagName === 'SELECT' 
              ? (input as HTMLSelectElement).value 
              : (input as HTMLInputElement | HTMLTextAreaElement).value;
            
            if (!currentValue || currentValue.trim() === '') {
              return fillInputField(input, value, text.substring(0, 30));
            }
          }
        }
      }
    }
    
    return false;
  }
  
  function findFieldByTextSearch(labelKeywords: string[], value: string): boolean {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    
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
              const htmlInput = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
              const currentValue = htmlInput.tagName === 'SELECT' 
                ? (htmlInput as HTMLSelectElement).value 
                : (htmlInput as HTMLInputElement | HTMLTextAreaElement).value;
              
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
  
  function uploadResumeFile(): boolean {
    if (!resumeData.resumeFile) return false;
    
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    for (const fileInput of fileInputs) {
      const htmlInput = fileInput as HTMLInputElement;
      const id = (htmlInput.id || '').toLowerCase();
      const name = (htmlInput.name || '').toLowerCase();
      const label = getLabelText(htmlInput).toLowerCase();
      const isResumeField = 
        id.includes('resume') || id.includes('cv') ||
        name.includes('resume') || name.includes('cv') ||
        label.includes('resume') || label.includes('cv');
      if (isResumeField) {
        try {
          const base64 = resumeData.resumeFile!.includes(',') ? resumeData.resumeFile!.split(',')[1] : resumeData.resumeFile!;
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
          console.log('[AutoFill] ✓ Successfully uploaded resume file');
          return true;
        } catch (error) {
          console.error('[AutoFill] Error uploading resume file:', error);
        }
      }
    }
    return false;
  }
  
  function showNotification(message: string, isSuccess: boolean): void {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${isSuccess ? '#4CAF50' : '#ff9800'};color:white;padding:15px 20px;border-radius:5px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), isSuccess ? 3000 : 5000);
  }
  
  console.log('[AutoFill] Starting form fill in frame:', window.location.href);
  console.log('[AutoFill] Found inputs:', document.querySelectorAll('input, textarea, select').length);
  
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
      console.log(`[AutoFill] Trying to fill ${processor.label}...`);
      const filled = findFieldByKeywords(processor.keywords, value) || 
                     findFieldByLabelText(processor.labelKeywords, value) ||
                     findFieldByTextSearch(processor.labelKeywords, value);
      if (filled) {
        filledCount++;
        results.push(processor.label);
        console.log(`[AutoFill] ✓ Successfully filled ${processor.label}`);
      } else {
        console.log(`[AutoFill] ✗ Could not find field for ${processor.label}`);
      }
    } else {
      console.log(`[AutoFill] No value for ${processor.label}`);
    }
  }
  
  if (uploadResumeFile()) {
    filledCount++;
    results.push('Resume File');
  }
  
  console.log(`[AutoFill] Completed: Filled ${filledCount} field${filledCount > 1 ? 's' : ''}: ${results.join(', ')}`);
  
  if (filledCount > 0) {
    showNotification(`✓ Filled ${filledCount} field${filledCount > 1 ? 's' : ''}: ${results.join(', ')}`, true);
  } else {
    showNotification('⚠ Could not find any form fields to fill. Check console for details.', false);
  }
}

