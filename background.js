/**
 * @fileoverview Background service worker for Copy Title & URL extension
 * Handles single, double, and triple-click functionality to either copy page titles and URLs
 * to clipboard or open URLs with different formats based on user configuration.
 * Actions are automatically determined by the format template.
 */

/**
 * Predefined format options, used for looking up names for the action button title.
 * This should be kept in sync with the `PREDEFINED_FORMATS` in `options.js`.
 * @type {Object<string, {name: string, value: string}>}
 * @constant
 */
const ACTION_DESCRIPTIONS = {
  do_nothing: { name: 'Do nothing', value: 'do_nothing' },
  title_url_2_lines: {
    name: 'Title and url (2 lines)',
    value: '<title>\\n<url>',
  },
  title_url_1_line: {
    name: 'Title and url (1 line)',
    value: '<title> - <url>',
  },
  markdown: { name: 'Markdown', value: '[<title>](<url>)' },
  screenshot: { name: 'Screenshot', value: '<screenshot>' },
  custom: { name: 'Custom format', value: '' }, // Note: 'value' is not used here, but kept for structure consistency
};

/**
 * Default format configurations (refers to keys in PREDEFINED_FORMATS)
 * @type {Object<string, string>}
 * @constant
 */
const DEFAULT_FORMAT_TYPES = {
  singleClickFormatType: 'title_url_2_lines',
  doubleClickFormatType: 'markdown',
  tripleClickFormatType: 'title_url_1_line',
  fourthClickFormatType: 'do_nothing',
  fifthClickFormatType: 'do_nothing',
};

/**
 * Updates the action button's title based on the currently configured formats.
 */
async function updateActionButtonTitle() {
  try {
    const items = await chrome.storage.sync.get({
      singleClickFormatType: DEFAULT_FORMAT_TYPES.singleClickFormatType,
      doubleClickFormatType: DEFAULT_FORMAT_TYPES.doubleClickFormatType,
      tripleClickFormatType: DEFAULT_FORMAT_TYPES.tripleClickFormatType,
    });

    const single =
      ACTION_DESCRIPTIONS[items.singleClickFormatType]?.name || 'Unknown';
    const double =
      ACTION_DESCRIPTIONS[items.doubleClickFormatType]?.name || 'Unknown';
    const triple =
      ACTION_DESCRIPTIONS[items.tripleClickFormatType]?.name || 'Unknown';

    const newTitle = `1️⃣ ${single} / 2️⃣ ${double} / 3️⃣ ${triple}`;

    chrome.action.setTitle({ title: newTitle });
  } catch (error) {
    console.error('Error updating action button title:', error);
    // Fallback to a generic title
    chrome.action.setTitle({ title: 'Copy title & URL (settings error)' });
  }
}

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
  // Format templates (action is auto-detected based on URL scheme)
  singleClickFormat: '<title>\n<url>',
  doubleClickFormat: '[<title>](<url>)',
  tripleClickFormat: '<title>',
  fourthClickFormat: 'do_nothing',
  fifthClickFormat: 'do_nothing',
};

/**
 * Detects if a format template starts with a URL scheme
 * @param {string} format - The format template to check
 * @returns {boolean} True if the format starts with a URL scheme
 */
function isUrlFormat(format) {
  if (!format || typeof format !== 'string') {
    return false;
  }

  return format.includes('://');
}

/**
 * Removes UTM tracking parameters from a URL string.
 * @param {string} urlString - The URL to clean.
 * @returns {string} The cleaned URL.
 */
function removeUTMParams(urlString) {
  if (!urlString) {
    return '';
  }
  try {
    const url = new URL(urlString);
    const paramsToRemove = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      'msclkid',
    ];
    let paramsChanged = false;

    for (const param of paramsToRemove) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        paramsChanged = true;
      }
    }

    // Only return a new string if params were removed, to preserve original URL if no changes were made.
    return paramsChanged ? url.toString() : urlString;
  } catch (error) {
    console.error('Failed to parse URL for UTM removal:', error);
    return urlString; // Return original URL on error
  }
}

/**
 * Applies title preprocessing rules to the given title based on the URL.
 * @param {string} title - The original page title.
 * @param {string} url - The page URL.
 * @param {Array<Object>} rules - The array of preprocessing rules.
 * @returns {string} The processed title.
 */
