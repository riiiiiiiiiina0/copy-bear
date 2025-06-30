# Copy Title & URL Chrome Extension

A simple Chrome extension that copies the current tab's title and URL to your clipboard with single or double clicks in different formats.

<a href="https://buymeacoffee.com/riiiiiiiiiina" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Features

- 📋 **Single Click**: Copy title and URL in plain text format
- 🔗 **Double Click**: Copy title and URL as markdown link
- ✔️ Shows success/error feedback on extension icon badge
- ⚡ Works directly from the extension icon - no popup required
- 🎯 Smart click detection with 300ms double-click window
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

### Single Click (Plain Text Format)

1. Navigate to any webpage
2. **Single click** the "Copy Title & URL" extension icon in your toolbar
3. The page title and URL will be copied in plain text format:
   ```
   Page Title
   https://example.com/page-url
   ```

### Double Click (Markdown Link Format)

1. Navigate to any webpage
2. **Double click** the "Copy Title & URL" extension icon in your toolbar
3. The page title and URL will be copied as a markdown link:
   ```
   [Page Title](https://example.com/page-url)
   ```

### Visual Feedback

- ✔️ Green badge appears for successful copy operations
- ⚠️ Red badge appears for errors
- Badge automatically disappears after 3 seconds

## Permissions

This extension requires the following permissions:

- `activeTab`: To access the current tab's title and URL
- `scripting`: To execute the clipboard copy function
- `action`: To display badge text on the extension icon

## Output Formats

### Plain Text Format (Single Click)

```
Page Title
https://example.com/page-url
```

Perfect for sharing links, plain text documentation, or general copying needs.

### Markdown Link Format (Double Click)

```
[Page Title](https://example.com/page-url)
```

Perfect for markdown documents, GitHub issues/PRs, documentation, or any markdown-compatible platform.

## Click Detection

The extension uses intelligent click detection:

- **300ms window** to distinguish between single and double clicks
- Single clicks are processed after the double-click window expires
- Double clicks immediately trigger markdown format copying
- Reliable detection works consistently across different system configurations

## Development

Built using Chrome Extension Manifest V3 with modern APIs:

- Service worker background script
- Chrome Actions API for icon interactions
- Chrome Scripting API for clipboard access
- Fallback clipboard methods for maximum compatibility

## License

MIT License - see LICENSE file for details.
