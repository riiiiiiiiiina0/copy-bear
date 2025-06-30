/**
 * @fileoverview Background service worker for Copy Title & URL extension
 * Handles single and double-click functionality to copy page titles and URLs
 * in different formats (plain text or markdown).
 */

/**
 * Counter to track the number of clicks on the extension action button
 * @type {number}
 */
let clickCount = 0;

/**
 * Timer reference for detecting double clicks
 * @type {number|null}
 */
let clickTimer = null;

/**
 * Maximum delay in milliseconds to wait for a second click
 * @type {number}
 * @constant
 */
const DOUBLE_CLICK_DELAY = 300; // milliseconds

/**
 * Shows a badge on the extension icon with specified text and color
 * @param {string} text - The text to display on the badge
 * @param {boolean} [isError=false] - Whether this is an error state (affects color)
 * @description Displays badge text for 3 seconds then clears it. Uses green for success, red for errors.
 */
function showBadgeText(text, isError = false) {
  // Set badge text
  chrome.action.setBadgeText({ text: text });

  // Set badge background color (green for success, red for error)
  chrome.action.setBadgeBackgroundColor({
    color: isError ? '#ff4444' : '#4CAF50',
  });

  // Clear badge after 3 seconds
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 3000);
}

/**
 * Copies page title and URL in plain text format (title on first line, URL on second line)
 * @param {chrome.tabs.Tab} tab - The active tab object containing title and URL
 * @returns {Promise<void>} Promise that resolves when copy operation is complete
 * @description Formats text as "Title\nURL" and calls copyToClipboard
 */
async function copyPlainFormat(tab) {
  const title = tab.title;
  const url = tab.url;
  const textToCopy = `${title}\n${url}`;

  if (tab.id) {
    await copyToClipboard(tab.id, textToCopy);
  }
}

/**
 * Copies page title and URL in markdown link format
 * @param {chrome.tabs.Tab} tab - The active tab object containing title and URL
 * @returns {Promise<void>} Promise that resolves when copy operation is complete
 * @description Formats text as "[Title](URL)" markdown link and calls copyToClipboard
 */
async function copyMarkdownFormat(tab) {
  const title = tab.title;
  const url = tab.url;
  const textToCopy = `[${title}](${url})`;

  if (tab.id) {
    await copyToClipboard(tab.id, textToCopy);
  }
}

/**
 * Copies specified text to clipboard using the most compatible method available
 * @param {number} tabId - The ID of the tab to execute the script in
 * @param {string} textToCopy - The text content to copy to clipboard
 * @returns {Promise<void>} Promise that resolves when copy operation is complete
 * @description First tries navigator.clipboard.writeText, falls back to document.execCommand if needed
 */
async function copyToClipboard(tabId, textToCopy) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      args: [textToCopy],
      func: (text) => {
        // try to use navigator.clipboard.writeText first
        navigator.clipboard.writeText(text).then(
          () => {
            // Send message to background script for success
            chrome.runtime.sendMessage({ action: 'copySuccess' });
          },
          (err) => {
            // might encounter error: Failed to execute 'writeText' on 'Clipboard': Document is not focused.
            // fallback to use hidden textarea
            const textArea = document.createElement('textarea');
            textArea.value = text;
            // Avoid scrolling to bottom
            textArea.style.position = 'fixed';
            textArea.style.top = `0px`;
            textArea.style.left = `0px`;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
              document.execCommand('copy');
              // Send message to background script for success
              chrome.runtime.sendMessage({ action: 'copySuccess' });
            } catch (err) {
              // Send message to background script for error
              chrome.runtime.sendMessage({ action: 'copyError' });
            }
            document.body.removeChild(textArea);
          },
        );
      },
    });
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    showBadgeText('Error', true);
  }
}

/**
 * Event listener for extension action button clicks
 * Handles both single and double-click detection to trigger different copy formats
 * @param {chrome.tabs.Tab} tab - The active tab when the action button was clicked
 * @description
 * - Single click: Copies plain text format (title\nurl)
 * - Double click: Copies markdown format ([title](url))
 * Uses a timer-based approach to distinguish between single and double clicks
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  clickCount++;

  if (clickCount === 1) {
    // Start timer for detecting double click
    clickTimer = setTimeout(async () => {
      // Single click detected - copy plain format
      await copyPlainFormat(tab);
      clickCount = 0;
    }, DOUBLE_CLICK_DELAY);
  } else if (clickCount === 2) {
    // Double click detected - copy markdown format
    if (clickTimer) {
      clearTimeout(clickTimer);
    }
    await copyMarkdownFormat(tab);
    clickCount = 0;
  }
});

/**
 * Event listener for runtime messages from content scripts
 * Handles success and error messages from clipboard operations
 * @param {Object} message - Message object containing action type
 * @param {string} message.action - The action type ('copySuccess' or 'copyError')
 * @param {chrome.runtime.MessageSender} sender - Information about the sender
 * @param {function} sendResponse - Function to send response back to sender
 * @description Shows appropriate badge text based on copy operation result
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'copySuccess') {
    showBadgeText('✔️');
  } else if (message.action === 'copyError') {
    showBadgeText('⚠️', true);
  }
});
