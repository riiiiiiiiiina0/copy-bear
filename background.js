/**
 * @fileoverview Background service worker for Copy Title & URL extension
 * Handles single, double, and triple-click functionality to either copy page titles and URLs
 * to clipboard or open URLs with different formats based on user configuration.
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
const MULTI_CLICK_DELAY = 500; // milliseconds

/**
 * Default format configurations - used as fallback when storage fails
 * @type {Object}
 * @constant
 */
const FALLBACK_FORMATS = {
  // Copy action formats
  singleClickCopyFormat: '<title>\n<url>',
  doubleClickCopyFormat: '[<title>](<url>)',
  tripleClickCopyFormat: '<title>',
  // Open URL action formats
  singleClickOpenFormat: 'https://chatgpt.com?q=<title>',
  doubleClickOpenFormat: 'https://chatgpt.com?q=<title>',
  tripleClickOpenFormat: 'https://chatgpt.com?q=<title>',
  // Action types
  singleClickAction: 'copy',
  doubleClickAction: 'copy',
  tripleClickAction: 'copy',
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
 * Opens a URL. If http/https, opens in a new tab. Otherwise, opens a confirmation popup.
 * @param {string} url - The URL to open
 * @returns {Promise<void>} Promise that resolves when the URL is opened or popup is triggered
 * @description Checks URL scheme. For http/https, opens in new tab. For custom schemes,
 *              stores URL and opens a confirmation popup.
 */
async function openUrl(url) {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await chrome.tabs.create({ url: url });
      showBadgeText('🔗');
    } else {
      // Custom protocol detected
      await chrome.storage.local.set({ customProtocolUrl: url });
      // Ensure popup.html is set as the action popup
      // This might be redundant if default_popup is set in manifest,
      // but ensures programmatic opening works as intended.
      // await chrome.action.setPopup({ popup: 'popup.html' }); // Temporarily removed, will rely on manifest
      await chrome.action.openPopup();
      // Badge will be shown by the popup logic if needed, or we can show a generic one here
      showBadgeText('❓'); // Indicate a prompt will follow
    }
  } catch (error) {
    console.error('Failed to open URL or popup:', error);
    showBadgeText('⚠️', true);
  }
}

/**
 * Performs the action (copy or open URL) using the user's custom format and action specified by keys.
 *
 * @param {chrome.tabs.Tab} tab - The active tab object containing title and URL.
 * @param {string} clickType - The click type ('single', 'double', 'triple').
 * @param {string} actionKey - The key for the desired action in storage (e.g., 'singleClickAction', 'doubleClickAction', 'tripleClickAction').
 * @returns {Promise<void>} Promise that resolves when the operation is complete.
 * @description Gets the user's format and action from storage, applies the format to the current tab's title and URL, and performs the specified action.
 */
async function performClickAction(tab, clickType, actionKey) {
  const title = tab.title || '';
  const url = tab.url || '';

  try {
    const result = await chrome.storage.sync.get(FALLBACK_FORMATS);
    const action = result[actionKey] || 'copy';

    // Determine which format to use based on the action type
    const formatKey =
      action === 'open'
        ? `${clickType}ClickOpenFormat`
        : `${clickType}ClickCopyFormat`;
    const format = result[formatKey] || FALLBACK_FORMATS[formatKey] || '';

    // Apply different replacements based on action type
    let formattedText;
    if (action === 'open') {
      // For open action, URL encode the title to handle special characters
      formattedText = format
        .replaceAll('<title>', encodeURIComponent(title))
        .replaceAll('<url>', encodeURIComponent(url));
    } else {
      // For copy action, use plain text
      formattedText = format
        .replaceAll('<title>', title || '')
        .replaceAll('<url>', url || '');
    }

    if (action === 'open') {
      // For open action, treat the formatted text as a URL
      await openUrl(formattedText);
    } else {
      // Default to copy action
      if (tab.id) {
        await copyToClipboard(tab.id, formattedText);
      }
    }
  } catch (error) {
    console.error(`Error performing ${actionKey} action:`, error);
  }
}

/**
 * Performs single-click action using the user's custom single-click format and action
 * @param {chrome.tabs.Tab} tab - The active tab object containing title and URL
 * @returns {Promise<void>} Promise that resolves when operation is complete
 * @description Gets user's single-click format and action from storage and applies it
 */
async function performSingleClickAction(tab) {
  performClickAction(tab, 'single', 'singleClickAction');
}

/**
 * Performs double-click action using the user's custom double-click format and action
 * @param {chrome.tabs.Tab} tab - The active tab object containing title and URL
 * @returns {Promise<void>} Promise that resolves when operation is complete
 * @description Gets user's double-click format and action from storage and applies it
 */
async function performDoubleClickAction(tab) {
  performClickAction(tab, 'double', 'doubleClickAction');
}

/**
 * Performs triple-click action using the user's custom triple-click format and action
 * @param {chrome.tabs.Tab} tab - The active tab object containing title and URL
 * @returns {Promise<void>} Promise that resolves when operation is complete
 * @description Gets user's triple-click format and action from storage and applies it
 */
async function performTripleClickAction(tab) {
  performClickAction(tab, 'triple', 'tripleClickAction');
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
 * Handles single, double, and triple-click detection to trigger different actions
 * @param {chrome.tabs.Tab} tab - The active tab when the action button was clicked
 * @description
 * - Single click: Performs user-configured action with single-click format
 * - Double click: Performs user-configured action with double-click format
 * - Triple click: Performs user-configured action with triple-click format
 * Actions can be either copying to clipboard or opening a URL based on user configuration.
 * Uses a timer-based approach to distinguish between single, double, and triple clicks
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  clickCount++;

  // Clear the timer but don't execute yet - wait for potential double or triple click
  clearTimeout(clickTimer);

  if (clickCount === 1) {
    registerClick(performSingleClickAction, tab, MULTI_CLICK_DELAY);
  } else if (clickCount === 2) {
    registerClick(performDoubleClickAction, tab, MULTI_CLICK_DELAY);
  } else if (clickCount === 3) {
    registerClick(performTripleClickAction, tab, 0);
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
