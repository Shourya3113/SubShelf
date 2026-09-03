# SubDeck ⚡
> **Smart Subscription Folders for YouTube™**

SubDeck is a privacy-first Manifest V3 Chrome Extension that brings structured folders to YouTube's subscription ecosystem with AI-powered auto-categorization and feed filtering.

---

## ✨ Features

- 📁 **Native Sidebar Folders:** Collapsible category decks injected directly into YouTube's native sidebar.
- 🤖 **AI Auto-Categorization:** One-click clustering of all subscribed channels using on-device AI (Gemini Nano) or cloud LLM fallbacks.
- 🎯 **Feed Filtering:** Filter `/feed/subscriptions` to display only videos from channels in the selected deck.
- 🔄 **Live Sync:** Detects new subscriptions in real time and routes them to an Uncategorized deck.
- 🔒 **Privacy-First:** Zero OAuth required, zero external quotas. All channel data stays locally in `chrome.storage.local`.

---

## 🛠️ Tech Stack

- **Target:** Chrome Manifest V3 (MV3)
- **Language:** TypeScript 5 (Strict Mode)
- **Bundler:** Vite 5 + `@crxjs/vite-plugin`
- **Storage:** `chrome.storage.local`
- **AI Inference:** Chrome Built-in Prompt API (`ai.languageModel`) / Cloud APIs

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
```bash
npm run dev
```

### 3. Production Build
```bash
npm run build
```

### 4. Load into Chrome
1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `dist/` directory.

---

## 📖 Blueprint & Documentation

For the complete architectural specification and 6-day build sprint plan, see:
- [`SUBDECK_BLUEPRINT.md`](./SUBDECK_BLUEPRINT.md)
- [`SUBDECK_BLUEPRINT.pdf`](./SUBDECK_BLUEPRINT.pdf)

---

## 📄 License

[Source-Available License](./LICENSE) © 2026 Shourya Solanki. All Rights Reserved. Open for community contributions, issue reporting, and review. Commercial redistribution or republishing to extension stores is strictly prohibited without prior written permission.

---

*Disclaimer: SubDeck is an independent open-source project and is not affiliated with, sponsored by, or endorsed by Google LLC or YouTube. YouTube™ is a trademark of Google LLC.*
