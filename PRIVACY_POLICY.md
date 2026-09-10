# Privacy Policy for SubShelf — Smart YouTube™ Subscription Folders

**Last Updated:** September 10, 2026  
**Extension Name:** SubShelf — Smart YouTube™ Subscription Folders  
**Repository:** [https://github.com/Shourya3113/SubShelf](https://github.com/Shourya3113/SubShelf)

SubShelf ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy outlines our practices regarding data collection, usage, and disclosure when you use the SubShelf Chrome Extension.

---

## 1. Overview: 100% Private & Local-First Architecture

SubShelf operates on a **strict local-first architecture**:
- **We do not collect, transmit, sell, or monetize any personal user data.**
- All your subscription data, folder structures, channel categorization, and user preferences are stored **100% locally on your device** using Chrome's secure `chrome.storage.local` API.
- We do not operate external tracking servers, analytics services, or user databases.

---

## 2. Information Handled by the Extension

### A. YouTube™ Subscription Data
- **What is accessed:** Channel titles, handles, channel IDs (`ucId`), and thumbnail URLs visible in your YouTube left sidebar.
- **Why it is accessed:** To allow you to organize your existing subscriptions into folders, filter your subscriptions feed, and manage your viewing shelves.
- **Where it is stored:** Exclusively inside your browser's local storage (`chrome.storage.local`). This data never leaves your computer.

### B. User Customizations & Overrides
- **What is stored:** Folder names, custom icons, channel assignments, and manual category exclusions.
- **Where it is stored:** Exclusively in local storage on your device.

### C. Optional AI API Keys
- If you optionally choose to use Google Gemini Cloud API for categorization and provide your own API key in Settings, the key is saved exclusively in your browser's local storage.
- The API key is used solely to communicate directly from your browser to Google's official Gemini endpoint (`https://generativelanguage.googleapis.com/*`). We have no access to your API key.

---

## 3. Permissions Used & Justification

SubShelf requests only the minimal permissions required to provide its core functionality:

| Permission | Purpose & Justification |
|---|---|
| `storage` | Storing your subscription categories, channel folder assignments, manual exclusions, and settings locally on your machine. |
| `https://*.youtube.com/*` | Interacting with YouTube web pages to render the native subscription folder accordion in the sidebar and filter the subscriptions feed according to your selected folder. |
| `https://generativelanguage.googleapis.com/*` | (Optional) Communicating directly with Google Gemini API only if you provide your own API key for cloud categorization. |

---

## 4. Artificial Intelligence & Data Processing

SubShelf offers three tiers of channel categorization:
1. **On-Device Gemini Nano (Chrome Built-in AI):** Runs entirely locally on your computer. No data is sent over the network.
2. **Offline Heuristic Categorization:** Uses deterministic local keywords and regular expressions. Runs entirely offline.
3. **Optional Gemini Cloud API:** If activated by you with your own API key, sends only sanitized channel titles and handles to Google's Generative Language API. No personally identifiable account details are transmitted.

---

## 5. Third-Party Sharing & Data Transfers

- **Zero Third-Party Sharing:** We do not share, sell, rent, or trade your data with any third parties or data brokers.
- **Zero Tracking:** We do not embed Google Analytics, Mixpanel, cookies, or any tracking telemetry in the extension.

---

## 6. Data Retention & Deletion

- All data stored by SubShelf remains on your computer for as long as the extension is installed.
- You can delete all SubShelf data at any time by:
  1. Exporting or clearing your data from the extension Settings tab, or
  2. Removing the extension from Chrome (`chrome://extensions` -> "Remove").
- Removing the extension instantly purges all local storage data from your browser.

---

## 7. Compliance with Google Chrome Web Store Policies

SubShelf complies with the **Chrome Web Store User Data Policy**, including the **Limited Use requirements**:
- The use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy.
- The extension does not transfer user data to third parties, except as strictly necessary to provide the user-facing features described above.
- The extension does not use user data for lending, credit, advertising, or marketing.

---

## 8. Changes to This Privacy Policy

If we update this Privacy Policy, the revised version will be published at this URL with an updated revision date.

---

## 9. Contact & Inquiries

If you have any questions or concerns regarding this Privacy Policy or SubShelf's data practices, please open an issue on GitHub:
- **GitHub Repository:** [https://github.com/Shourya3113/SubShelf](https://github.com/Shourya3113/SubShelf)
- **Developer Issues:** [https://github.com/Shourya3113/SubShelf/issues](https://github.com/Shourya3113/SubShelf/issues)
