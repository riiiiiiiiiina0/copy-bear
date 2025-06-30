/**
 * @fileoverview Options page script for Copy Title & URL extension
 * Handles saving and loading user preferences for copy formats
 */

const DEFAULT_OPEN_URL = 'https://chatgpt.com?hint=search&q=Summarize%20<url>';

/**
 * Default format configurations
 * @type {Object}
 * @constant
 */
const DEFAULT_FORMATS = {
  // Copy action formats
  singleClickCopyFormat: '<title>\n<url>',
  doubleClickCopyFormat: '[<title>](<url>)',
  tripleClickCopyFormat: '<title>',
  // Open URL action formats
  singleClickOpenFormat: DEFAULT_OPEN_URL,
  doubleClickOpenFormat: DEFAULT_OPEN_URL,
  tripleClickOpenFormat: DEFAULT_OPEN_URL,
  // Action types
  singleClickAction: 'copy',
  doubleClickAction: 'copy',
  tripleClickAction: 'copy',
};

const singleClickElement = /** @type {HTMLTextAreaElement} */ (
  document.getElementById('singleClickFormat')
);
const doubleClickElement = /** @type {HTMLTextAreaElement} */ (
  document.getElementById('doubleClickFormat')
);
const tripleClickElement = /** @type {HTMLTextAreaElement} */ (
  document.getElementById('tripleClickFormat')
);
const singleClickActionElement = /** @type {HTMLSelectElement} */ (
  document.getElementById('singleClickAction')
);
const doubleClickActionElement = /** @type {HTMLSelectElement} */ (
  document.getElementById('doubleClickAction')
);
const tripleClickActionElement = /** @type {HTMLSelectElement} */ (
  document.getElementById('tripleClickAction')
);
const optionsForm = /** @type {HTMLFormElement} */ (
  document.getElementById('optionsForm')
);
const resetBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('resetBtn')
);

/**
 * Shows a status message to the user
 * @param {string} message - The message to display
 * @param {boolean} [isError=false] - Whether this is an error message
 */
function showStatusMessage(message, isError = false) {
  const statusElement = document.getElementById('statusMessage');
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.className = `status-message ${isError ? 'error' : 'success'}`;
  statusElement.style.display = 'block';

  // Hide the message after 3 seconds
  setTimeout(() => {
    if (statusElement) {
      statusElement.style.display = 'none';
    }
  }, 3000);
}

/**
 * Updates the format textarea based on the selected action type
 * @param {string} clickType - The click type ('single', 'double', 'triple')
 * @param {HTMLSelectElement} actionElement - The action select element
 * @param {HTMLTextAreaElement} formatElement - The format textarea element
 * @param {Object} savedFormats - The saved formats from storage
 */
function updateFormatForAction(
  clickType,
  actionElement,
  formatElement,
  savedFormats,
) {
  const action = actionElement.value;
  const copyKey = `${clickType}ClickCopyFormat`;
  const openKey = `${clickType}ClickOpenFormat`;

  if (action === 'open') {
    formatElement.value = savedFormats[openKey] || DEFAULT_FORMATS[openKey];
  } else {
    formatElement.value = savedFormats[copyKey] || DEFAULT_FORMATS[copyKey];
  }
}

/**
 * Loads saved formats and actions from Chrome storage and populates the form
 */
async function loadSavedFormats() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_FORMATS);

    // Load action types first
    singleClickActionElement.value = result.singleClickAction;
    doubleClickActionElement.value = result.doubleClickAction;
    tripleClickActionElement.value = result.tripleClickAction;

    // Load appropriate formats based on action types
    updateFormatForAction(
      'single',
      singleClickActionElement,
      singleClickElement,
      result,
    );
    updateFormatForAction(
      'double',
      doubleClickActionElement,
      doubleClickElement,
      result,
    );
    updateFormatForAction(
      'triple',
      tripleClickActionElement,
      tripleClickElement,
      result,
    );
  } catch (error) {
    console.error('Error loading saved formats:', error);
    showStatusMessage('Error loading saved settings. Using defaults.', true);
  }
}

/**
 * Saves the current form values (formats and actions) to Chrome storage
 */
