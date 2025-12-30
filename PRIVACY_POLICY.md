# Privacy Policy for Paste Apply

**Last Updated:** [Date]

## Introduction

Paste Apply ("we", "our", or "the extension") is a browser extension designed to help users automatically fill job application forms with their saved information. This Privacy Policy explains how we handle your data when you use our extension.

## Data Collection and Storage

### Personal Information Stored Locally

The extension stores the following information locally in your browser:

- **Profile Information:**
  - First name
  - Last name
  - Email address
  - Phone number
  - GitHub profile URL
  - LinkedIn profile URL
  - Portfolio/website URL
  - Location (city, country)

- **Resume Data:**
  - Resume file (PDF or other formats)
  - Resume file name
  - Resume file type

### How Data is Stored

All data is stored locally on your device using Chrome's storage APIs:
- Profile information is stored using `chrome.storage.sync` (synchronized across your devices if you're signed into Chrome)
- Resume files are stored using `chrome.storage.local` (stored only on the current device)

## Data Usage

### What We Do With Your Data

- **Form Filling:** The extension uses your stored information to automatically fill job application forms on websites you visit
- **Resume Parsing:** The extension can parse PDF resume files to extract contact information (email, phone, name, social profiles) to help populate your profile
- **Local Processing:** All data processing occurs locally in your browser. No information is transmitted to external servers

### What We Don't Do

- **No Data Transmission:** We do not send, transmit, or share your personal information with any external servers, third parties, or services
- **No Analytics:** We do not collect analytics, usage statistics, or tracking data
- **No External Storage:** We do not store your data on any external servers or cloud services

## Permissions

The extension requires the following permissions:

- **`storage`:** To save and retrieve your profile information and resume files locally
- **`activeTab`:** To access the current webpage and fill form fields
- **`scripting`:** To inject scripts that identify and fill form fields on web pages
- **`windows`:** To manage the extension popup window
- **`<all_urls>`:** To work on any website where you might fill out job applications

These permissions are necessary for the extension to function. The extension only accesses web pages when you actively use it to fill forms.

## Data Security

- All data is stored locally in your browser using Chrome's secure storage APIs
- Data is encrypted by Chrome's storage system
- The extension does not have access to your passwords or other sensitive browser data beyond what you explicitly provide

## Your Rights

You have full control over your data:

- **Access:** You can view all stored data through the extension's popup interface
- **Modify:** You can update or change any stored information at any time
- **Delete:** You can delete your profile information and resume files at any time
- **Uninstall:** Uninstalling the extension will remove all stored data from your browser

## Third-Party Services

The extension does not integrate with any third-party services or APIs. All functionality operates entirely within your browser.

## Children's Privacy

The extension is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date at the top of this policy. You are advised to review this Privacy Policy periodically for any changes.

## Contact Us

If you have any questions about this Privacy Policy or the extension's data practices, please contact us at:

[Your Contact Email or Support Channel]

## Compliance

This extension complies with:
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Other applicable data protection laws

Since all data is stored locally and never transmitted externally, the extension maintains a high standard of privacy by design.

