# QR Code Generator

A minimal Chrome extension that generates QR codes from the current page URL or custom text.

## Features

- Auto-generates QR code from current tab URL
- Custom text/URL input with real-time preview
- History with pin/unpin support (auto-expires after 7 days)
- Download QR code as high-resolution PNG
- Clean, Apple-inspired UI

## Install

### From Source (Development)

1. Clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the project folder

### From Chrome Web Store

*Coming soon*

## Project Structure

```
├── manifest.json       Extension manifest (MV3)
├── popup.html          Popup HTML
├── js/
│   └── popup.js        Main application logic
├── css/
│   └── popup.css       Styles (CSS variables for easy theming)
├── lib/
│   └── qrcode.min.js   QR code generation library
└── icons/              Extension icons (16/48/128px)
```

## Architecture

The codebase uses a modular IIFE pattern with clear separation of concerns:

| Module    | Responsibility                          |
|-----------|-----------------------------------------|
| `Config`  | Centralized constants and magic numbers |
| `Toast`   | Lightweight notification system         |
| `Storage` | chrome.storage.local Promise wrapper    |
| `QR`      | QR code rendering & download            |
| `History` | Record CRUD with expiry & sorting       |
| `UI`      | DOM manipulation & event delegation     |
| `App`     | Entry point, wires modules together     |

### Adding a feature

1. Add config constants to `Config`
2. Create a new module object following the existing pattern
3. Wire it in `App.init()` and `App._bindEvents()`

## Tech Stack

- **Chrome Extension Manifest V3**
- [qrcode-generator](https://github.com/nicennnnnnnlee/qrcode-generator) for QR encoding
- Vanilla HTML/CSS/JS (no build step required)

## License

[MIT](LICENSE)