function applyTitlePreprocessing(title, url, rules) {
    if (!rules || rules.length === 0) {
        return title;
    }

    let processedTitle = title;

    for (const rule of rules) {
        if (url.startsWith(rule.url)) {
            for (const action of rule.actions) {
                switch (action.type) {
                    case 'add_prefix':
                        processedTitle = action.value1 + processedTitle;
                        break;
                    case 'add_suffix':
                        processedTitle = processedTitle + action.value1;
                        break;
                    case 'remove':
                        processedTitle = processedTitle.replaceAll(action.value1, '');
                        break;
                    case 'replace':
                        processedTitle = processedTitle.replaceAll(action.value1, action.value2);
                        break;
                }
            }
        }
    }

    return processedTitle;
}

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
      // await chrome.action.openPopup(); // Replaced with opening a new tab
      await chrome.tabs.create({
        url: chrome.runtime.getURL('launch_custom_url.html'),
      });
      // Badge will be shown by the popup logic if needed, or we can show a generic one here
      showBadgeText('⤴️'); // Indicate a prompt will follow
    }
  } catch (error) {
    console.error('Failed to open URL or launch page:', error);
    showBadgeText('⚠️', true);
  }
}

/**
 * Performs the action (copy or open URL) using the user's custom format with auto-detected action.
 *
 * @param {chrome.tabs.Tab[]} tabs - An array of active tab objects.
 * @param {string} clickType - The click type ('single', 'double', 'triple').
 * @returns {Promise<void>} Promise that resolves when the operation is complete.
 * @description Gets the user's format from storage, applies the format to each tab's title, URL, and selected text (quote),
 * and performs the action (copy or open) based on whether the format starts with a URL scheme.
 */
async function performClickAction(tabs, clickType) {
  if (!tabs || tabs.length === 0) {
    console.warn('No tabs provided for click action.');
    showBadgeText('⚠️', true);
    return;
  }

  try {
    const result = await chrome.storage.sync.get({
      ...FALLBACK_FORMATS,
      titlePreprocessingRules: [],
    });
    const formatKey = `${clickType}ClickFormat`;
    let formatTemplate = result[formatKey] || FALLBACK_FORMATS[formatKey] || '';
    const rules = result.titlePreprocessingRules;

    // Replace literal '\n' (from user input) with actual newline characters in the template
    formatTemplate = formatTemplate.replace(/\\n/g, '\n');

    if (formatTemplate === 'do_nothing') {
      return;
    }

    // Handle screenshot action separately
    if (formatTemplate === '<screenshot>') {
      if (tabs.length > 0 && tabs[0].id) {
        // For screenshot, we'll only operate on the first highlighted tab (usually the active one)
        await captureAndCopyScreenshot(tabs[0].id);
      } else {
        console.error('Cannot take screenshot without a valid tab ID.');
        showBadgeText('🖼️❌', true);
      }
      return; // Screenshot action is complete
    }

    const isUrlAction = isUrlFormat(formatTemplate);
    let textsToCopy = [];
    let urlsToOpen = [];

    for (const tab of tabs) {
      let title = tab.title || '';
      const url = removeUTMParams(tab.url || '');
      title = applyTitlePreprocessing(title, url, rules);
      let quote = '';

      // Get selected text for the current tab
      if (tab.id) {
        try {
          const selectionResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection()?.toString() || '',
          });
          if (
            selectionResult &&
            selectionResult.length > 0 &&
            selectionResult[0].result
          ) {
            quote = selectionResult[0].result.trim();
          }
        } catch (e) {
          console.warn(
            `Could not retrieve selected text for tab ${tab.id}:`,
            e,
          );
          // Proceed without selected text for this tab
        }
      }

      let formattedText;
      if (isUrlAction) {
        // For open action, URL encode the title, URL, and quote
        formattedText = formatTemplate
          .replaceAll('<title>', encodeURIComponent(title))
          .replaceAll('<url>', encodeURIComponent(url))
          .replaceAll('<quote>', encodeURIComponent(quote));
        urlsToOpen.push(formattedText.trim());
      } else {
        // For copy action, use plain text
        formattedText = formatTemplate
          .replaceAll('<title>', title)
          .replaceAll('<url>', url)
          .replaceAll('<quote>', quote);
        textsToCopy.push(formattedText.trim());
      }
    }

    if (isUrlAction) {
      let openedAtLeastOne = false;
      for (const urlToOpen of urlsToOpen) {
        await openUrl(urlToOpen);
        openedAtLeastOne = true;
      }
      if (openedAtLeastOne) {
        if (urlsToOpen.length > 0) {
          showBadgeText('🔗');
        }
      } else if (tabs.length > 0) {
        showBadgeText('⚠️', true);
      }
    } else {
      if (textsToCopy.length > 0) {
        const combinedText = textsToCopy.join('\n\n');
        const firstTabId = tabs[0].id;
        if (firstTabId) {
          await copyTextToClipboard(firstTabId, combinedText);
        } else {
          console.error('Cannot copy text without a valid tab ID.');
          showBadgeText('⚠️', true);
        }
      } else {
        showBadgeText('⚠️', true); // Nothing to copy
      }
    }
  } catch (error) {
    console.error(
      `Error performing ${clickType} click action for multiple tabs:`,
      error,
    );
    showBadgeText('⚠️', true);
  }
}

