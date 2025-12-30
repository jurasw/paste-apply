type ProfileData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
  location?: string;
};

type ResumeData = {
  resumeFile?: string;
  resumeFileName?: string;
  resumeFileType?: string;
};

type ChromeStorageArea = {
  get(keys: string[] | null | { [key: string]: any } | string, callback?: (items: { [key: string]: any }) => void): Promise<{ [key: string]: any }> | void;
  set(items: { [key: string]: any }, callback?: () => void): Promise<void> | void;
};

type ChromeMessageSender = {
  tab?: { id?: number };
  frameId?: number;
  id?: string;
  url?: string;
  tlsChannelId?: string;
};

type ChromeRuntime = {
  onMessage: {
    addListener(callback: (request: any, sender: ChromeMessageSender, sendResponse: (response: any) => void) => void | boolean): void;
  };
  getURL(path: string): string;
};

declare namespace chrome {
  namespace runtime {
    type MessageSender = ChromeMessageSender;
  }
}

type ChromeTab = {
  id?: number;
  url?: string;
};

type ChromeTabs = {
  query(queryInfo: { active?: boolean; currentWindow?: boolean }, callback?: (result: ChromeTab[]) => void): Promise<ChromeTab[]>;
  sendMessage(tabId: number, message: any, responseCallback?: (response: any) => void): void;
};

type ChromeScripting = {
  executeScript(details: { target: { tabId: number; allFrames?: boolean }; func: Function; args?: any[] }): Promise<any>;
};

type ChromeAPI = {
  storage: {
    sync: ChromeStorageArea;
    local: ChromeStorageArea;
  };
  runtime: ChromeRuntime;
  tabs: ChromeTabs;
  scripting: ChromeScripting;
};

declare const chrome: ChromeAPI;

