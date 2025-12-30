# Job Application Auto-Fill Chrome Extension

A Chrome extension that automatically fills job application forms with your saved information.

## Features

- Save your profile information (name, email, phone, GitHub, LinkedIn, etc.)
- Automatically detect and fill form fields on job application pages
- Smart field matching based on common field names and labels
- Easy-to-use popup interface

## Development Setup

1. Build the extension:
   ```bash
   npm run build
   ```

## Installation

1. Build the extension (see Development Setup above)
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked"
5. Select the `paste-apply` folder
6. The extension icon should appear in your Chrome toolbar

## Usage

1. Click the extension icon in your Chrome toolbar
2. Fill in your profile information (first name, last name, email, phone, GitHub, LinkedIn, etc.)
3. Click "Save Profile" to save your information
4. When you're on a job application page, click the extension icon and click "Fill Current Page"
5. The extension will automatically detect and fill matching form fields

## Supported Fields

- First Name
- Last Name
- Email
- Phone
- GitHub URL
- LinkedIn URL
- Portfolio URL
- Location
- Resume/CV URL

## How It Works

The extension uses intelligent field matching to identify form fields based on:
- Field IDs
- Field names
- Placeholder text
- Associated labels

It matches common variations like "first-name", "first_name", "firstName", etc.

## Notes

- The extension only fills empty fields (won't overwrite existing data)
- Make sure to review filled information before submitting forms
- Your data is stored locally in Chrome's sync storage

