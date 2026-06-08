<div align="center">

![QR Code Generator](icons/icon128.png)

# QR Code Generator

Chrome Extension — Generate & Decode QR Codes Instantly

[![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest_V3-green?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.1.0-brightgreen.svg)](manifest.json)

### 👉 [Install on Chrome](https://chromewebstore.google.com/detail/qr-code-generator/gphnfpfmpfkgnpmhpgojhaojmlebojcn)

**English** · [中文](README.md)

</div>

---

## Features

- 📱 **Instant QR Code** — Auto-generate from the current tab URL
- ✏️ **Custom Text** — Input any text or URL with real-time QR preview
- 📋 **Context Menu** — Right-click selected text to generate QR; right-click an image to decode its QR
- 📥 **HD Download** — Export 4x resolution PNG images
- 📌 **History** — Auto-save records with pin/unpin support; unpinned items expire after 7 days
- 🌙 **Dark Mode** — Light / Dark / System-auto theme switching
- 🎨 **Apple-inspired UI** — Clean, modern interface design
- ⚡ **Zero Build** — Pure HTML / CSS / JS, no bundler required

## Install

### From Source (Development)

1. Clone this repo
   ```bash
   git clone https://github.com/nil-pointer-panic/qrcode-dev.git
   ```
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the project folder

## Usage

### Generate QR Code

- Click the toolbar icon to auto-generate a QR code from the current page URL
- Edit the text in the input field — the QR code updates in real time
- Click the download button to save a high-resolution PNG

### Context Menu

- **Select text → Right-click → "Generate QR Code for selected text"**: Opens a new tab with the QR code, available to download or copy
- **Right-click an image → "Decode QR Code from image"**: Recognizes and displays the QR code content in a new tab

### History Management

- Generated QR codes are automatically saved to history
- Click a history entry to quickly restore it
- Pin frequently used entries; unpinned items auto-expire after 7 days

## Project Structure

```
├── manifest.json        Extension manifest (MV3)
├── background.js        Service Worker — context menu registration
├── popup.html           Main popup page
├── result.html          Context menu result page
├── css/
│   ├── popup.css        Popup styles (CSS custom property theming)
│   └── result.css       Result page styles
├── js/
│   ├── popup.js         Popup logic (modular IIFE)
│   └── result.js        Result page logic (encode/decode)
├── lib/
│   ├── qrcode.min.js    QR encoding library
│   └── jsqr.js          QR decoding library
└── icons/               Extension icons (16 / 48 / 128px)
```

## Tech Stack

| Tech | Description |
|------|-------------|
| Chrome Extension MV3 | Uses Service Worker instead of background page |
| [qrcode-generator](https://github.com/nicennnnnnnlee/qrcode-generator) | QR code encoding |
| [jsQR](https://github.com/cozmo/jsQR) | QR code decoding |
| Vanilla HTML / CSS / JS | No framework, no build step |

## Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` | Read the current tab URL to generate QR code |
| `storage` | Persist history records and theme preference |
| `contextMenus` | Register context menu items |

## Contributing

1. Fork this repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'feat: add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE) © 2026
