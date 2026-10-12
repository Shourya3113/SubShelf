# Privacy Policy for SubShelf — Smart YouTube™ Subscription Folders

**Last Updated:** October 12, 2026  
**Extension Name:** SubShelf — Smart YouTube™ Subscription Folders  
**Repository:** [https://github.com/Shourya3113/SubShelf](https://github.com/Shourya3113/SubShelf)

SubShelf ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy outlines our practices regarding data collection, storage, security isolation, and data transfers when you use the SubShelf Chrome Extension.

---

## 1. Overview: Local-First & Privacy-By-Design Architecture

SubShelf is designed from the ground up on a **strict local-first, zero-telemetry architecture**:
- **Zero Data Collection:** We do not collect, store, sell, or monetize any personal user data.
- **100% Local Storage:** All subscription data, folder hierarchies, category mappings, and preferences are stored exclusively on your device using Chrome's `chrome.storage.local` API.
- **Zero Telemetry or Analytics:** The extension contains no analytics packages (e.g., Google Analytics, Mixpanel), no telemetry beacons, no diagnostic pings, and no tracking cookies.
- **Default 100% On-Device AI:** By default, channel categorization is performed entirely on your device using either Chrome's on-device Built-in AI (**Gemini Nano**) or deterministic **Offline Regex Heuristics**. No channel data leaves your computer under the default configuration.

---

## 2. Information Handled by the Extension

### A. YouTube™ Subscription Data
- **What is accessed:** Channel titles, handles, channel IDs (`ucId`), avatar URLs and short channel descriptions of the channels you subscribe to, read from the YouTube pages you visit (the left sidebar and the subscription data YouTube already loads for that sidebar). To fill in missing channel avatars and descriptions, the extension may also load YouTube's own "All subscriptions" page (`youtube.com/feed/channels`) in the background, using your existing YouTube session. This request goes only to YouTube.
- **Why it is accessed:** To organize your subscribed channels into custom folder decks, filter your subscriptions feed by topic, and render collapsible shelves.
- **Where it is stored:** Exclusively inside your browser's local storage (`chrome.storage.local`). This data is never sent to any server operated by SubShelf.

### B. User Customizations & Overrides
- **What is stored:** Custom folder names, selected folder emojis/icons, manual channel assignments, and category exclusions.
- **Where it is stored:** Exclusively in local storage on your device.

### C. Optional Gemini Cloud API & Key Handling
- **Optional Feature:** Categorization via Google's Gemini Cloud API is strictly optional and disabled by default. It is only activated if you explicitly select the "Google Gemini (Cloud API)" provider, grant the extension permission to contact `generativelanguage.googleapis.com` (Chrome asks you at that moment), and enter your personal Gemini API key in Settings.
- **No automatic escalation:** If Gemini Nano is selected but unavailable on your device, SubShelf falls back to the offline engine. It never switches to the Cloud API on its own.
- **Data Transmitted:** If you enable the Cloud API tier, the extension sends your subscribed channel titles, handles and short channel descriptions (the "About" text YouTube shows on your All subscriptions page, truncated to about 200 characters each) over HTTPS to Google's official Generative Language API endpoint (`https://generativelanguage.googleapis.com/*`) in order to categorize them into relevant topics.
- **Google Gemini API Free-Tier Data Terms:**
  > [!WARNING]
  > Under Google's API Terms of Service for free-of-charge API usage (Google AI Studio and Gemini API Free Tier), prompts and responses may be processed and reviewed by human reviewers and used by Google to improve and train Google products, services, and machine learning models.
  > If you utilize a paid (pay-as-you-go) Gemini API key, Google's enterprise terms apply, under which customer data is not used for model training.
- **100% Private Alternatives:** If you do not want your subscribed channel names, handles and descriptions transmitted to Google or processed under Google's free-tier terms, you should use **Gemini Nano (Chrome Built-in AI)** or **Offline Regex & Keywords**. Both options operate entirely on your device with **zero network requests**.

---

## 3. Security & API Key Isolation

We take the security of your configuration and credentials seriously:
- **Key Storage:** If you provide a Gemini API key, it is saved in the extension's local storage (`chrome.storage.local`) on your device, separately from your folder data. Web pages, including YouTube itself, cannot access extension storage.
- **Limited Use Inside the Extension:** The extension's code running on YouTube pages never requests or receives the key; the storage layer strips it from the state it hands to that code. Only the background service worker reads the key, and only to make a Cloud categorization request you started. The settings popup displays it so you can edit or remove it.
- **Zero Extension Server Transmission:** Your API key is communicated directly from your browser to Google's official endpoints. SubShelf does not operate intermediary servers, proxies, or relays.
- **Sanitized Backups:** When exporting your folder configuration to a JSON backup file, the API key is stripped from the export payload to prevent accidental credential leakage.

---

## 4. Permissions Used & Justification

SubShelf requests only the minimal permissions required to provide its features:

| Permission | Purpose & Justification |
|---|---|
| `storage` | Storing subscription folders, channel-to-deck mappings, manual overrides, and preferences locally on your machine. |
| `https://www.youtube.com/*` | Interacting with YouTube web pages to render the native folder accordion in the left sidebar and filter the subscriptions feed according to the active folder. The extension does not run on other YouTube sites (YouTube Music, Studio, mobile). |
| `https://generativelanguage.googleapis.com/*` | **Optional permission**, not granted at install. Chrome asks for it only when you select the Cloud provider; it lets the extension call Google's Gemini API with your own key. You can revoke it at any time from the extension's details page. |

---

## 5. Artificial Intelligence Categorization Tiers

SubShelf provides three distinct categorization engines:

1. **On-Device Gemini Nano (Chrome Built-in AI — Default):**
   - Utilizes Chrome's built-in Prompt API (`globalThis.LanguageModel`).
   - Runs inference entirely on your device hardware (NPU/GPU/CPU).
   - **Privacy:** 100% On-Device. Zero network requests. No data leaves your machine. If Nano is unavailable, the offline engine below is used instead.

2. **Offline Heuristic Categorization:**
   - Utilizes deterministic keyword matching, regular expressions, and a built-in list of well-known creator names.
   - Runs instantaneously in browser memory.
   - **Privacy:** 100% Offline. Zero network requests.

3. **Optional Google Gemini Cloud API:**
   - Utilizes Google's cloud-hosted Gemini models (e.g., `gemini-2.5-flash`).
   - Requires a personal API key provided by the user.
   - **Privacy:** Network transmission of channel titles, handles and short channel descriptions to Google. Governed by Google's Generative AI Terms of Service and data use policies.

---

## 6. Third-Party Sharing & Data Transfers

- **Zero Third-Party Sharing:** We do not sell, rent, trade, or transfer your personal data or browsing activity to any third parties, advertisers, or data brokers.
- **Zero Tracking Telemetry:** There is no telemetry tracking code, usage tracking, or crash analytics embedded in the extension.
- **No Third-Party Scripts:** SubShelf does not load external scripts, remote code, tracking pixels, or third-party stylesheets.

---

## 7. Data Retention & Deletion

- All data stored by SubShelf remains on your local machine for as long as the extension is installed.
- You can delete all SubShelf data at any time by:
  1. Deleting folders and channels from the popup, and using "Reset overrides" in the Settings tab to clear manual assignments, or
  2. Uninstalling the extension from Chrome (`chrome://extensions` -> "Remove").
- Uninstalling the extension immediately and permanently removes all stored data from your browser's local storage.

---

## 8. Compliance with Google Chrome Web Store Policies

SubShelf strictly complies with the **Chrome Web Store User Data Policy**, including the **Limited Use requirements**:
- The extension does not transfer user data to third parties, except as strictly necessary to execute the user-facing features described above (specifically, optional direct API calls to Google if configured by the user).
- The extension does not use or transfer user data for personalized advertising, credit assessment, or data broker distribution.
- The extension requests only the minimum set of permissions necessary to deliver its core folder organization and feed filtering functions.

---

## 9. Contact & Inquiries

If you have any questions or concerns regarding this Privacy Policy or SubShelf's security practices, please open an issue on GitHub:
- **GitHub Repository:** [https://github.com/Shourya3113/SubShelf](https://github.com/Shourya3113/SubShelf)
- **Developer Issues:** [https://github.com/Shourya3113/SubShelf/issues](https://github.com/Shourya3113/SubShelf/issues)