/**
 * Captures the visible part of the current tab and copies it to the clipboard.
 * @param {number} tabId - The ID of the tab to capture.
 * @returns {Promise<void>} Promise that resolves when the operation is complete.
 */
async function captureAndCopyScreenshot(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    // Capture the visible tab as a PNG data URL
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: 'png',
    });
    if (!dataUrl) {
      throw new Error('Failed to capture tab: dataUrl is empty.');
    }

    const { autoSaveScreenshot } = await chrome.storage.sync.get({
      autoSaveScreenshot: false,
    });

    if (autoSaveScreenshot) {
      const { screenshotSavePath = '' } = await chrome.storage.local.get(
        'screenshotSavePath',
      );

      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1)
        .toString()
        .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now
        .getHours()
        .toString()
        .padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      const maxTitleLength = 100;
      let title = tab.title || 'no-title';
      if (title.length > maxTitleLength) {
        title = title.slice(0, maxTitleLength);
      }
      const filename = `${timestamp}-${title}.jpg`;

      // Sanitize filename
      const sanitizedFilename = filename.replace(/[/\\?%*:|"<>]/g, '-');

      // Sanitize the folder path: remove trailing slash, and replace illegal filename characters
      const folderPath = screenshotSavePath
        .trim()
        // Remove trailing slash
        .replace(/\/$/, '')
        // Split into folder segments
        .split('/')
        // Remove illegal filename characters from each folder segment
        .map((segment) => segment.replace(/[/\\?%*:|"<>]/g, '-'))
        .filter(Boolean) // Remove empty segments
        .join('/');

      // Join folder path and filename
      const finalFilename = folderPath
        ? `${folderPath}/${sanitizedFilename}`
        : sanitizedFilename;

      chrome.downloads.download({
        url: dataUrl,
        filename: finalFilename,
        saveAs: false,
      });
    }

    // Inject a script into the tab to copy the image to the clipboard
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      args: [dataUrl],
      func: async (imageDataUrl) => {
        try {
          // Convert data URL to blob
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();

          // Use Clipboard API to write the image blob
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob,
            }),
          ]);
          chrome.runtime.sendMessage({ action: 'copySuccess' });
        } catch (err) {
          console.error(
            'Error copying image to clipboard in content script:',
            err,
          );
          chrome.runtime.sendMessage({ action: 'copyError' });
        }
      },
    });
  } catch (error) {
    console.error('Failed to capture and copy screenshot:', error);
    showBadgeText('🖼️❌', true); // Using a different error badge for screenshot specific error
  }
}

/**
 * Performs single-click action using the user's custom single-click format
 * @param {chrome.tabs.Tab[]} tabs - An array of tab objects.
 * @returns {Promise<void>} Promise that resolves when operation is complete
 * @description Gets user's single-click format from storage and applies it with auto-detected action
 */
async function performSingleClickAction(tabs) {
  performClickAction(tabs, 'single');
}

/**
 * Performs double-click action using the user's custom double-click format
 * @param {chrome.tabs.Tab[]} tabs - An array of tab objects.
 * @returns {Promise<void>} Promise that resolves when operation is complete
 * @description Gets user's double-click format from storage and applies it with auto-detected action
 */
async function performDoubleClickAction(tabs) {
  performClickAction(tabs, 'double');
}

/**
 * Performs triple-click action using the user's custom triple-click format
 * @param {chrome.tabs.Tab[]} tabs - An array of tab objects.
 * @returns {Promise<void>} Promise that resolves when operation is complete
 * @description Gets user's triple-click format from storage and applies it with auto-detected action
 */
async function performTripleClickAction(tabs) {
  performClickAction(tabs, 'triple');
}

