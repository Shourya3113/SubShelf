# Changelog

## 1.3.3 — 2026-11-07

### Folders per YouTube account
- Each YouTube account now has its own folders, channels and corrections. Switching accounts no longer mixes their subscriptions into one set of folders.
- Updating keeps your sorting whichever account you open first. The first account keeps everything, and any other account starts from the same folders and gets its channels back where they were. If your folders were already mixed, the first account clears out the other account's channels once it has read its full subscription list. With a very long list YouTube doesn't show everything at once, so a few can stay until you remove them.
- The popup shows the account in the YouTube tab you opened it from, or the one you used last, and says which when you have more than one.
- Settings and your Gemini key are shared by all accounts. SubShelf stores a hash of YouTube's account ID, never the ID itself.

### Import
- Importing a backup now tells you what will happen first, then asks: **Merge** ("Adds 4 folders, combines 2, 37 new channels") or **Replace**, which lists the folders you'd lose and saves your current ones to a file first.
- After an import, a short summary confirms what happened.
- Folders with the same name now combine, so importing someone's setup doesn't give you two "Gaming" folders.

### Sorting
- **Report wrong folders** (Settings → Advanced) turns the channels you moved by hand into a GitHub issue, so the offline sorter can learn from real mistakes. You read the exact text first, and nothing is sent unless you submit it on GitHub.
- Auto-sort now says how many channels it placed and how many stayed in General & Others.

## 1.3.2 — 2026-10-29

### Subscriptions feed with a folder selected
- The folder chip bar no longer lets thumbnails show over or around it while you scroll, and a video you hover no longer covers it.
- YouTube's grey placeholder cards no longer sit next to your folder's videos while more are loading, which looked like videos that would never load. The chip bar says "looking for more…" instead.
- Each folder chip gets the blue new-videos dot when that folder has new videos.

### Folders
- Reorder your folders: drag a folder by its name, or use its ⋯ menu → Move up / Move down. Auto-sort keeps your order.
- Hold Ctrl (⌘ on Mac) while dragging a channel onto a folder to add it there too; a normal drag still moves it.
- The New folder and Rename forms give the name box its own row, so there is room to type.

## 1.3.1 — 2026-10-29

### New videos
- Channels with new videos get YouTube's blue dot in your folders, and a folder gets a dot when any of its channels has one, so you can spot what's new without expanding every folder. The dot comes from what YouTube already shows in its own subscription list, and clears when you open the channel.

### Offline sorting
- A channel with "home" or "house" in its name is no longer sent to Food & Lifestyle for that alone. Homelab channels such as "ServersatHome" now go to Tech & Coding, and gaming channels such as "DefendTheHouse" no longer land in Food & Lifestyle. Real home channels still match through phrases like "home decor", "home cooking" and "house tour".
- Homelab and self-hosting words (servers, homelab, self-hosted, NAS, TrueNAS, Unraid, Proxmox) now count towards Tech & Coding.

### Folders
- Hovering a channel in the sidebar now mentions that you can add it to a second folder with that folder's ⋯ → Add channel. Dragging still moves it.

## 1.3.0 — 2026-10-14

### Unsubscribes now update your folders
- Unsubscribing from a channel removes it from your folders right away, wherever you unsubscribe: under a video, on the channel's page, in search or on YouTube's All subscriptions page. (YouTube had changed how it reports unsubscribes, so SubShelf missed them.)
- Resubscribing within 30 days, or pressing YouTube's Undo, puts the channel back in the folder it was in.
- Channels you unsubscribe from on another device or in the YouTube app are removed within a few hours, using YouTube's All subscriptions list. Several at once is fine; a list that would remove more than half your channels is still ignored as an error.
- A YouTube tab you opened earlier can no longer bring back a channel you unsubscribed from in another tab.

### New subscriptions
- A channel you subscribe to is added within seconds, with its description, and sorted into a folder (using your own corrections first). SubShelf no longer expands YouTube's "Show more" list to find it.

### Folders
- Removing a channel in the popup now takes it out of all folders and keeps it out of Auto-sort until you place it again. (It used to come straight back, because you are still subscribed.) Choosing "No folder" works the same way.

### Auto-sort
- The Auto-sort button now keeps showing "Finding channels…", "Reading channels…" and "Sorting…" until sorting is done. It used to switch back to "Auto-sort" partway through whenever the sidebar refreshed, so it looked like nothing was happening, and a second click could start another sort.

### Gemini Cloud
- The default Gemini Cloud model is now `gemini-3.5-flash-lite`. Google no longer offers `gemini-2.5-flash` to new API keys, so with the old default new users got an error and Auto-sort quietly fell back to the offline engine. If you never changed the model, SubShelf switches automatically; a model you typed yourself is kept.
- Gemini Cloud sorts in batches of 40 channels, three at a time, and waits up to 60 seconds for each. It used to send every channel in one request and give up after 25 seconds, which often wasn't enough, so Auto-sort fell back to the offline engine.

### Rating
- The popup footer has a "Rate SubShelf" link to the store's reviews page.
- A one-time "Enjoying SubShelf?" card appears in the sidebar a week after you first have folders. "Not now" hides it for a month; a second "Not now" or rating hides it for good. It tracks no usage.

## 1.2.1 — 2026-10-13

### A new icon
- SubShelf has a new icon: a folder with shelf rows, in its own colors. The previous icon looked too much like YouTube's logo.
- The icon now follows Chrome's icon guidelines and stays clear at toolbar size in light and dark themes.

No other changes since 1.2.0.

## 1.2.0 — 2026-10-13

A reliability, privacy and design release. Folders you already have are kept.

### Your data is safer
- Sync can no longer wipe channels or folders when YouTube shows only part of your subscription list. A channel is removed only after it's missing from several complete checks, and a check that would remove many channels at once is ignored.
- Edits from the sidebar, the popup and background sync can no longer overwrite each other.
- Imported backups are cleaned up (duplicates and YouTube's own topic channels are dropped).
- Your own channel is no longer stored as a subscription, and real channels such as T-Series, the official YouTube channel, "HISTORY" or "News" are no longer hidden.

### Sorting is faster and smarter
- Auto-sort (formerly Auto-AI) runs offline by default and is instant even with 500+ subscriptions.
- It now reads each channel's description, not just its name (about 75% correct on our public test set, up from 68%).
- It learns from you: every channel you move or drag teaches its folder, and similar channels follow, including into folders you created.
- Optional on-device AI is used only if Chrome already has it, and only for channels the offline engine can't place. SubShelf never downloads AI models.
- Gemini Cloud (optional, your own key) now returns only valid folders and asks for its permission only when you select it.
- Every Auto-sort ends with a summary of what it did.

### A YouTube-native look
- Folder chips above your Subscriptions feed ("All · Tech · Gaming …").
- Drag and drop channels between folders, or straight from YouTube's own subscription list.
- YouTube-style icons, a ⋯ menu per folder, and a searchable channel picker.
- A compact sidebar header, a redesigned popup, and a short first-run guide.
- "Hide Shorts" now works.

### Fixes
- Clicking a folder from any YouTube page now opens your filtered Subscriptions feed.
- Small folders no longer make the feed flash or load endlessly.
- Clearer message when the extension was updated while a YouTube tab was open.

### Permissions
- Runs only on `www.youtube.com` (not YouTube Music, Studio or mobile).
- Google's Gemini API is an optional permission, requested only if you choose the Cloud engine.
- New: `offscreen`, used only to run Chrome's on-device AI when you opt in to it.
