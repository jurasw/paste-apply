import { getLabelText, isCustomDropdown, fillCustomDropdown } from './content-field-matcher';

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

export function findFieldByKeywords(keywords: string[], value: string): boolean {
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

export function findFieldByLabelText(labelKeywords: string[], value: string): boolean {
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

export function findFieldByTextSearch(labelKeywords: string[], value: string): boolean {
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

