/**
 * @fileoverview Options page script for Copy Title & URL extension
 * Handles saving and loading user preferences for copy formats
 */

/**
 * Default format configurations
 * @type {Object}
 * @constant
 */
const DEFAULT_FORMATS = {
  singleClickFormat: '<title>\n<url>',
  doubleClickFormat: '[<title>](<url>)',
};

const singleClickElement = /** @type {HTMLTextAreaElement} */ (
  document.getElementById('singleClickFormat')
);
const doubleClickElement = /** @type {HTMLTextAreaElement} */ (
  document.getElementById('doubleClickFormat')
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
    singleClickElement.value = result.singleClickFormat;
    doubleClickElement.value = result.doubleClickFormat;
  } catch (error) {
    console.error('Error loading saved formats:', error);
    showStatusMessage('Error loading saved settings. Using defaults.', true);
  }
}

/**
 * Saves the current form values to Chrome storage
 */
async function saveFormats() {
  try {
    const singleClickFormat = singleClickElement.value.trim() || '';
    const doubleClickFormat = doubleClickElement.value.trim() || '';

    // Save to Chrome storage
    await chrome.storage.sync.set({
      singleClickFormat: singleClickFormat,
      doubleClickFormat: doubleClickFormat,
    });

    showStatusMessage('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving formats:', error);
    showStatusMessage('Error saving settings. Please try again.', true);
  }
}

/**
 * Resets the form to default values
 */
function resetToDefaults() {
  singleClickElement.value = DEFAULT_FORMATS.singleClickFormat;
  doubleClickElement.value = DEFAULT_FORMATS.doubleClickFormat;
  showStatusMessage('Reset to default formats.');
  saveFormats();
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
});
