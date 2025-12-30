import { 
  getElementById, 
  showStatus, 
  fileToBase64, 
  resizePopup, 
  loadProfileData, 
  loadResumeData, 
  populateFormFields,
  maxFileSizeMb
} from './popup-utils';
import { parseResume } from './popup-resume-parser';
import { injectFillFunction } from './popup-form-filler';

document.addEventListener('DOMContentLoaded', async () => {
  const form = getElementById<HTMLFormElement>('profileForm');
  const fillBtn = getElementById<HTMLButtonElement>('fillBtn');
  const resumeInput = getElementById<HTMLInputElement>('resume');
  const resumeInfo = getElementById<HTMLDivElement>('resumeInfo');
  const parseResumeBtn = getElementById<HTMLButtonElement>('parseResumeBtn');
  
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
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

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
      
      const dataToSave: ResumeData = {
        resumeFile: base64,
        resumeFileName: file.name,
        resumeFileType: file.type
      };
      
      await chrome.storage.local.set(dataToSave);
      
      const verify = await chrome.storage.local.get(['resumeFile', 'resumeFileName']) as ResumeData;
      if (verify.resumeFile && verify.resumeFileName === file.name) {
        showStatus('Resume file saved successfully! Click "Extract Info" to auto-fill profile.', 'success');
        console.log('Resume saved:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);
      } else {
        throw new Error('Failed to verify save');
      }
    } catch (error) {
      console.error('Error saving resume:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('QUOTA_BYTES')) {
        showStatus('Error: File too large for storage. Please use a smaller file.', 'error');
      } else {
        showStatus('Error saving resume: ' + errorMessage, 'error');
      }
      resumeInfo.textContent = '';
      parseResumeBtn.style.display = 'none';
    }
  });

  parseResumeBtn.addEventListener('click', parseResume);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data: ProfileData = {
      firstName: getElementById<HTMLInputElement>('firstName').value,
      lastName: getElementById<HTMLInputElement>('lastName').value,
      email: getElementById<HTMLInputElement>('email').value,
      phone: getElementById<HTMLInputElement>('phone').value,
      github: getElementById<HTMLInputElement>('github').value,
      linkedin: getElementById<HTMLInputElement>('linkedin').value,
      portfolio: getElementById<HTMLInputElement>('portfolio').value,
      location: getElementById<HTMLInputElement>('location').value
    };

    try {
      await chrome.storage.sync.set(data);
      showStatus('Profile saved successfully!', 'success');
    } catch (error) {
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
        await chrome.tabs.sendMessage(tab.id!, { action: 'fillForm' });
        showStatus('Form fill attempted! Check the page.', 'success');
      } catch (messageError) {
        const errorMessage = messageError instanceof Error ? messageError.message : 'Unknown error';
        if (errorMessage.includes('Receiving end does not exist') || errorMessage.includes('Could not establish connection')) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id!, allFrames: true },
              func: injectFillFunction,
              args: [profileData, resumeData]
            });
            showStatus('Form fill attempted! Check the page.', 'success');
          } catch (injectError) {
            const injectErrorMessage = injectError instanceof Error ? injectError.message : 'Unknown error';
            showStatus('Error: ' + injectErrorMessage, 'error');
            console.error('Injection error:', injectError);
          }
        } else {
          throw messageError;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showStatus('Error: ' + errorMessage, 'error');
      console.error('Fill error:', error);
    }
  });
});