async function saveFormats() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_FORMATS);

    const singleClickAction = singleClickActionElement.value;
    const doubleClickAction = doubleClickActionElement.value;
    const tripleClickAction = tripleClickActionElement.value;

    // Prepare the data to save
    const dataToSave = {
      singleClickAction: singleClickAction,
      doubleClickAction: doubleClickAction,
      tripleClickAction: tripleClickAction,
    };

    // Save formats to appropriate keys based on current action types
    if (singleClickAction === 'open') {
      dataToSave.singleClickOpenFormat = singleClickElement.value.trim() || '';
      dataToSave.singleClickCopyFormat =
        result.singleClickCopyFormat || DEFAULT_FORMATS.singleClickCopyFormat;
    } else {
      dataToSave.singleClickCopyFormat = singleClickElement.value.trim() || '';
      dataToSave.singleClickOpenFormat =
        result.singleClickOpenFormat || DEFAULT_FORMATS.singleClickOpenFormat;
    }

    if (doubleClickAction === 'open') {
      dataToSave.doubleClickOpenFormat = doubleClickElement.value.trim() || '';
      dataToSave.doubleClickCopyFormat =
        result.doubleClickCopyFormat || DEFAULT_FORMATS.doubleClickCopyFormat;
    } else {
      dataToSave.doubleClickCopyFormat = doubleClickElement.value.trim() || '';
      dataToSave.doubleClickOpenFormat =
        result.doubleClickOpenFormat || DEFAULT_FORMATS.doubleClickOpenFormat;
    }

    if (tripleClickAction === 'open') {
      dataToSave.tripleClickOpenFormat = tripleClickElement.value.trim() || '';
      dataToSave.tripleClickCopyFormat =
        result.tripleClickCopyFormat || DEFAULT_FORMATS.tripleClickCopyFormat;
    } else {
      dataToSave.tripleClickCopyFormat = tripleClickElement.value.trim() || '';
      dataToSave.tripleClickOpenFormat =
        result.tripleClickOpenFormat || DEFAULT_FORMATS.tripleClickOpenFormat;
    }

    // Save to Chrome storage
    await chrome.storage.sync.set(dataToSave);

    showStatusMessage('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving formats:', error);
    showStatusMessage('Error saving settings. Please try again.', true);
  }
}

/**
 * Resets the form to default values
 */
async function resetToDefaults() {
  singleClickActionElement.value = DEFAULT_FORMATS.singleClickAction;
  doubleClickActionElement.value = DEFAULT_FORMATS.doubleClickAction;
  tripleClickActionElement.value = DEFAULT_FORMATS.tripleClickAction;

  // Update formats based on default action types
  updateFormatForAction(
    'single',
    singleClickActionElement,
    singleClickElement,
    DEFAULT_FORMATS,
  );
  updateFormatForAction(
    'double',
    doubleClickActionElement,
    doubleClickElement,
    DEFAULT_FORMATS,
  );
  updateFormatForAction(
    'triple',
    tripleClickActionElement,
    tripleClickElement,
    DEFAULT_FORMATS,
  );

  showStatusMessage('Reset to default formats.');
  await chrome.storage.sync.set(DEFAULT_FORMATS);
  location.reload();
}

/**
 * Sets up event handlers for action selectors to switch formats dynamically
 */
async function setupActionHandlers() {
  const savedFormats = await chrome.storage.sync.get(DEFAULT_FORMATS);

  singleClickActionElement.addEventListener('change', () => {
    updateFormatForAction(
      'single',
      singleClickActionElement,
      singleClickElement,
      savedFormats,
    );
  });

  doubleClickActionElement.addEventListener('change', () => {
    updateFormatForAction(
      'double',
      doubleClickActionElement,
      doubleClickElement,
      savedFormats,
    );
  });

  tripleClickActionElement.addEventListener('change', () => {
    updateFormatForAction(
      'triple',
      tripleClickActionElement,
      tripleClickElement,
      savedFormats,
    );
  });
}

/**
 * Initializes the options page when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved formats
  await loadSavedFormats();

  // Set up action handlers for dynamic format switching
  await setupActionHandlers();

  // Set up form submission handler
  optionsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveFormats();
  });

  // Set up reset button handler
  resetBtn.addEventListener('click', resetToDefaults);
});
