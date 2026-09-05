# SubShelf ⚡
> **Smart Subscription Category Folders & Feed Curator for YouTube™**

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available%20Now-brightgreen.svg?logo=googlechrome)](https://chromewebstore.google.com/detail/subdeck-smart-subscripti/elmeglemgjhfadeahmlbcgkjkfkfkfgd)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Bundled%20with-Vite%205-purple.svg?logo=vite)](https://vitejs.dev/)
[![Security Audit](https://img.shields.io/badge/Security%20Audit-Zero--XSS%20%7C%20Hardened-brightgreen.svg)](#-security--privacy-first-architecture)
[![License](https://img.shields.io/badge/License-Source--Available-yellow.svg)](./LICENSE)

**SubShelf** is a lightweight, privacy-first Chrome Extension that transforms your cluttered YouTube subscriptions into organized, themed category folders directly inside YouTube's native left sidebar and subscription feed.

Powered by a 3-tier categorization engine (on-device **Gemini Nano**, cloud **Gemini 1.5 Flash**, and deterministic **NLP keyword heuristics**), SubShelf automatically clusters your channels into smart decks in seconds with zero data collection.

---

## ⚡ Key Features

| Feature | Description |
|---|---|
| 📁 **Native Sidebar Folders** | Seamless accordion folders (*Tech & Coding, Gaming, Music & Audio, Education, etc.*) embedded directly above your native YouTube subscriptions. |
| ✨ **1-Click AI Auto-Categorization** | Automatically clusters 100+ subscriptions into smart category decks using on-device AI or high-precision NLP heuristics. |
| 🎯 **Custom Feed Filtering** | Clicking any category folder instantly filters `/feed/subscriptions` to display only videos from channels in that folder. |
| ♾️ **Infinite Scroll Sync** | Continuation auto-scroll seamlessly pulls more videos from your chosen category without breaking YouTube's native virtual grid. |
| 📺 **In-Sidebar Channel Controls** | Add channels via the inline picker (`+`), remove channels (`✕`), or create new custom folders (`+ Folder`) without leaving YouTube. |
| 🎛️ **Full Popup Manager** | 3-tab dashboard to search channels, reassign folders via inline dropdowns, rename/delete decks, and configure AI providers. |
| 🚫 **Hide Shorts Shelves** | Optional one-click toggle in Settings to remove distracting Shorts carousels from your subscription feed. |
| 📥 **Backup & Restore** | Export and import timestamped JSON backups (`subdeck_backup_YYYY-MM-DD.json`) with automated API key sanitization. |

---

## 🛡️ Security & Privacy-First Architecture

SubShelf was built from the ground up to adhere strictly to Google Chrome Web Store Developer Program Policies and YouTube Brand Guidelines:

* **Zero-XSS Protection:** 100% of DOM manipulation uses safe node construction (`document.createElement`, `textContent`). Zero `innerHTML` interpolation across the entire extension.
* **Minimal Permissions:** Only requests `"storage"`. Zero intrusive permissions like `webRequest`, `cookies`, `tabs`, or `<all_urls>`.
* **Zero Remote Code Execution:** 100% locally compiled and bundled via Vite/CRXJS. Zero `eval()`, zero `new Function()`, and zero external CDN script tags.
* **Local Privacy:** All channel IDs, folder structures, and settings are saved locally in `chrome.storage.local`. No external tracking servers, analytics, or third-party telemetries.
* **Credential Isolation:** Personal Google Gemini API keys are passed strictly via the `x-goog-api-key` HTTP header (never exposed in URL query strings) and automatically stripped from JSON export backups.

---

## 🧠 3-Tier AI Categorization Engine

```
[User Subscriptions]
         │
         ├──► 1. Chrome Built-in AI (Gemini Nano)  [On-Device / 0 Latency]
         │           │ (if unavailable)
         │           ▼
         ├──► 2. Google Gemini 1.5 Flash API       [Cloud / Highly Accurate]
         │           │ (if no key provided)
         │           ▼
         └──► 3. Deterministic NLP Scoring Engine  [100% Offline / Instant]
                     - Strict word-boundary matching (\b)
                     - 100+ Pre-trained Creator Signatures
                     - Multi-class weighted confidence scoring
```

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

### 3. Production Build & Package
```bash
npm run package
```
This compiles the production bundle in `dist/` and generates a Chrome Web Store-ready archive:
```
subshelf-v1.0.1.zip (manifest.json at archive root)
```

### 4. Load into Chrome
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `dist/` directory.
4. Open [YouTube](https://www.youtube.com) and click **`✨ Auto-AI`** in the left sidebar!

---

## 📁 Project Structure

```text
SubDeck/
├── .github/workflows/      # Automated CI/CD release workflow
├── assets/icons/           # High-DPI extension icon set (16px, 48px, 128px)
├── scripts/
│   ├── package.py          # Chrome Web Store root-zip packaging script
│   └── package.sh          # Cross-platform packaging shell script
├── src/
│   ├── ai/
│   │   ├── categorizer.ts  # 3-tier AI fallback engine
│   │   ├── heuristic.ts    # NLP weighted scoring & creator signatures
│   │   └── prompt.ts       # Structured prompt generator with XML envelopes
│   ├── background/
│   │   ├── migrations.ts   # Schema migration handler
│   │   └── service-worker.ts # Background bus & origin-validated messaging
│   ├── config/
│   │   └── selectors.ts    # Resilient & multi-lingual YouTube DOM selectors
│   ├── content/
│   │   ├── channelExtractor.ts # Sidebar channel parser
│   │   ├── feedFilter.ts       # Subscription feed curator & infinite scroll
│   │   ├── healthMonitor.ts    # YouTube DOM layout degradation monitor
│   │   ├── index.ts            # Content script entry point & coordinator
│   │   ├── sidebarManager.ts   # Sidebar accordion folders & in-DOM controls
│   │   ├── subscriptionSync.ts # Atomic delta synchronization
│   │   └── styles/subdeck.css  # Scoped YouTube-adaptive styling
│   ├── popup/
│   │   ├── popup.html      # 3-tab popup interface shell
│   │   ├── popup.css       # Theme-adaptive popup styling
│   │   └── popup.ts        # Decks CRUD, channel search & settings controller
│   ├── types/index.ts      # Domain models & storage schema contracts
│   └── utils/
│       ├── debounce.ts     # Generic debouncer utility
│       ├── exportImport.ts # Sanitized JSON backup export/import
│       ├── idNormalizer.ts # Canonical UC-ID & handle extractor
│       ├── logger.ts       # Dev-guarded logger
│       └── storage.ts      # Typed chrome.storage wrapper
├── manifest.json           # Manifest V3 configuration
├── PRIVACY_POLICY.md       # Privacy policy compliance document
├── STORE_LISTING.md        # Chrome Web Store listing metadata & descriptions
├── SUBDECK_BLUEPRINT.md    # Master architectural specification
└── vite.config.ts          # Vite extension build configuration
```

---

## 📜 Documentation

* [Store Listing Copy (`STORE_LISTING.md`)](./STORE_LISTING.md) — Store descriptions, feature bullet points, and store metadata.
* [Privacy Policy (`PRIVACY_POLICY.md`)](./PRIVACY_POLICY.md) — Certified zero-data collection policy for Web Store submission.
* [Architecture Blueprint (`SUBDECK_BLUEPRINT.md`)](./SUBDECK_BLUEPRINT.md) — Full 6-day build specifications and domain models.

---

## 📄 License

[Source-Available License](./LICENSE) © 2026 Shourya Solanki. All Rights Reserved.  
Open for community contributions, issue reporting, and review. Commercial redistribution or republishing to extension stores is strictly prohibited without prior written permission.

---

*Disclaimer: SubShelf is an independent open-source project and is not affiliated with, sponsored by, or endorsed by Google LLC or YouTube. YouTube™ is a trademark of Google LLC.*
