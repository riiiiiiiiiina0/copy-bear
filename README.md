# Copy Title & URL Chrome Extension

A powerful Chrome extension that copies the current tab's title and URL to your clipboard or opens URLs with single, double, or triple clicks in customizable formats.

<a href="https://buymeacoffee.com/riiiiiiiiiina" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Features

- 📋 **Multiple Click Actions**: Single, double, and triple-click support
- 🎨 **Fully Customizable**: Configure formats and actions for each click type
- 📝 **Dual Action Types**: Copy to clipboard OR open URL in new tab
- 🔧 **Custom Templates**: Use variables like `<title>` and `<url>` in your formats
- ⚙️ **Options Page**: Easy-to-use settings interface for complete customization
- ✔️ Shows success/error feedback on extension icon badge
- ⚡ Works directly from the extension icon - no popup required
- 🎯 Smart click detection with 500ms multi-click window
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

### Default Behavior (Out of the Box)

- **Single Click**: Copy title and URL in plain text format
- **Double Click**: Copy title and URL as markdown link
- **Triple Click**: Copy just the page title

### Customizing Actions and Formats

1. Right-click the extension icon and select "Options" (or go to `chrome://extensions/` and click "Options" for this extension)
2. Configure each click type with:
   - **Action Type**: Choose between "Copy to Clipboard" or "Open URL"
   - **Format Template**: Customize using available variables
3. Click "Save Settings" to apply your changes

### Available Variables

Use these variables in your custom format templates:

- `<title>` - The page title
- `<url>` - The page URL

### Action Types

#### Copy to Clipboard

Copies the formatted text to your clipboard for pasting elsewhere.

#### Open URL

Opens the formatted text as a URL in a new tab. Perfect for:

- URL shorteners
- Search engines (e.g., `https://google.com/search?q=<title>`)
- AI tools (e.g., `https://chatgpt.com?q=Summarize <url>`)
- Social sharing

### Example Custom Formats

#### For Copy Actions:

- **Plain text**: `<title>\n<url>`
- **Markdown link**: `[<title>](<url>)`
- **HTML link**: `<a href="<url>"><title></a>`
- **Title only**: `<title>`
- **Citation format**: `<title>. Retrieved from <url>`

#### For Open URL Actions:

- **Search title in Google**: `https://google.com/search?q=<title>`
- **Summarize with ChatGPT**: `https://chatgpt.com?q=Summarize this: <url>`
- **Share on Twitter**: `https://twitter.com/intent/tweet?text=<title>&url=<url>`
- **Save to Pocket**: `https://getpocket.com/save?url=<url>`

### Visual Feedback

- ✔️ Green badge appears for successful operations
- 🔗 Link icon for successful URL opening
- ⚠️ Red badge appears for errors
- Badge automatically disappears after 3 seconds

## Permissions

This extension requires the following permissions:

- `activeTab`: To access the current tab's title and URL
- `scripting`: To execute the clipboard copy function
- `clipboardWrite`: To write content to the clipboard
- `storage`: To save your custom format preferences
- `action`: To display badge text on the extension icon

## Default Output Formats

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

### Title Only Format (Triple Click)

```
Page Title
```

Perfect when you only need the page title for references or notes.

## Click Detection

The extension uses intelligent click detection:

- **500ms window** to distinguish between single, double, and triple clicks
- Single clicks are processed after the multi-click window expires
- Double and triple clicks immediately trigger their respective actions
- Reliable detection works consistently across different system configurations

## Configuration

### Accessing Options

1. **Right-click method**: Right-click the extension icon → select "Options"
2. **Extensions page method**: Go to `chrome://extensions/` → find "Copy Title & URL" → click "Options"

### Settings Interface

The options page provides:

- **Visual table layout** for easy configuration
- **Real-time format switching** when changing action types
- **Helpful variable documentation** and action type explanations
- **Save/Reset functionality** with status feedback
- **Responsive design** that works on all screen sizes

### Settings Persistence

- All settings are saved to Chrome's sync storage
- Settings sync across your Chrome profile on different devices
- Automatic fallback to defaults if settings become corrupted

## Development

Built using Chrome Extension Manifest V3 with modern APIs:

- Service worker background script
- Chrome Actions API for icon interactions
- Chrome Scripting API for clipboard access
- Chrome Storage API for settings persistence
- Fallback clipboard methods for maximum compatibility
- Comprehensive options page with real-time updates

## License

MIT License - see LICENSE file for details.
