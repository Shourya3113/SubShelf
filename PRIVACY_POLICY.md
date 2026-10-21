# Privacy Policy for SubShelf — Smart YouTube™ Subscription Folders

**Last Updated:** October 13, 2026  
**Extension Name:** SubShelf — Smart YouTube™ Subscription Folders  
**Repository:** [https://github.com/Shourya3113/SubShelf](https://github.com/Shourya3113/SubShelf)

SubShelf ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy outlines our practices regarding data collection, storage, security isolation, and data transfers when you use the SubShelf Chrome Extension.

---

## 1. Overview: Local-First & Privacy-By-Design Architecture

SubShelf is designed from the ground up on a **strict local-first, zero-telemetry architecture**:
- **Nothing Reaches the Developer:** SubShelf has no servers, and none of the data it handles is ever sent to us. We do not sell or monetize any data.
- **Stored on Your Device:** Your subscription data, folders, channel assignments and preferences are stored on your device in Chrome's extension storage (`chrome.storage.local`). Two small temporary values are also kept: the folder you are filtering by in a YouTube tab (in that tab's `sessionStorage`, cleared when the tab closes) and a short-lived flag while Chrome's permission prompt for the Cloud engine is open (`chrome.storage.session`).
- **Zero Telemetry or Analytics:** The extension contains no analytics packages (e.g., Google Analytics, Mixpanel), no telemetry beacons, no diagnostic pings, and no tracking cookies.
- **On-Device by Default:** By default, channel categorization runs entirely on your device with the offline engine (and, if you choose, Chrome's on-device AI when Chrome already has it). SubShelf never downloads AI models. No channel data leaves your computer under the default configuration.

---

## 2. Information Handled by the Extension

### A. YouTube™ Subscription Data
- **What is accessed:** Channel titles, handles, channel IDs (`ucId`), avatar URLs and short channel descriptions of the channels you subscribe to, read from the YouTube pages you visit (the left sidebar and the subscription data YouTube already loads for that sidebar). To fill in missing channel avatars and descriptions, the extension may also load YouTube's own "All subscriptions" page (`youtube.com/feed/channels`) in the background, using your existing YouTube session. This request goes only to YouTube.
- **Subscribe and unsubscribe actions:** When you subscribe to or unsubscribe from a channel on YouTube, SubShelf reads YouTube's own confirmation (which channel, and whether you are now subscribed) so your folders stay in sync. A channel you unsubscribe from is removed from your folders, and which folders it was in is remembered on your device for 30 days, so resubscribing puts it back.
- **Why it is accessed:** To organize your subscribed channels into custom folder decks, filter your subscriptions feed by topic, and render collapsible shelves.
- **Where it is stored:** Exclusively inside your browser's local storage (`chrome.storage.local`). This data is never sent to any server operated by SubShelf.

### B. User Customizations & Overrides
- **What is stored:** Custom folder names, selected folder emojis/icons, manual channel assignments, and category exclusions.
- **Where it is stored:** Exclusively in local storage on your device.

### C. One-Time Rating Request
- **What is stored:** The date you first had folders, and whether you answered SubShelf's one-time "Enjoying SubShelf?" request (rated, or chose "Not now" and until when). SubShelf does not count clicks, visits or any other usage to decide when to ask.
- **Where it is stored:** In local storage on your device. It is never sent anywhere and is not included in backups.

### D. Optional Gemini Cloud API & Key Handling
- **Optional Feature:** Categorization via Google's Gemini Cloud API is strictly optional and disabled by default. It is only activated if you explicitly select the "Google Gemini Cloud (your API key)" engine in Settings, grant the extension permission to contact `generativelanguage.googleapis.com` (Chrome asks you at that moment), and enter your personal Gemini API key in Settings.
- **No automatic escalation:** If you choose "Offline + on-device AI" and Chrome doesn't have its on-device model, SubShelf uses the offline engine. It never switches to the Cloud API on its own.
- **Data Transmitted:** If you enable the Cloud API tier, the extension sends your subscribed channel titles, handles and short channel descriptions (the "About" text YouTube shows on your All subscriptions page, truncated to about 200 characters each) over HTTPS to Google's official Generative Language API endpoint (`https://generativelanguage.googleapis.com/*`) in order to categorize them into relevant topics.
- **Google Gemini API Free-Tier Data Terms:**
  > [!WARNING]
  > Under Google's [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms), when you use the free tier, Google may use your prompts and responses (here: channel titles, handles and descriptions) to improve its products, and human reviewers may read them.
  > If your API key belongs to a paid (billing-enabled) project, Google's paid-service terms apply, under which Google does not use your prompts or responses to improve its products. SubShelf has no control over how Google handles this data; Google's terms govern it.
- **100% Private Alternatives:** If you do not want your subscribed channel names, handles and descriptions transmitted to Google or processed under Google's free-tier terms, use **Offline** (the default) or **Offline + on-device AI**. Both run entirely on your device with **zero network requests**.

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
| `storage` | Storing your folders, channel-to-folder assignments, manual corrections, preferences, a local copy of your subscribed channels, and (only if you enter one) your Gemini API key on your machine, plus a short-lived flag in `chrome.storage.session` while a permission prompt is open. |
| `offscreen` | Lets the extension open a hidden extension page to run Chrome's on-device AI (Gemini Nano) when you choose "Offline + on-device AI" and Chrome already has the model. It only runs on your device, makes no network requests, and never downloads a model. |
| `https://www.youtube.com/*` | Interacting with YouTube web pages to render the native folder accordion in the left sidebar and filter the subscriptions feed according to the active folder. The extension does not run on other YouTube sites (YouTube Music, Studio, mobile). |
| `https://generativelanguage.googleapis.com/*` | **Optional permission**, not granted at install. Chrome asks for it only when you select the Cloud provider; it lets the extension call Google's Gemini API with your own key. You can revoke it at any time from the extension's details page. |

---

## 5. Artificial Intelligence Categorization Tiers

SubShelf provides three distinct categorization engines:

1. **Offline Categorization (Default):**
   - Utilizes deterministic keyword matching, a built-in list of well-known creator names, and word profiles learned from your own manual corrections.
   - Runs instantaneously in browser memory.
   - **Privacy:** 100% Offline. Zero network requests.

2. **Optional On-Device AI (Chrome's Gemini Nano):**
   - Used only if you select it and Chrome already has its on-device model installed; SubShelf never downloads the model.
   - Only reviews channels the offline engine could not place. Runs entirely on your device hardware.
   - **Privacy:** 100% On-Device. Zero network requests.

3. **Optional Google Gemini Cloud API:**
   - Utilizes Google's cloud-hosted Gemini models (e.g., `gemini-3.5-flash-lite`).
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
- You can delete SubShelf data at any time:
  1. Delete folders from the popup or the sidebar, and use **Settings → Advanced → Forget my corrections** to clear the channels you placed by hand. The list of subscribed channels is refreshed from YouTube whenever you visit it, so it comes back while the extension is installed.
  2. To remove everything, uninstall the extension from Chrome (`chrome://extensions` → "Remove").
- Uninstalling the extension immediately and permanently removes all data SubShelf stored in Chrome's extension storage. The only other value, the active folder in a YouTube tab's `sessionStorage`, is cleared when that tab closes.

---

## 8. Compliance with Google Chrome Web Store Policies

SubShelf strictly complies with the **Chrome Web Store User Data Policy**, including the **Limited Use requirements**:
- The extension does not transfer user data to third parties, except as strictly necessary to execute the user-facing features described above (specifically, optional direct API calls to Google if configured by the user).
- The extension does not use or transfer user data for personalized advertising, credit assessment, or data broker distribution.
- The extension requests only the minimum set of permissions necessary to deliver its core folder organization and feed filtering functions.
- In the Chrome Web Store's data categories, SubShelf handles **website content** (channel names, handles, avatars and descriptions read from YouTube) and, only if you enter one, **authentication information** (your own Gemini API key). Both stay on your device, except as described in section 2D.

---

## 9. Contact & Inquiries

If you have any questions or concerns regarding this Privacy Policy or SubShelf's security practices, please open an issue on GitHub:
- **GitHub Repository:** [https://github.com/Shourya3113/SubShelf](https://github.com/Shourya3113/SubShelf)
- **Developer Issues:** [https://github.com/Shourya3113/SubShelf/issues](https://github.com/Shourya3113/SubShelf/issues)
