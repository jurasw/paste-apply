import { getElementById, showStatus, getPdfJsLib, populateFormFields, loadResumeData } from './popup-utils';

type ExtractedData = ProfileData;

export function parseResumeText(text: string): ExtractedData {
  const result: ExtractedData = {};
  
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,9}/g;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    result.phone = phoneMatch[0].trim();
  }

  const githubRegex = /(?:github\.com\/|@)([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})/gi;
  const githubMatch = text.match(githubRegex);
  if (githubMatch) {
    const githubUrl = githubMatch[0].startsWith('http') ? githubMatch[0] : 
                     githubMatch[0].startsWith('github.com') ? 'https://' + githubMatch[0] :
                     'https://github.com/' + githubMatch[0].replace('@', '');
    result.github = githubUrl;
  }

  const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9-]+)/gi;
  const linkedinMatch = text.match(linkedinRegex);
  if (linkedinMatch) {
    const linkedinUrl = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : 
                        'https://www.' + linkedinMatch[0];
    result.linkedin = linkedinUrl;
  }

  const portfolioRegex = /(?:portfolio|website|personal\s+site)[\s:]*([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/gi;
  const portfolioMatch = text.match(portfolioRegex);
  if (portfolioMatch) {
    const url = portfolioMatch[0].match(/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
    if (url) {
      result.portfolio = url[0].startsWith('http') ? url[0] : 'https://' + url[0];
    }
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const firstFewLines = lines.slice(0, 10).join(' ');

  const namePattern = /^([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/;
  const nameMatch = firstFewLines.match(namePattern);
  if (nameMatch) {
    const fullName = nameMatch[0].trim().split(/\s+/);
    if (fullName.length >= 2) {
      result.firstName = fullName[0];
      result.lastName = fullName.slice(1).join(' ');
    }
  }

  const locationPatterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[A-Z]{2}\s+\d{5}/
  ];
  
  for (const pattern of locationPatterns) {
    const locationMatch = text.match(pattern);
    if (locationMatch) {
      result.location = locationMatch[0];
      break;
    }
  }

  return result;
}

export async function parseResume(): Promise<void> {
  const parseResumeBtn = getElementById<HTMLButtonElement>('parseResumeBtn');
  const resumeData = await loadResumeData();
  
  if (!resumeData.resumeFile) {
    showStatus('Please select a resume file first', 'error');
    return;
  }

  try {
    showStatus('Extracting information from resume...', 'success');
    parseResumeBtn.disabled = true;
    parseResumeBtn.textContent = 'Extracting...';

    const base64Data = resumeData.resumeFile.split(',')[1] || resumeData.resumeFile;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const pdfjsLib = getPdfJsLib();
    if (!pdfjsLib) {
      throw new Error('PDF.js library not loaded. Please refresh the extension popup.');
    }

    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + ' ';
    }

    const extractedData = parseResumeText(fullText);
    populateFormFields(extractedData);

    const foundFields = Object.entries(extractedData)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(', ');

    showStatus(`Extracted: ${foundFields || 'No information found'}`, 'success');
    parseResumeBtn.disabled = false;
    parseResumeBtn.textContent = 'Extract Info from Resume';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    showStatus('Error parsing resume: ' + errorMessage, 'error');
    parseResumeBtn.disabled = false;
    parseResumeBtn.textContent = 'Extract Info from Resume';
    console.error('PDF parsing error:', error);
  }
}

