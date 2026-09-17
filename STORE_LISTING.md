# Chrome Web Store Developer Console — Submission Kit

Everything you need to publish **SubShelf** to the Chrome Web Store.

---

## Tab 1: Package
* **File to Upload:** `subshelf-v1.0.7.zip` (located in the project root directory).
* **Verify:** Generated via `npm run package`. `manifest.json` is at the root of the zip archive.

---

## Tab 2: Store Listing

### 1. Product Details
* **Product Name (Max 45 chars):**
  ```text
  SubShelf — Smart YouTube Subscription Folders
  ```
* **Summary / Short Description (Max 132 chars):**
  ```text
  Organize your YouTube™ subscriptions into smart category folders with AI clustering and feed curation.
  ```

### 2. Description (Plain Text — Copy & Paste directly into the Description box)
```text
Transform your cluttered YouTube subscription feed into organized, themed category folders.

Are you subscribed to 50, 100, or 200+ channels and tired of endless scrolling? SubShelf brings powerful, native-feeling category folders directly into your YouTube™ left sidebar and subscription feed.

KEY FEATURES:

• Smart Category Folders: Group channels into custom folders (Tech & Coding, Gaming, Music & Audio, Education, Entertainment, Finance, News, etc.) right inside YouTube's sidebar.
• 1-Click AI Auto-Categorization: Uses on-device AI (Gemini Nano) or high-precision NLP heuristics to automatically cluster all your subscriptions into curated decks in seconds.
• Custom Feed Filtering: Click any folder to filter your /feed/subscriptions page so you only see videos from those specific channels.
• Infinite Scroll Sync: Smoothly auto-loads more videos from your chosen category without breaking YouTube's native virtual grid.
• In-Sidebar Channel Controls: Add channels via the inline picker (+), remove channels (✕), or create new custom folders (+ Folder) without leaving YouTube.
• Real-time Logo & Unsubscribe Sync: High-resolution avatars load instantly for all subscriptions, and new/deleted channels update automatically.
• Full Popup Manager: Search any channel and easily move or assign channels to different folders via the popup dashboard.
• Hide Shorts Shelves: Keep your subscription feed clean by automatically removing distracting Shorts carousels.
• 100% Private & Local: All your data, categories, and settings are stored locally in your browser. No third-party tracking, no external servers, no ads.
• Backup & Restore: Export and import your category layouts as JSON files to sync across multiple computers.

PRIVACY & PERMISSIONS TRANSPARENCY:

SubShelf strictly adheres to the Chrome Web Store Principle of Least Privilege:
• Storage (chrome.storage.local): Used exclusively to save your custom categories, folder names, and channel assignments locally on your device.
• Host Permissions (https://*.youtube.com/*): Needed to inject the folder sidebar and filter the subscriptions feed when you browse YouTube.
• Host Permissions (https://generativelanguage.googleapis.com/*): Used only if you optionally configure a personal Google Gemini Cloud API key.

LEGAL DISCLAIMER:
SubShelf is an independent open-source project and is not affiliated with, sponsored by, or endorsed by Google LLC or YouTube. YouTube™ is a trademark of Google LLC.
```

### 3. Categorization & Language
* **Category:** `Productivity`
* **Primary Language:** `English`

### 4. Graphic Assets (Upload from `assets/store/`)
* **Store Icon (128x128):** Upload `assets/store/icon128.png`
* **Screenshots (1280x800):** Upload `assets/store/screenshot_1_1280x800.png`, `screenshot_2_1280x800.png`, `screenshot_3_1280x800.png`
* **Small Promo Tile (440x280):** Upload `assets/store/promo_small_440x280.png`
* **Marquee Promo Tile (1400x560):** Upload `assets/store/promo_marquee_1400x560.png`

---

## Tab 3: Privacy Practices (CRITICAL FOR REVIEW APPROVAL)

### 1. Single Purpose Description
> Paste this exact text:
```text
SubShelf has a single, unified purpose: to organize a user's YouTube subscriptions into categorized folders in the sidebar and curate the subscription feed based on selected categories.
```

### 2. Permission Justifications
* **`storage` justification:**
  ```text
  Used strictly to store the user's custom folder names, channel category assignments, and extension preferences locally on their device via chrome.storage.local.
  ```
* **`https://*.youtube.com/*` host permission justification:**
  ```text
  Required to inject the collapsible category folders into YouTube's left sidebar and filter the subscription video grid on youtube.com/feed/subscriptions.
  ```
* **`https://generativelanguage.googleapis.com/*` host permission justification:**
  ```text
  Required only when the user chooses to use Google Gemini 1.5 Flash Cloud API with their own API key for AI channel categorization.
  ```

### 3. Data Usage Disclosures
* **"Does your extension collect user data?"**
  * Check: **No, I am not collecting or using user data.**
* **Certification:**
  * Check the declaration: *"I certify that this extension complies with the Developer Program Policies, including the User Data FAQ."*

### 4. Privacy Policy URL
```text
https://github.com/Shourya3113/SubShelf/blob/main/PRIVACY_POLICY.md
```

---

## Tab 4: Distribution
* **Visibility:** `Public` (or `Unlisted` if testing with friends first)
* **Pricing:** `Free`
* **Regions:** `All regions`