async function performFourthClickAction(tabs) {
  performClickAction(tabs, 'fourth');
}

async function performFifthClickAction(tabs) {
  performClickAction(tabs, 'fifth');
}

/**
 * Copies specified text to clipboard using the most compatible method available
 * @param {number} tabId - The ID of the tab to execute the script in
 * @param {string} textToCopy - The text content to copy to clipboard
 * @returns {Promise<void>} Promise that resolves when copy operation is complete
 * @description First tries navigator.clipboard.writeText, falls back to document.execCommand if needed
 */
async function copyTextToClipboard(tabId, textToCopy) {
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
 * @param {(tabs: chrome.tabs.Tab[]) => Promise<void>} fn - The function to execute, accepting an array of tab parameters.
 * @param {chrome.tabs.Tab[]} tabs - The array of tab objects to pass to the handler function.
 * @param {number} [delay=0] - The delay in milliseconds before executing the function.
 */
const registerClick = (fn, tabs, delay = 0) => {
  clickTimer = setTimeout(async () => {
    await fn(tabs);
    clickCount = 0; // Reset click count after action is performed
  }, delay);
};

/**
 * Event listener for extension action button clicks.
 * Handles single, double, and triple-click detection to trigger different actions
 * for all highlighted (selected) tabs in the current window.
 * @param {chrome.tabs.Tab} activeTab - The active tab when the action button was clicked.
 *        While this is provided, we will query for all highlighted tabs.
 * @description
 * - Queries for all highlighted tabs in the current window.
 * - Single click: Performs user-configured action with single-click format for selected tabs.
 * - Double click: Performs user-configured action with double-click format for selected tabs.
 * - Triple click: Performs user-configured action with triple-click format for selected tabs.
 * Actions can be either copying to clipboard or opening URLs based on user configuration.
 * Uses a timer-based approach to distinguish between single, double, and triple clicks.
 */
chrome.action.onClicked.addListener(async (activeTab) => {
  // Query for all highlighted tabs in the current window
  const highlightedTabs = await chrome.tabs.query({
    highlighted: true,
    currentWindow: true,
  });

  if (!highlightedTabs || highlightedTabs.length === 0) {
    // Fallback to active tab if no highlighted tabs found (should not happen if action is clicked)
    // or if the query somehow fails, though chrome.tabs.query is robust.
    // If activeTab itself doesn't have an ID (e.g. devtools window), then show error.
    if (!activeTab || !activeTab.id) {
      console.error('No valid tab found for action.');
      showBadgeText('⚠️', true);
      clickCount = 0; // Reset click count as the action cannot proceed
      return;
    }
    // Proceed with just the active tab if it's valid
    // This ensures that if a user clicks the extension on a page like chrome://extensions,
    // it still attempts to use that single tab if it's the only one "highlighted" (implicitly).
    performActionForTabs([activeTab]);
    return;
  }

  performActionForTabs(highlightedTabs);
});

/**
 * Handles the click timing and dispatches action for the given tabs.
 * @param {chrome.tabs.Tab[]} tabs - The array of tabs to perform the action on.
 */
function performActionForTabs(tabs) {
  clickCount++;

  // Clear the timer but don't execute yet - wait for potential double or triple click
  clearTimeout(clickTimer);

  if (clickCount === 1) {
    registerClick(performSingleClickAction, tabs, MULTI_CLICK_DELAY);
  } else if (clickCount === 2) {
    registerClick(performDoubleClickAction, tabs, MULTI_CLICK_DELAY);
  } else if (clickCount === 3) {
    // For triple click, execute immediately (or after a very short delay if needed, though 0 is typical)
    registerClick(performTripleClickAction, tabs, 0);
    // clickCount is reset by registerClick's timeout
  } else {
    // More than 3 clicks - reset counter and effectively ignore this click train
    clickCount = 0;
  }
}

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
    showBadgeText('✔️'); // Standard success badge
  } else if (message.action === 'copyError') {
    showBadgeText('⚠️', true); // Standard error badge
  }
  // Note: captureAndCopyScreenshot has its own error badge '🖼️❌' for capture phase errors.
  // If content script copy fails for screenshot, it will use '⚠️'.
});

