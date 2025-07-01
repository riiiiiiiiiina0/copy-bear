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
  // Format templates (action is auto-detected based on URL scheme)
  singleClickFormat: '<title>\n<url>',
  doubleClickFormat: '[<title>](<url>)',
  tripleClickFormat: '<title>',
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
 * Loads saved formats from Chrome storage and populates the form
 */
async function loadSavedFormats() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_FORMATS);

    // Load formats
    singleClickElement.value =
      result.singleClickFormat || DEFAULT_FORMATS.singleClickFormat;
    doubleClickElement.value =
      result.doubleClickFormat || DEFAULT_FORMATS.doubleClickFormat;
    tripleClickElement.value =
      result.tripleClickFormat || DEFAULT_FORMATS.tripleClickFormat;
  } catch (error) {
    console.error('Error loading saved formats:', error);
    showStatusMessage('Error loading saved settings. Using defaults.', true);
  }
}

/**
 * Saves the current form values (formats) to Chrome storage
 */
async function saveFormats() {
  try {
    // Prepare the data to save
    const dataToSave = {
      singleClickFormat:
        singleClickElement.value.trim() || DEFAULT_FORMATS.singleClickFormat,
      doubleClickFormat:
        doubleClickElement.value.trim() || DEFAULT_FORMATS.doubleClickFormat,
      tripleClickFormat:
        tripleClickElement.value.trim() || DEFAULT_FORMATS.tripleClickFormat,
    };

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
  singleClickElement.value = DEFAULT_FORMATS.singleClickFormat;
  doubleClickElement.value = DEFAULT_FORMATS.doubleClickFormat;
  tripleClickElement.value = DEFAULT_FORMATS.tripleClickFormat;

  showStatusMessage('Reset to default formats.');
  await chrome.storage.sync.set(DEFAULT_FORMATS);
}

/**
 * Copies text to clipboard
 * @param {string} text - The text to copy
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Sets up click handlers for clickable code elements
 */
function setupClickableCodeHandlers() {
  const clickableCodeElements = document.querySelectorAll('code.clickable');

  clickableCodeElements.forEach((element) => {
    const codeElement = /** @type {HTMLElement} */ (element);
    codeElement.addEventListener('click', async (e) => {
      e.preventDefault();

      const textToCopy = codeElement.getAttribute('data-copy');
      if (!textToCopy) return;

      // Decode HTML entities for copying
      const decodedText = textToCopy
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      const success = await copyToClipboard(decodedText);

      if (success) {
        // Provide visual feedback
        const originalTitle = codeElement.title;
        codeElement.title = 'Copied!';
        codeElement.style.backgroundColor = 'var(--primary-color)';
        codeElement.style.color = 'white';

        // Reset after a short delay
        setTimeout(() => {
          codeElement.title = originalTitle;
          codeElement.style.backgroundColor = '';
          codeElement.style.color = '';
        }, 1000);

        showStatusMessage('Format copied to clipboard!');
      } else {
        showStatusMessage('Failed to copy format. Please try again.', true);
      }
    });
  });
}

/**
 * Initializes the options page when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved formats
  await loadSavedFormats();

  // Set up form submission handler
  optionsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveFormats();
  });

  // Set up reset button handler
  resetBtn.addEventListener('click', resetToDefaults);

  // Set up clickable code handlers
  setupClickableCodeHandlers();
});
