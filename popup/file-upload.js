import { getLabelText } from './field-matcher';

export function uploadResumeFile(resumeData) {
    if (!resumeData.resumeFile)
        return false;
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    if (fileInputs.length === 0) {
        console.log('[AutoFill] No file inputs found on page');
        return false;
    }
    const resumeKeywords = ['resume', 'cv', 'curriculum', 'vitae', 'życiorys', 'zyciorys'];
    const documentKeywords = ['document', 'attachment', 'file', 'upload', 'attach', 'dokument', 'załącznik', 'plik', 'prześlij', 'załaduj', 'wgraj'];
    let bestMatch = null;
    let bestMatchScore = 0;
    let firstEmptyInput = null;
    for (const fileInput of fileInputs) {
        const htmlInput = fileInput;
        const id = (htmlInput.id || '').toLowerCase();
        const name = (htmlInput.name || '').toLowerCase();
        const label = getLabelText(htmlInput).toLowerCase();
        const accept = (htmlInput.accept || '').toLowerCase();
        const ariaLabel = (htmlInput.getAttribute('aria-label') || '').toLowerCase();
        const placeholder = (htmlInput.getAttribute('placeholder') || '').toLowerCase();
        const searchText = `${id} ${name} ${label} ${ariaLabel} ${placeholder} ${accept}`;
        if (htmlInput.files && htmlInput.files.length === 0) {
            if (!firstEmptyInput) {
                firstEmptyInput = htmlInput;
            }
        }
        let score = 0;
        for (const keyword of resumeKeywords) {
            if (searchText.includes(keyword)) {
                score += 10;
            }
        }
        for (const keyword of documentKeywords) {
            if (searchText.includes(keyword)) {
                score += 3;
            }
        }
        if (accept.includes('pdf') || accept.includes('document') || accept === '') {
            score += 2;
        }
        if (htmlInput.files && htmlInput.files.length === 0) {
            score += 1;
        }
        if (score > bestMatchScore) {
            bestMatchScore = score;
            bestMatch = htmlInput;
        }
    }
    const targetInput = bestMatch || firstEmptyInput;
    if (!targetInput) {
        console.log('[AutoFill] No suitable file input found (all inputs may already have files)');
        return false;
    }
    try {
        console.log(`[AutoFill] Attempting to upload resume to file input: id="${targetInput.id}", name="${targetInput.name}"`);
        const base64 = resumeData.resumeFile.includes(',') ? resumeData.resumeFile.split(',')[1] : resumeData.resumeFile;
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: resumeData.resumeFileType || 'application/pdf' });
        const file = new File([blob], resumeData.resumeFileName || 'resume.pdf', { type: resumeData.resumeFileType || 'application/pdf' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        targetInput.files = dataTransfer.files;
        targetInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        targetInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        targetInput.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
        targetInput.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
        setTimeout(() => {
            targetInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        }, 100);
        console.log(`[AutoFill] ✓ Successfully uploaded resume file: ${resumeData.resumeFileName || 'resume.pdf'} to input with id="${targetInput.id || 'none'}", name="${targetInput.name || 'none'}"`);
        return true;
    }
    catch (error) {
        console.error('[AutoFill] Error uploading resume file:', error);
        return false;
    }
}