async function updateContextMenus() {
  await chrome.contextMenus.removeAll();

  // Also load the actual format strings for custom types
  const items = await chrome.storage.sync.get({
    singleClickFormatType: DEFAULT_FORMAT_TYPES.singleClickFormatType,
    doubleClickFormatType: DEFAULT_FORMAT_TYPES.doubleClickFormatType,
    tripleClickFormatType: DEFAULT_FORMAT_TYPES.tripleClickFormatType,
    fourthClickFormatType: DEFAULT_FORMAT_TYPES.fourthClickFormatType,
    fifthClickFormatType: DEFAULT_FORMAT_TYPES.fifthClickFormatType,
    // Add format strings, with defaults from FALLBACK_FORMATS
    singleClickFormat: FALLBACK_FORMATS.singleClickFormat,
    doubleClickFormat: FALLBACK_FORMATS.doubleClickFormat,
    tripleClickFormat: FALLBACK_FORMATS.tripleClickFormat,
    fourthClickFormat: FALLBACK_FORMATS.fourthClickFormat,
    fifthClickFormat: FALLBACK_FORMATS.fifthClickFormat,
  });

  const clickTypes = [
    { type: 'single', emoji: '1️⃣' },
    { type: 'double', emoji: '2️⃣' },
    { type: 'triple', emoji: '3️⃣' },
    { type: 'fourth', emoji: '4️⃣' },
    { type: 'fifth', emoji: '5️⃣' },
  ];

  for (const click of clickTypes) {
    const formatTypeKey = `${click.type}ClickFormatType`;
    const formatKey = `${click.type}ClickFormat`;
    const menuId = `${click.type}-click`;

    let title;
    const formatType = items[formatTypeKey];

    if (formatType === 'custom') {
      let customFormat = items[formatKey] || '';
      // remove all newlines and replace with a space for readability
      customFormat = customFormat.replace(/\\n|\n/g, ' ');
      if (customFormat.length > 50) {
        title = customFormat.substring(0, 50) + '...';
      } else {
        title = customFormat;
      }
    } else {
      title = ACTION_DESCRIPTIONS[formatType]?.name || 'Unknown';
    }

    chrome.contextMenus.create({
      id: menuId,
      title: `${click.emoji} ${title}`,
      contexts: ['all'],
    });
  }
}

// -- listeners for updating the action button title --

// Update the title when the extension is first installed or updated
chrome.runtime.onInstalled.addListener(() => {
  updateActionButtonTitle();
  updateContextMenus();
});

// Update the title when the user changes the settings
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    const formatKeys = [
      'singleClickFormatType',
      'doubleClickFormatType',
      'tripleClickFormatType',
      'fourthClickFormatType',
      'fifthClickFormatType',
    ];
    if (formatKeys.some((key) => key in changes)) {
      updateActionButtonTitle();
      updateContextMenus();
    }
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const highlightedTabs = await chrome.tabs.query({
    highlighted: true,
    currentWindow: true,
  });

  const tabsToUse =
    !highlightedTabs || highlightedTabs.length === 0 ? [tab] : highlightedTabs;
  if (!tabsToUse[0] || !tabsToUse[0].id) {
    console.error('No valid tab found for action.');
    showBadgeText('⚠️', true);
    return;
  }

  switch (info.menuItemId) {
    case 'single-click':
      performSingleClickAction(tabsToUse);
      break;
    case 'double-click':
      performDoubleClickAction(tabsToUse);
      break;
    case 'triple-click':
      performTripleClickAction(tabsToUse);
      break;
    case 'fourth-click':
      performFourthClickAction(tabsToUse);
      break;
    case 'fifth-click':
      performFifthClickAction(tabsToUse);
      break;
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  const highlightedTabs = await chrome.tabs.query({
    highlighted: true,
    currentWindow: true,
  });

  const tabsToUse =
    !highlightedTabs || highlightedTabs.length === 0 ? [tab] : highlightedTabs;
  if (!tabsToUse[0] || !tabsToUse[0].id) {
    console.error('No valid tab found for action.');
    showBadgeText('⚠️', true);
    return;
  }

  switch (command) {
    case 'trigger-first-action':
      performSingleClickAction(tabsToUse);
      break;
    case 'trigger-second-action':
      performDoubleClickAction(tabsToUse);
      break;
    case 'trigger-third-action':
      performTripleClickAction(tabsToUse);
      break;
    case 'trigger-fourth-action':
      performFourthClickAction(tabsToUse);
      break;
    case 'trigger-fifth-action':
      performFifthClickAction(tabsToUse);
      break;
  }
});

// Call the function on startup
updateActionButtonTitle();
updateContextMenus();
