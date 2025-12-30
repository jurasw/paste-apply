export const profileFields: (keyof ProfileData)[] = [
  'firstName', 'lastName', 'email', 'phone',
  'github', 'linkedin', 'portfolio', 'location'
];

export const resizeDimensions = { width: '400px', height: '600px' };
export const maxFileSizeMb = 7;

export function getElementById<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element with id "${id}" not found`);
  return element as T;
}

export function showStatus(message: string, type: 'success' | 'error'): void {
  const status = getElementById<HTMLDivElement>('status');
  status.textContent = message;
  status.className = `status ${type}`;
  setTimeout(() => {
    status.className = 'status';
  }, 5000);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function resizePopup(): void {
  document.body.style.width = resizeDimensions.width;
  document.body.style.height = resizeDimensions.height;
  document.documentElement.style.width = resizeDimensions.width;
  document.documentElement.style.height = resizeDimensions.height;
}

export function getPdfJsLib(): any {
  return (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf'];
}

export async function loadProfileData(): Promise<ProfileData> {
  const data = await chrome.storage.sync.get(profileFields);
  return data as ProfileData;
}

export async function loadResumeData(): Promise<ResumeData> {
  const data = await chrome.storage.local.get(['resumeFile', 'resumeFileName', 'resumeFileType']);
  return data as ResumeData;
}

export function populateFormFields(data: ProfileData): void {
  profileFields.forEach(field => {
    const element = document.getElementById(field) as HTMLInputElement;
    if (element && data[field]) {
      element.value = data[field]!;
    }
  });
}

