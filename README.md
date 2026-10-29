# SubShelf ⚡
> **Smart Subscription Category Folders & Feed Curator for YouTube™**

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/elmeglemgjhfadeahmlbcgkjkfkfkfgd?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/elmeglemgjhfadeahmlbcgkjkfkfkfgd)
[![Users](https://img.shields.io/chrome-web-store/users/elmeglemgjhfadeahmlbcgkjkfkfkfgd?label=users)](https://chromewebstore.google.com/detail/elmeglemgjhfadeahmlbcgkjkfkfkfgd)
[![Rating](https://img.shields.io/chrome-web-store/rating/elmeglemgjhfadeahmlbcgkjkfkfkfgd?label=rating)](https://chromewebstore.google.com/detail/elmeglemgjhfadeahmlbcgkjkfkfkfgd/reviews)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Bundled%20with-Vite%207-purple.svg?logo=vite)](https://vitejs.dev/)
[![CI](https://github.com/Shourya3113/SubShelf/actions/workflows/ci.yml/badge.svg)](https://github.com/Shourya3113/SubShelf/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Source--Available-yellow.svg)](./LICENSE)

**SubShelf** is a lightweight, privacy-first Chrome Extension that transforms your cluttered YouTube subscriptions into organized, themed category folders directly inside YouTube's native left sidebar and subscription feed.

Channels are sorted by a fast offline engine that learns from your own corrections, optionally helped by Chrome's on-device AI (if Chrome already has it) or, opt-in, the cloud **Google Gemini API** with your own key. SubShelf never downloads AI models.

### [➜ Install SubShelf from the Chrome Web Store](https://chromewebstore.google.com/detail/elmeglemgjhfadeahmlbcgkjkfkfkfgd)

Free, no account needed. If SubShelf helps you, a [rating or review](https://chromewebstore.google.com/detail/elmeglemgjhfadeahmlbcgkjkfkfkfgd/reviews) helps other people find it. The Getting Started section below is only for building it from source.

### 🎬 Watch the demo

[![SubShelf demo video on YouTube](https://img.youtube.com/vi/d0MzwjozSnU/maxresdefault.jpg)](https://www.youtube.com/watch?v=d0MzwjozSnU)

---

## ⚡ Key Features

| Feature | Description |
|---|---|
| 📁 **Native Sidebar Folders** | Seamless accordion folders (*Tech & Coding, Gaming, Music & Audio, Education, etc.*) embedded directly above your native YouTube subscriptions. |
| ✨ **1-Click Auto-sort** | Sorts hundreds of subscriptions into folders instantly, on your device, and learns from the channels you move by hand. |
| 🎯 **Custom Feed Filtering** | Clicking any category folder instantly filters `/feed/subscriptions` to display only videos from channels in that folder. |
| ⚡ **Live Feed Filtering** | Filters as YouTube loads more videos, without moving your scroll position. Quiet folders pause loading and offer a **Load more** button. |
| 📺 **In-Sidebar Folder Controls** | Each folder's ⋯ menu renames it, adds channels with a searchable picker (a channel can be in several folders), or deletes it; ✕ removes a channel; the folder icon next to Auto-sort creates a new folder. |
| 🔵 **New-video dots** | The same blue dot YouTube shows for channels with new videos, on each channel and on its folder, so you can see what's new without opening every folder. |
| 🖱️ **Drag & Drop** | Drag channels between folders, or straight from YouTube's own subscription list. Each move teaches Auto-sort. |
| 🏷️ **Folder Chips** | YouTube-style chips above your subscriptions feed (*All · Tech · Gaming …*) filter it in one click. |
| 🎛️ **Popup Manager** | Search channels, move them between folders, rename/delete folders, and configure sorting. |
| 🚫 **Hide Shorts** | Optional toggle in Settings that hides the Shorts shelf and Shorts cards on your subscription feed, applied instantly. |
| 📥 **Backup & Restore** | Export and import timestamped JSON backups (`subshelf_backup_YYYY-MM-DD.json`) with automated API key sanitization. |

---

## 🛡️ Security & Privacy-First Architecture

SubShelf was built from the ground up to adhere strictly to Google Chrome Web Store Developer Program Policies and YouTube Brand Guidelines:

* **No Untrusted HTML Interpolation:** UI is built with `textContent` / `createElement`; `npm run audit:dom` enforces this in CI.
* **Minimal Permissions:** `storage`, `www.youtube.com`, and `offscreen` (runs Chrome's on-device AI in a hidden extension page when you opt in; SubShelf never downloads models). Access to `generativelanguage.googleapis.com` is an *optional* permission that Chrome asks for only when you select the Gemini Cloud option.
* **Zero Remote Code Execution:** 100% locally compiled and bundled via Vite/CRXJS. Zero `eval()`, zero `new Function()`, and zero external CDN script tags.
* **Local Privacy:** SubShelf has no servers, no analytics, and no tracking. Everything stays in your browser. If you choose the optional Gemini Cloud mode, your channel names, handles and short channel descriptions are sent to Google using your own API key.
* **API Key Handling:** Your Gemini API key is sent only in the `x-goog-api-key` header (never in URLs), is read only by the background service worker, is never handed to the code running on YouTube pages, and is excluded from JSON backups.

---

## 🧠 Categorization Engines

You pick the engine in Settings. Every engine falls back to the offline engine, never to the cloud:

```
Offline (default) ─────────────────────────────────► instant, any list size
Offline + on-device AI ──(Nano only for channels Offline can't place; skipped if Chrome has no model)
Gemini Cloud API (opt-in, your key) ──(fails)──────► Offline
```

* **Offline (default):** keyword matching on channel names, handles and descriptions, a built-in list of well-known creators, and what it learns from your manual moves. Instant even for 500+ channels.
* **Offline + on-device AI:** uses Chrome's Gemini Nano only if Chrome already has it installed, and only for channels left in "General & Others". SubShelf never downloads the model; nothing leaves your device.
* **Learning from your corrections:** every channel you move by hand teaches its folder; similar channels follow it, including into folders you created.
* **Gemini Cloud API:** sends channel titles, handles and short descriptions to Google with your own API key (model configurable, default `gemini-3.5-flash-lite`).

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
subshelf-v1.3.1.zip (manifest.json at archive root)
```

### 5. Load into Chrome
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `dist/` directory.
4. Open [YouTube](https://www.youtube.com) and click **Auto-sort** next to SubShelf in the left sidebar!

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
│   │   ├── categorizer.ts     # Orchestrates the engines (offline-first; Nano only for unclear channels)
│   │   ├── heuristic.ts       # Offline keyword scoring & creator list (names, handles, descriptions)
│   │   ├── learning.ts        # Learns folder profiles from your manual corrections
│   │   ├── nano.ts            # Chrome on-device AI helpers (status only; never downloads)
│   │   ├── overrides.ts       # Merges engine output with your manual assignments
│   │   ├── prompt.ts          # Prompt builder with injection-safe channel list
│   │   └── responseSchema.ts  # Constrains AI output to valid folder IDs
│   ├── background/
│   │   ├── migrations.ts      # Schema migrations
│   │   ├── offscreenNano.ts   # Runs on-device AI via an offscreen page when needed
│   │   └── service-worker.ts  # Storage write queue, Auto-sort, permissions
│   ├── config/selectors.ts    # YouTube DOM selectors
│   ├── content/
│   │   ├── sidebar/           # Sidebar UI: header row, folders, ⋯ menu
│   │   ├── channelExtractor.ts # Reads subscriptions from YouTube's sidebar
│   │   ├── feedFilter.ts      # Folder chips & feed filtering, Hide Shorts
│   │   ├── healthMonitor.ts   # Detects YouTube layout changes
│   │   ├── index.ts           # Content script entry point
│   │   ├── injectedMain.ts    # Reads YouTube's own subscription data (page context)
│   │   ├── sidebarManager.ts  # Renders the sidebar; drag & drop; Auto-sort flow
│   │   ├── subscriptionSync.ts # Reports observed subscriptions to the service worker
│   │   └── styles/subdeck.css # Styles built on YouTube's theme tokens
│   ├── offscreen/             # Hidden page that hosts on-device AI
│   ├── popup/                 # Popup: folders, channels, settings
│   ├── types/index.ts         # Data model & storage schema
│   ├── ui/icons.ts            # Shared SVG icon set
│   └── utils/
│       ├── channelIdentity.ts # The one definition of channel IDs, handles and aliases
│       ├── channelDetails.ts  # Channel descriptions from YouTube's subscriptions page
│       ├── feedMatch.ts       # Matches feed cards (UC ID or @handle) to folders
│       ├── storage.ts         # Storage layer; every write serialized in the service worker
│       ├── syncEngine.ts      # Subscription reconciliation with removal safeguards
│       └── …                  # Avatars, backups, permissions, system-channel list, logging
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
