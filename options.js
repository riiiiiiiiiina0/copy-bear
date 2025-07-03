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
  // Format templates (action is auto-detected based on URL scheme)
  singleClickFormat: '<title>\n<url>', // Maintained original default
  doubleClickFormat: '[<title>](<url>)', // Maintained original default
  tripleClickFormat: '<title>', // Maintained original default
};

// Updated element IDs
const singleClickElement = /** @type {HTMLTextAreaElement} */ (
  document.getElementById('single-click')
);
const doubleClickElement = /** @type {HTMLTextAreaElement} */ (
  document.getElementById('double-click')
);
const tripleClickElement = /** @type {HTMLTextAreaElement} */ (
  document.getElementById('triple-click')
);
const optionsForm = /** @type {HTMLFormElement} */ ( // Still needed for submit event
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
  // Tailwind classes are now managed in HTML, only add/remove specific ones
  statusElement.classList.remove(
    'status-message-success',
    'status-message-error'
  );
  if (isError) {
    statusElement.classList.add('status-message-error');
  } else {
    statusElement.classList.add('status-message-success');
  }
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
    // Ensure default keys match what's used in saveFormats and chrome.storage.sync.get
    const result = await chrome.storage.sync.get({
      singleClickFormat: DEFAULT_FORMATS.singleClickFormat,
      doubleClickFormat: DEFAULT_FORMATS.doubleClickFormat,
      tripleClickFormat: DEFAULT_FORMATS.tripleClickFormat,
    });

    // Load formats
    singleClickElement.value = result.singleClickFormat;
    doubleClickElement.value = result.doubleClickFormat;
    tripleClickElement.value = result.tripleClickFormat;
  } catch (error) {
    console.error('Error loading saved formats:', error);
    showStatusMessage('Error loading saved settings. Using defaults.', true);
    // Populate with defaults on error
    singleClickElement.value = DEFAULT_FORMATS.singleClickFormat;
    doubleClickElement.value = DEFAULT_FORMATS.doubleClickFormat;
    tripleClickElement.value = DEFAULT_FORMATS.tripleClickFormat;
  }
}

/**
 * Saves the current form values (formats) to Chrome storage
 */
async function saveFormats() {
  try {
    // Prepare the data to save using the correct keys for storage
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
 * Resets the form to default values and saves them
 */
async function resetToDefaults() {
  singleClickElement.value = DEFAULT_FORMATS.singleClickFormat;
  doubleClickElement.value = DEFAULT_FORMATS.doubleClickFormat;
  tripleClickElement.value = DEFAULT_FORMATS.tripleClickFormat;

  // Save these defaults to storage as well
  await saveFormats(); // This will also show a status message
  showStatusMessage('Settings reset to defaults and saved.'); // Overwrite saveFormats message for clarity
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
        // Provide visual feedback using Tailwind classes temporarily
        const originalClasses = codeElement.className;
        const originalText = codeElement.textContent;
        codeElement.textContent = 'Copied!';
        codeElement.classList.remove('bg-blue-100', 'text-blue-800');
        codeElement.classList.add('bg-green-500', 'text-white');


        // Reset after a short delay
        setTimeout(() => {
          codeElement.textContent = originalText;
          codeElement.className = originalClasses;
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

  // Set up form submission handler (using the form ID)
  if (optionsForm) {
    optionsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveFormats();
    });
  } else {
     // Fallback if form is not found, though it should be there with the new HTML.
     // This could happen if saveBtn is outside a form, then we'd attach to saveBtn directly.
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // If it's type="submit" this is good, otherwise not strictly needed.
            await saveFormats();
        });
    }
  }


  // Set up reset button handler
  if (resetBtn) {
    resetBtn.addEventListener('click', resetToDefaults);
  }

  // Set up clickable code handlers
  setupClickableCodeHandlers();

  // Set up export button handler
  if (exportBtn) {
    exportBtn.addEventListener('click', exportConfig);
  }

  // Set up import button handler
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importConfig);
  }

  // Detect OS and display appropriate shortcut key
  const shortcutKeySpan = document.getElementById('shortcut-key');
  if (shortcutKeySpan) {
    // Default to 'Cmd' as per new template, adjust if not Mac
    // The new template already has "Cmd+Shift+1"
    // We need to make it dynamic based on OS.
    if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
      shortcutKeySpan.textContent = 'Cmd';
    } else {
      shortcutKeySpan.textContent = 'Ctrl';
    }
    // Append the rest of the shortcut string which is static
    shortcutKeySpan.textContent += '+Shift+1';
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

      // Update textareas using the correct IDs
      singleClickElement.value = importedConfig.format.single;
      doubleClickElement.value = importedConfig.format.double;
      tripleClickElement.value = importedConfig.format.triple;

      // Save the new settings
      await saveFormats(); // saveFormats already shows a success message
      // showStatusMessage('Configuration imported and saved successfully!'); // This might be redundant if saveFormats shows one.
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
