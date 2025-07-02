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
const exportBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('exportBtn')
);
const importBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('importBtn')
);
const importFile = /** @type {HTMLInputElement} */ (
  document.getElementById('importFile')
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

  // Set up export button handler
  exportBtn.addEventListener('click', exportConfig);

  // Set up import button handler
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importConfig);

  // Detect OS and display appropriate shortcut key
  const shortcutKeySpan = document.getElementById('shortcut-key');
  if (shortcutKeySpan) {
    if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
      shortcutKeySpan.textContent = 'Cmd';
    } else {
      shortcutKeySpan.textContent = 'Ctrl';
    }
  }
});

/**
 * Exports the current configuration to a JSON file
 */
function exportConfig() {
  const config = {
    format: {
      single: singleClickElement.value,
      double: doubleClickElement.value,
      triple: tripleClickElement.value,
    }
  };

  const jsonString = JSON.stringify(config, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timestamp = `${year}${month}${day}-${hours}${minutes}`;
  const filename = `copy-title-url-config-${timestamp}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showStatusMessage('Configuration exported successfully!');
}

/**
 * Imports configuration from a JSON file
 */
async function importConfig() {
  const file = importFile.files?.[0];
  if (!file) {
    showStatusMessage('No file selected for import.', true);
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const content = event.target?.result;
      if (typeof content !== 'string') {
        showStatusMessage('Error reading file content.', true);
        return;
      }
      const importedConfig = JSON.parse(content);

      // Validate the imported configuration
      if (
        !importedConfig.format ||
        typeof importedConfig.format !== 'object' ||
        typeof importedConfig.format.single !== 'string' ||
        typeof importedConfig.format.double !== 'string' ||
        typeof importedConfig.format.triple !== 'string'
      ) {
        showStatusMessage(
          'Invalid configuration file format. Make sure it includes a `format` object with `single`, `double`, and `triple` string properties.',
          true
        );
        importFile.value = ''; // Reset file input
        return;
      }

      // Update textareas
      singleClickElement.value = importedConfig.format.single;
      doubleClickElement.value = importedConfig.format.double;
      tripleClickElement.value = importedConfig.format.triple;

      // Save the new settings
      await saveFormats(); // saveFormats already shows a success message
      showStatusMessage('Configuration imported and saved successfully!');
    } catch (error) {
      console.error('Error importing configuration:', error);
      showStatusMessage(
        `Error importing configuration: ${error.message}. Please ensure the file is a valid JSON.`,
        true
      );
    } finally {
      // Reset the file input so the same file can be selected again if needed
      importFile.value = '';
    }
  };

  reader.onerror = () => {
    showStatusMessage('Error reading the selected file.', true);
    importFile.value = ''; // Reset file input
  };

  reader.readAsText(file);
}
