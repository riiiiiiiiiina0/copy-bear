# Copy Title & URL Chrome Extension

A simple Chrome extension that copies the current tab's title and URL to your clipboard with a single click.

## Features

- 📋 Copy current tab's title and URL to clipboard
- ✔️ Shows success/error feedback on extension icon badge
- ⚡ Works with one click on the extension icon
- 🎯 No popup required - direct action
- 📱 Non-intrusive visual feedback that auto-disappears

## Installation

### Install from Chrome Web Store

_Coming soon..._

### Install Manually (Developer Mode)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" button
5. Select the folder containing this extension
6. The extension icon should appear in your toolbar

## Usage

1. Navigate to any webpage
2. Click the "Copy Title & URL" extension icon in your toolbar
3. The page title and URL will be copied to your clipboard in this format:
   ```
   Page Title
   https://example.com/page-url
   ```
4. You'll see a badge on the extension icon:
   - ✔️ Green badge for successful copy
   - ⚠️ Red badge for errors
   - Badge automatically disappears after 3 seconds

## Permissions

This extension requires the following permissions:

- `activeTab`: To access the current tab's title and URL
- `scripting`: To execute the clipboard copy function
- `action`: To display badge text on the extension icon

## Format

The copied text includes:

- First line: Page title
- Second line: Full URL

Perfect for sharing links, bookmarking, or documentation purposes.

## Development

Built using Chrome Extension Manifest V3 with modern APIs.

## License

MIT License - see LICENSE file for details.
