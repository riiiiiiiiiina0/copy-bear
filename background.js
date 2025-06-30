/**
 * @fileoverview Background service worker for Copy Title & URL extension
 * Handles single, double, and triple-click functionality to copy page titles and URLs
 * in different formats (plain text, markdown, or title-only).
 */

/**
 * Counter to track the number of clicks on the extension action button
 * @type {number}
 */
let clickCount = 0;

/**
 * Timer reference for detecting multiple clicks
 * @type {number}
 */
let clickTimer = 0;

/**
 * Maximum delay in milliseconds to wait for additional clicks
 * @type {number}
 * @constant
 */
const MULTI_CLICK_DELAY = 400; // milliseconds

/**
 * Default format configurations - used as fallback when storage fails
 * @type {Object}
 * @constant
 */
const FALLBACK_FORMATS = {
  singleClickFormat: '<title>\n<url>',
  doubleClickFormat: '[<title>](<url>)',
  tripleClickFormat: '<title>',
};

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
 * Copies page title and URL using the user's custom format specified by formatKey.
 *
 * @param {chrome.tabs.Tab} tab - The active tab object containing title and URL.
 * @param {string} formatKey - The key for the desired format in storage (e.g., 'singleClickFormat', 'doubleClickFormat', 'tripleClickFormat').
 * @returns {Promise<void>} Promise that resolves when the copy operation is complete.
 * @description Gets the user's format from storage using formatKey, applies it to the current tab's title and URL, and copies the result to the clipboard.
 */
async function copyClickFormat(tab, formatKey) {
  const title = tab.title;
  const url = tab.url;

  try {
    const result = await chrome.storage.sync.get(FALLBACK_FORMATS);
    const format = result[formatKey] || '';
    const textToCopy = format
      .replaceAll('<title>', title)
      .replaceAll('<url>', url);

    if (tab.id) {
      await copyToClipboard(tab.id, textToCopy);
    }
  } catch (error) {
    console.error(`Error getting ${formatKey} format:`, error);
  }
}

/**
 * Copies page title and URL using the user's custom single-click format
 * @param {chrome.tabs.Tab} tab - The active tab object containing title and URL
 * @returns {Promise<void>} Promise that resolves when copy operation is complete
 * @description Gets user's single-click format from storage and applies it
 */
async function copySingleClickFormat(tab) {
  copyClickFormat(tab, 'singleClickFormat');
}

/**
 * Copies page title and URL using the user's custom double-click format
 * @param {chrome.tabs.Tab} tab - The active tab object containing title and URL
 * @returns {Promise<void>} Promise that resolves when copy operation is complete
 * @description Gets user's double-click format from storage and applies it
 */
async function copyDoubleClickFormat(tab) {
  copyClickFormat(tab, 'doubleClickFormat');
}

/**
 * Copies page title and URL using the user's custom triple-click format
 * @param {chrome.tabs.Tab} tab - The active tab object containing title and URL
 * @returns {Promise<void>} Promise that resolves when copy operation is complete
 * @description Gets user's triple-click format from storage and applies it
 */
async function copyTripleClickFormat(tab) {
  copyClickFormat(tab, 'tripleClickFormat');
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
 * Registers a click handler with a delay, resetting clickCount after execution.
 * @param {(tab: chrome.tabs.Tab) => Promise<void>} fn - The function to execute, accepting a tab parameter.
 * @param {chrome.tabs.Tab} tab - The tab object to pass to the handler function.
 * @param {number} [delay=0] - The delay in milliseconds before executing the function.
 */
const registerClick = (fn, tab, delay = 0) => {
  clickTimer = setTimeout(async () => {
    await fn(tab);
    clickCount = 0;
  }, delay);
};

/**
 * Event listener for extension action button clicks
 * Handles single, double, and triple-click detection to trigger different copy formats
 * @param {chrome.tabs.Tab} tab - The active tab when the action button was clicked
 * @description
 * - Single click: Copies plain text format (title\nurl)
 * - Double click: Copies markdown format ([title](url))
 * - Triple click: Copies title only format
 * Uses a timer-based approach to distinguish between single, double, and triple clicks
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  clickCount++;

  // Clear the timer but don't execute yet - wait for potential double or triple click
  clearTimeout(clickTimer);

  if (clickCount === 1) {
    registerClick(copySingleClickFormat, tab, MULTI_CLICK_DELAY);
  } else if (clickCount === 2) {
    registerClick(copyDoubleClickFormat, tab, MULTI_CLICK_DELAY);
  } else if (clickCount === 3) {
    registerClick(copyTripleClickFormat, tab, 0);
  } else {
    // More than 3 clicks - reset counter
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
