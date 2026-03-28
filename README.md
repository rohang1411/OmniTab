# OmniTab

> Copy all your open tabs as a portable Base64 string and unpack them in any browser — instantly.

100% offline · Zero dependencies · Manifest V3 · Chrome · Firefox · Edge · Arc · Brave

---

## Features

| Feature | Description |
|---|---|
| **Copy as Base64** | Encodes all open tab URLs into a single portable string you can paste anywhere |
| **Copy as Raw URLs** | Copies all tab URLs as plain text, one per line |
| **Open in This Window** | Pastes a Base64 string and opens each URL as a new tab in the current window |
| **Open in New Window** | Pastes a Base64 string and opens all URLs simultaneously in a brand-new window |

---

## How to Use

### Packing tabs (exporting)

1. Open OmniTab by clicking the extension icon in your toolbar
2. The header shows how many tabs are in the current window
3. Click **Copy as Base64** — a compact encoded string is copied to your clipboard
4. Paste it anywhere: a message, a note, an email, a file

> Use **Copy as Raw URLs** if you just want a plain list of links (e.g. to share with someone who doesn't have OmniTab).

### Unpacking tabs (importing)

1. Copy your Base64 string from wherever you saved it
2. Open OmniTab in the target browser
3. Paste the string into the text area
4. Choose how to open the tabs:
   - **Open in This Window** — tabs are added to your current browser window in the background
   - **Open in New Window** — all tabs open simultaneously in a clean new window (best for cross-browser transfers)

### Typical cross-browser workflow

```
1. In Chrome:   OmniTab → Copy as Base64
2. Paste the string into a note / message / clipboard sync tool
3. In Firefox:  OmniTab → Paste string → Open in New Window
```

---

## Installation

### Chrome / Edge / Arc / Brave / Helium

1. Go to `chrome://extensions`
2. Turn on **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `OmniTab/` folder
5. Pin the extension from the puzzle-piece menu

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select the `manifest.json` file inside the `OmniTab/` folder
4. The extension is active until Firefox restarts

> For a persistent install on Firefox, submit to [addons.mozilla.org](https://addons.mozilla.org) or use Firefox Developer Edition with unsigned extension support.

### Safari (macOS)

Requires Xcode installed on macOS.

```bash
xcrun safari-web-extension-converter /path/to/OmniTab/ \
  --project-location ~/Desktop \
  --app-name OmniTab \
  --bundle-identifier com.yourname.omnitab \
  --no-open
```

Open the generated `.xcodeproj`, build it, then enable the extension in **Safari → Settings → Extensions**.

---

## Icons

Add your icon images to an `icons/` folder inside the project:

```
icons/
├── icon16.png
├── icon32.png
├── icon48.png
└── icon128.png
```

Any PNG at those sizes works during development. For the Chrome Web Store, a **128×128 px** icon is required.

---

## Privacy

OmniTab makes **zero network requests**. No data ever leaves your device. All encoding and decoding happens locally using the browser's native `btoa()` / `atob()` functions.

---

## Project Structure

```
OmniTab/
├── manifest.json   — Extension manifest (Manifest V3)
├── popup.html      — UI markup
├── popup.js        — All logic (encoding, clipboard, tab management)
├── styles.css      — Material You dark theme, pure CSS
└── icons/          — Extension icons (add your PNGs here)
```

---

## License

MIT