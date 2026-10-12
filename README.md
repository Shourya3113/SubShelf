# SubShelf ⚡
> **Smart Subscription Category Folders & Feed Curator for YouTube™**

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available%20Now-brightgreen.svg?logo=googlechrome)](https://chromewebstore.google.com/detail/subdeck-smart-subscripti/elmeglemgjhfadeahmlbcgkjkfkfkfgd)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Bundled%20with-Vite%205-purple.svg?logo=vite)](https://vitejs.dev/)
[![CI](https://github.com/Shourya3113/SubShelf/actions/workflows/ci.yml/badge.svg)](https://github.com/Shourya3113/SubShelf/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Source--Available-yellow.svg)](./LICENSE)

**SubShelf** is a lightweight, privacy-first Chrome Extension that transforms your cluttered YouTube subscriptions into organized, themed category folders directly inside YouTube's native left sidebar and subscription feed.

Choose how channels are categorized: on-device **Gemini Nano**, an offline **keyword engine**, or (opt-in) the cloud **Google Gemini API** with your own key. SubShelf clusters your channels into smart decks in seconds.

---

## ⚡ Key Features

| Feature | Description |
|---|---|
| 📁 **Native Sidebar Folders** | Seamless accordion folders (*Tech & Coding, Gaming, Music & Audio, Education, etc.*) embedded directly above your native YouTube subscriptions. |
| ✨ **1-Click AI Auto-Categorization** | Automatically clusters 100+ subscriptions into smart category decks using on-device AI or high-precision NLP heuristics. |
| 🎯 **Custom Feed Filtering** | Clicking any category folder instantly filters `/feed/subscriptions` to display only videos from channels in that folder. |
| ⚡ **Live Feed Filtering** | Filters as YouTube loads more videos, without moving your scroll position. Quiet folders pause loading and offer a **Load more** button. |
| 📺 **In-Sidebar Channel Controls** | Add channels via the inline picker (`+`), remove channels (`✕`), or create new custom folders (`+ Folder`) without leaving YouTube. |
| 🎛️ **Full Popup Manager** | 3-tab dashboard to search channels, reassign folders via inline dropdowns, rename/delete decks, and configure AI providers. |
| 🚫 **Hide Shorts** | Optional toggle in Settings that hides the Shorts shelf and Shorts cards on your subscription feed, applied instantly. |
| 📥 **Backup & Restore** | Export and import timestamped JSON backups (`subshelf_backup_YYYY-MM-DD.json`) with automated API key sanitization. |

---

## 🛡️ Security & Privacy-First Architecture

SubShelf was built from the ground up to adhere strictly to Google Chrome Web Store Developer Program Policies and YouTube Brand Guidelines:

* **No Untrusted HTML Interpolation:** UI is built with `textContent` / `createElement`; `npm run audit:dom` enforces this in CI.
* **Minimal Permissions:** `storage` and `www.youtube.com`. Access to `generativelanguage.googleapis.com` is an *optional* permission that Chrome asks for only when you select the Gemini Cloud option.
* **Zero Remote Code Execution:** 100% locally compiled and bundled via Vite/CRXJS. Zero `eval()`, zero `new Function()`, and zero external CDN script tags.
* **Local Privacy:** SubShelf has no servers, no analytics, and no tracking. Everything stays in your browser. If you choose the optional Gemini Cloud mode, your channel names and handles are sent to Google using your own API key.
* **API Key Handling:** Your Gemini API key is sent only in the `x-goog-api-key` header (never in URLs), is read only by the background service worker, is never handed to the code running on YouTube pages, and is excluded from JSON backups.

---

## 🧠 Categorization Engines

You pick the engine in Settings. Every engine falls back to the offline engine, never to the cloud:

```
Gemini Nano (default, on-device) ──(unavailable)──► Offline keyword engine
Gemini Cloud API (opt-in, your key) ──(fails)─────► Offline keyword engine
Offline keyword engine ──────────────────────────► (always available)
```

* **Gemini Nano:** Chrome's built-in model; nothing leaves your device.
* **Offline keyword engine:** word-boundary keyword matching plus a built-in list of well-known creators, with weighted scoring.
* **Gemini Cloud API:** sends channel titles and handles to Google with your own API key (model configurable, default `gemini-2.5-flash`).

### Pre-Configured Taxonomies
1. 💻 **Tech & Coding** (*Programming, Apple, Linux, AI, Hardware, Gadgets*)
2. 🎮 **Gaming** (*Esports, Walkthroughs, Nintendo, PlayStation, Streamers*)
3. 🎵 **Music & Audio** (*Artists, Bands, VEVO, Record Labels, Lo-Fi, Live*)
4. 📚 **Education & Science** (*Physics, Math, Space, Documentaries, Tutorials*)
5. 🍿 **Entertainment & Media** (*Cinema, Animation, Comedy, Shows, Podcasts*)
6. 📈 **Finance & Business** (*Investing, Stocks, Crypto, Real Estate, Economics*)
7. 💪 **Fitness & Sports** (*Gym, Calisthenics, Workouts, UFC, Football, Athletics*)
8. 🍳 **Food & Lifestyle** (*Cooking, Recipes, Travel, DIY, Architecture, Automotive*)
9. 📰 **News & Politics** (*Journalism, Global Affairs, Breaking Reports*)
10. 🌐 **General & Others** (*Smart catch-all ensuring 100% of channels are organized*)

---

## 🛠️ Tech Stack

* **Manifest:** Chrome Extensions Manifest V3 (MV3)
* **Language:** TypeScript 5.4 (Strict Mode, ES2022)
* **Bundler & Tooling:** Vite 5.4 + `@crxjs/vite-plugin`
* **Storage:** `chrome.storage.local` with typed schema wrappers
* **Styling:** Scoped CSS isolated to `#subdeck-*` and `.subdeck-*` matching YouTube's native Polymer theme variables (`--yt-spec-*`)

---

## 🚀 Getting Started

### Prerequisites
* Node.js 20+ and npm
* Python 3.x (for automated store packaging)
* Google Chrome (or Chromium-based browser)

### 1. Clone & Install Dependencies
```bash
git clone git@github.com:Shourya3113/SubShelf.git
cd SubShelf
npm install
```

### 2. Development Mode (Hot Reloading)
```bash
npm run dev
```

### 3. Tests & Checks
```bash
npm run typecheck
npm test
npm run audit:dom
```

### 4. Production Build & Package
```bash
npm run package
```
This compiles the production bundle in `dist/` and generates a Chrome Web Store-ready archive:
```
subshelf-v1.1.1.zip (manifest.json at archive root)
```

### 5. Load into Chrome
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `dist/` directory.
4. Open [YouTube](https://www.youtube.com) and click **`✨ Auto-AI`** in the left sidebar!

---

## 📁 Project Structure

```text
SubShelf/
├── .github/workflows/      # CI (typecheck, tests, DOM audit, build) and tag-triggered release
├── assets/icons/           # High-DPI extension icon set (16px, 48px, 128px)
├── scripts/
│   ├── audit-dom.mjs       # Fails the build on unsafe DOM sinks (innerHTML, eval, ...)
│   ├── package.py          # Chrome Web Store root-zip packaging script
│   └── package.sh          # Packaging shell script
├── src/
│   ├── ai/
│   │   ├── categorizer.ts  # 3-tier AI fallback engine
│   │   ├── heuristic.ts    # Offline keyword scoring & creator list
│   │   ├── overrides.ts    # Merges AI output with your manual assignments
│   │   └── prompt.ts       # Structured prompt generator with XML envelopes
│   ├── background/
│   │   ├── migrations.ts   # Schema migration handler
│   │   └── service-worker.ts # Background bus & origin-validated messaging
│   ├── config/
│   │   └── selectors.ts    # Resilient & multi-lingual YouTube DOM selectors
│   ├── content/
│   │   ├── channelExtractor.ts # Sidebar channel parser
│   │   ├── feedFilter.ts       # Subscription feed curator & live filter
│   │   ├── healthMonitor.ts    # YouTube DOM layout degradation monitor
│   │   ├── index.ts            # Content script entry point & coordinator
│   │   ├── sidebarManager.ts   # Sidebar accordion folders & in-DOM controls
│   │   ├── subscriptionSync.ts # Reports observed subscriptions to the service worker
│   │   └── styles/subdeck.css  # Scoped YouTube-adaptive styling
│   ├── popup/
│   │   ├── popup.html      # 3-tab popup interface shell
│   │   ├── popup.css       # Theme-adaptive popup styling
│   │   └── popup.ts        # Decks CRUD, channel search & settings controller
│   ├── types/index.ts      # Domain models & storage schema contracts
│   └── utils/
│       ├── avatarHarvest.ts # Sidebar DOM and channels page avatar harvester
│       ├── cloudPermission.ts # Optional Gemini host permission helpers
│       ├── debounce.ts     # Generic debouncer utility
│       ├── exportImport.ts # Sanitized JSON backup export/import
│       ├── feedMatch.ts    # Matches feed cards (UC ID or @handle) to folders
│       ├── idNormalizer.ts # Canonical UC-ID & handle extractor
│       ├── logger.ts       # Dev-guarded logger
│       ├── storage.ts      # Typed storage layer; all writes serialized in the service worker
│       └── syncEngine.ts   # Pure subscription reconciliation with removal safeguards
├── tests/                  # Vitest unit tests
├── manifest.json           # Manifest V3 configuration
├── PRIVACY_POLICY.md       # Privacy policy compliance document
└── vite.config.ts          # Vite extension build configuration
```

---

## 📜 Documentation

* [Privacy Policy (`PRIVACY_POLICY.md`)](./PRIVACY_POLICY.md) — Extension privacy policy describing local processing and optional Gemini Cloud mode.
* [Chrome Web Store Listing](https://chromewebstore.google.com/detail/subdeck-smart-subscripti/elmeglemgjhfadeahmlbcgkjkfkfkfgd) — Official extension installation page.

## 📄 License

[Source-Available License](./LICENSE) © 2026 Shourya Solanki. All Rights Reserved.  
Open for community contributions, issue reporting, and review. Commercial redistribution or republishing to extension stores is strictly prohibited without prior written permission.

---

*Disclaimer: SubShelf is an independent source-available project and is not affiliated with, sponsored by, or endorsed by Google LLC or YouTube. YouTube™ is a trademark of Google LLC.*
