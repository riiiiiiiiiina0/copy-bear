/**
 * @fileoverview Options page script for Copy Title & URL extension
 * Handles saving and loading user preferences for copy formats
 */

/**
 * @fileoverview Options page script for Copy Title & URL extension
 * Handles saving and loading user preferences for copy formats
 */

/**
 * Predefined format options
 * @type {Object<string, {name: string, value: string}>}
 * @constant
 */
const PREDEFINED_FORMATS = {
  do_nothing: { name: 'Do nothing', value: 'do_nothing' },
  title_url_2_lines: {
    name: 'Title and URL (2 lines)',
    value: '<title>\n<url>',
  },
  title_url_1_line: {
    name: 'Title and URL (1 line)',
    value: '<title> - <url>',
  },
  markdown: { name: 'Markdown', value: '[<title>](<url>)' },
  title: { name: 'Title', value: '<title>' },
  screenshot: { name: 'Screenshot', value: '<screenshot>' }, // Added Screenshot option
  custom: { name: 'Custom Format', value: '' }, // Custom value will be from textarea
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

// Original default format values, still needed for reset and initial save if type isn't 'custom'
const DEFAULT_FORMAT_VALUES = {
  singleClickFormat: PREDEFINED_FORMATS.title_url_2_lines.value,
  doubleClickFormat: PREDEFINED_FORMATS.markdown.value,
  tripleClickFormat: PREDEFINED_FORMATS.title_url_1_line.value,
  fourthClickFormat: PREDEFINED_FORMATS.do_nothing.value,
  fifthClickFormat: PREDEFINED_FORMATS.do_nothing.value,
};

// Element selectors
const clickTypes = ['single', 'double', 'triple', 'fourth', 'fifth'];
const elements = {
  autoSaveScreenshotElement: /** @type {HTMLInputElement} */ (
    document.getElementById('autoSaveScreenshot')
  ),
  screenshotPathContainer: /** @type {HTMLDivElement} */ (
    document.getElementById('screenshotPathContainer')
  ),
  screenshotSavePathElement: /** @type {HTMLInputElement} */ (
    document.getElementById('screenshotSavePath')
  ),
};

clickTypes.forEach((type) => {
  elements[`${type}ClickTypeElement`] = /** @type {HTMLSelectElement} */ (
    document.getElementById(`${type}-click-type`)
  );
  elements[`${type}ClickCustomFormatElement`] =
    /** @type {HTMLTextAreaElement} */ (
      document.getElementById(`${type}-click-custom-format`)
    );
  elements[`${type}ClickFormatElement`] = /** @type {HTMLTextAreaElement} */ (
    document.getElementById(`${type}-click-format`)
  );
});

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
 * Populates a select element with predefined format options.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 */
function populateFormatOptions(selectElement) {
  if (!selectElement) return;
  // Clear existing options
  selectElement.innerHTML = '';
  for (const key in PREDEFINED_FORMATS) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = PREDEFINED_FORMATS[key].name;
    selectElement.appendChild(option);
  }
}

/**
 * Updates the visibility of the custom format textarea based on select value.
 * Also updates the main hidden format textarea.
 * @param {string} type - The click type (e.g., 'single', 'double', 'triple').
 */
function updateTextareaVisibilityAndFormat(type) {
  const typeElement = elements[`${type}ClickTypeElement`];
  const customFormatElement = elements[`${type}ClickCustomFormatElement`];
  const formatElement = elements[`${type}ClickFormatElement`];

  if (!typeElement || !customFormatElement || !formatElement) return;

  const selectedType = typeElement.value;

  if (selectedType === 'custom') {
    customFormatElement.style.display = 'block';
    // When custom is selected, the formatElement's value will be taken from customFormatElement on save.
    // For live update or if needed: formatElement.value = customFormatElement.value;
  } else {
    customFormatElement.style.display = 'none';
    // Set the main format element's value to the selected predefined format's value
    if (PREDEFINED_FORMATS[selectedType]) {
      formatElement.value = PREDEFINED_FORMATS[selectedType].value;
      // Optionally, clear or set default for the custom textarea when not in use
      // customFormatElement.value = PREDEFINED_FORMATS[selectedType].value; // or some placeholder
    }
  }
  // Ensure the hidden format element is updated when the custom textarea changes
  if (selectedType === 'custom') {
    formatElement.value = customFormatElement.value;
  }
}

/**
 * Shows a status message to the user
 * @param {string} message - The message to display
 * @param {boolean} [isError=false] - Whether this is an error message
 */
function showStatusMessage(message, isError = false) {
  const statusElement = document.getElementById('statusMessage');
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.classList.remove(
    'status-message-success',
    'status-message-error',
  );
  if (isError) {
    statusElement.classList.add('status-message-error');
  } else {
    statusElement.classList.add('status-message-success');
  }
  statusElement.style.display = 'block';

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
    const syncItemsToGet = {
      autoSaveScreenshot: false, // Default value
    };
    clickTypes.forEach((type) => {
      syncItemsToGet[`${type}ClickFormatType`] =
        DEFAULT_FORMAT_TYPES[`${type}ClickFormatType`];
      syncItemsToGet[`${type}ClickFormat`] =
        DEFAULT_FORMAT_VALUES[`${type}ClickFormat`];
    });

    const localItemsToGet = {
      screenshotSavePath: '', // Default value
    };

    const syncResult = await chrome.storage.sync.get(syncItemsToGet);
    const localResult = await chrome.storage.local.get(localItemsToGet);

    // Load autoSaveScreenshot setting
    if (elements.autoSaveScreenshotElement) {
      elements.autoSaveScreenshotElement.checked =
        syncResult.autoSaveScreenshot;
      toggleScreenshotPathVisibility(); // Initial visibility check
    }

    // Load screenshotSavePath setting
    if (elements.screenshotSavePathElement) {
      elements.screenshotSavePathElement.value = localResult.screenshotSavePath;
    }

    clickTypes.forEach((type) => {
      const typeElement = elements[`${type}ClickTypeElement`];
      const customFormatElement = elements[`${type}ClickCustomFormatElement`];
      const formatElement = elements[`${type}ClickFormatElement`];

      const savedType = syncResult[`${type}ClickFormatType`];
      const savedFormat = syncResult[`${type}ClickFormat`];

      typeElement.value = savedType;
      formatElement.value = savedFormat; // This is the actual format string

      if (savedType === 'custom') {
        customFormatElement.value = savedFormat; // Populate custom textarea if custom was saved
      } else {
        // If not custom, custom textarea can be cleared or show the predefined value for reference
        // customFormatElement.value = PREDEFINED_FORMATS[savedType]?.value || '';
        customFormatElement.value = ''; // Prefer to keep it clean
      }
      updateTextareaVisibilityAndFormat(type); // Ensure correct visibility
    });
  } catch (error) {
    console.error('Error loading saved formats:', error);
    showStatusMessage('Error loading saved settings. Using defaults.', true);
    // Populate with defaults on error
    resetToDefaults(false); // Pass false to avoid loop if saveFormats in resetToDefaults also errors
  }
}

/**
 * Saves the current form values (formats) to Chrome storage
 */
/**
 * Toggles the visibility of the screenshot path container based on the checkbox.
 */
function toggleScreenshotPathVisibility() {
  if (elements.autoSaveScreenshotElement.checked) {
    elements.screenshotPathContainer.style.display = 'block';
  } else {
    elements.screenshotPathContainer.style.display = 'none';
  }
}

async function saveFormats() {
  try {
    const syncDataToSave = {
      autoSaveScreenshot: elements.autoSaveScreenshotElement.checked,
    };
    const localDataToSave = {
      screenshotSavePath: elements.screenshotSavePathElement.value.trim(),
    };

    clickTypes.forEach((type) => {
      const typeElement = elements[`${type}ClickTypeElement`];
      const customFormatElement = elements[`${type}ClickCustomFormatElement`];
      // const formatElement = elements[`${type}ClickFormatElement`]; // We'll set this based on logic

      const selectedType = typeElement.value;
      syncDataToSave[`${type}ClickFormatType`] = selectedType;

      if (selectedType === 'custom') {
        syncDataToSave[`${type}ClickFormat`] = customFormatElement.value.trim();
      } else {
        syncDataToSave[`${type}ClickFormat`] =
          PREDEFINED_FORMATS[selectedType]?.value || '';
      }
      // Update the hidden format element as well, though it's mostly for direct use by other parts if any.
      elements[`${type}ClickFormatElement`].value =
        syncDataToSave[`${type}ClickFormat`];
    });

    await chrome.storage.sync.set(syncDataToSave);
    await chrome.storage.local.set(localDataToSave);
    showStatusMessage('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving formats:', error);
    showStatusMessage('Error saving settings. Please try again.', true);
  }
}

/**
 * Resets the form to default values and saves them
 * @param {boolean} [shouldSave=true] - Whether to save after resetting.
 */
async function resetToDefaults(shouldSave = true) {
  // Reset autoSaveScreenshot checkbox
  if (elements.autoSaveScreenshotElement) {
    elements.autoSaveScreenshotElement.checked = false;
  }
  // Reset screenshotSavePath input
  if (elements.screenshotSavePathElement) {
    elements.screenshotSavePathElement.value = '';
  }
  toggleScreenshotPathVisibility(); // Hide the path input

  clickTypes.forEach((type) => {
    const typeElement = elements[`${type}ClickTypeElement`];
    const customFormatElement = elements[`${type}ClickCustomFormatElement`];
    const formatElement = elements[`${type}ClickFormatElement`];

    const defaultType = DEFAULT_FORMAT_TYPES[`${type}ClickFormatType`];
    typeElement.value = defaultType;
    customFormatElement.value = ''; // Clear custom textarea
    formatElement.value = DEFAULT_FORMAT_VALUES[`${type}ClickFormat`]; // Set to default value

    updateTextareaVisibilityAndFormat(type);
  });

  if (shouldSave) {
    await saveFormats(); // This will also show a status message
    showStatusMessage('Settings reset to defaults and saved.'); // Overwrite saveFormats message for clarity
  }
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
  // Populate dropdowns
  clickTypes.forEach((type) => {
    const typeElement = elements[`${type}ClickTypeElement`];
    populateFormatOptions(typeElement);

    // Add event listeners for select changes
    typeElement.addEventListener('change', () => {
      updateTextareaVisibilityAndFormat(type);
      // If a predefined type is selected, also update the hidden main format textarea
      if (typeElement.value !== 'custom') {
        elements[`${type}ClickFormatElement`].value =
          PREDEFINED_FORMATS[typeElement.value]?.value || '';
      }
    });

    // Add event listener for custom textarea input
    const customFormatElement = elements[`${type}ClickCustomFormatElement`];
    customFormatElement.addEventListener('input', () => {
      if (elements[`${type}ClickTypeElement`].value === 'custom') {
        elements[`${type}ClickFormatElement`].value = customFormatElement.value;
      }
    });
  });

  // Load saved formats
  await loadSavedFormats(); // This will also call updateTextareaVisibilityAndFormat for initial setup

  // Set up form submission handler
  if (optionsForm) {
    optionsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Before saving, ensure all hidden format fields are up-to-date
      clickTypes.forEach((type) => {
        const typeElement = elements[`${type}ClickTypeElement`];
        const customFormatElement = elements[`${type}ClickCustomFormatElement`];
        const formatElement = elements[`${type}ClickFormatElement`];
        if (typeElement.value === 'custom') {
          formatElement.value = customFormatElement.value;
        } else {
          formatElement.value =
            PREDEFINED_FORMATS[typeElement.value]?.value || '';
        }
      });
      await saveFormats();
    });
  }

  // Set up reset button handler
  if (resetBtn) {
    // Pass true to ensure saveFormats is called by resetToDefaults
    resetBtn.addEventListener('click', () => resetToDefaults(true));
  }

  // Add event listener for the auto-save checkbox
  if (elements.autoSaveScreenshotElement) {
    elements.autoSaveScreenshotElement.addEventListener(
      'change',
      toggleScreenshotPathVisibility,
    );
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
    importFile.addEventListener('change', importConfigAndReload); // Changed to new import function
  }

  // Detect OS and display appropriate shortcut key
  const shortcutKeySpan = document.getElementById('shortcut-key');
  if (shortcutKeySpan) {
    if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
      shortcutKeySpan.textContent = 'Cmd';
    } else {
      shortcutKeySpan.textContent = 'Ctrl';
    }
    shortcutKeySpan.textContent += '+Shift+1';
  }
});

/**
 * Exports the current configuration to a JSON file
 */
async function exportConfig() {
  try {
    // Fetch data from both sync and local storage
    const syncData = await chrome.storage.sync.get({
      titlePreprocessingRules: [],
    });
    const localData = await chrome.storage.local.get({
      screenshotSavePath: '',
    });

    const config = {
      version: 2, // Version number for the config format
      autoSaveScreenshot: elements.autoSaveScreenshotElement.checked,
      screenshotSavePath: localData.screenshotSavePath, // Use stored value
      titlePreprocessingRules: syncData.titlePreprocessingRules,
      formats: {
        single: {
          type: elements.singleClickTypeElement.value,
          format: elements.singleClickFormatElement.value,
        },
        double: {
          type: elements.doubleClickTypeElement.value,
          format: elements.doubleClickFormatElement.value,
        },
        triple: {
          type: elements.tripleClickTypeElement.value,
          format: elements.tripleClickFormatElement.value,
        },
      },
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
    const filename = `copy-title-url-config-v2-${timestamp}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatusMessage('Configuration exported successfully!');
  } catch (error) {
    console.error('Error exporting configuration:', error);
    showStatusMessage(`Error exporting configuration: ${error.message}`, true);
  }
}

/**
 * Imports configuration from a JSON file and reloads the UI.
 */
async function importConfigAndReload() {
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

      // Check for version to handle different config structures
      if (importedConfig.version === 2) {
        await importV2Config(importedConfig);
      } else {
        await importV1Config(importedConfig); // Legacy support
      }

      showStatusMessage(
        'Configuration imported successfully! Reloading settings...',
      );

      // Reload formats into the UI to reflect changes
      await loadSavedFormats();
    } catch (error) {
      console.error('Error importing configuration:', error);
      showStatusMessage(
        `Error importing configuration: ${error.message}. Please ensure the file is a valid JSON.`,
        true,
      );
    } finally {
      importFile.value = ''; // Reset file input
    }
  };

  reader.onerror = () => {
    showStatusMessage('Error reading the selected file.', true);
    importFile.value = ''; // Reset file input
  };

  reader.readAsText(file);
}

/**
 * Handles importing of the new V2 configuration format.
 * @param {object} config - The V2 configuration object.
 */
async function importV2Config(config) {
  const syncDataToSave = {};
  const localDataToSave = {};

  // Import auto-save screenshot settings
  if (typeof config.autoSaveScreenshot === 'boolean') {
    syncDataToSave.autoSaveScreenshot = config.autoSaveScreenshot;
  }
  if (typeof config.screenshotSavePath === 'string') {
    localDataToSave.screenshotSavePath = config.screenshotSavePath;
  }

  // Import title preprocessing rules
  if (Array.isArray(config.titlePreprocessingRules)) {
    syncDataToSave.titlePreprocessingRules = config.titlePreprocessingRules;
  }

  // Import click formats
  if (config.formats && typeof config.formats === 'object') {
    clickTypes.forEach((type) => {
      const formatConfig = config.formats[type];
      if (formatConfig && typeof formatConfig.type === 'string' && typeof formatConfig.format === 'string') {
        syncDataToSave[`${type}ClickFormatType`] = formatConfig.type;
        syncDataToSave[`${type}ClickFormat`] = formatConfig.format;
      }
    });
  }

  // Save all settings
  await chrome.storage.sync.set(syncDataToSave);
  await chrome.storage.local.set(localDataToSave);
}

/**
 * Handles importing of the legacy V1 configuration format.
 * @param {object} config - The V1 configuration object.
 */
async function importV1Config(config) {
  // Validate the imported configuration format
  if (!config.format || typeof config.format !== 'object') {
    throw new Error('Invalid configuration: `format` object missing.');
  }

  const dataToSave = {};
  let updatePerformed = false;

  clickTypes.forEach((type) => {
    const formatValue = config.format[type];
    const formatTypeKey = `${type}ClickFormatType`;
    const formatValueKey = `${type}ClickFormat`;

    if (typeof formatValue === 'string') {
      const importedType = config.types?.[type];
      if (importedType && PREDEFINED_FORMATS[importedType]) {
        dataToSave[formatTypeKey] = importedType;
        dataToSave[formatValueKey] = (importedType === 'custom') ? formatValue : PREDEFINED_FORMATS[importedType].value;
      } else {
        let matchedType = 'custom';
        for (const key in PREDEFINED_FORMATS) {
          if (key !== 'custom' && PREDEFINED_FORMATS[key].value === formatValue) {
            matchedType = key;
            break;
          }
        }
        dataToSave[formatTypeKey] = matchedType;
        dataToSave[formatValueKey] = formatValue;
      }
      updatePerformed = true;
    }
  });

  if (!updatePerformed) {
    throw new Error('No valid format data found in the imported file.');
  }

  await chrome.storage.sync.set(dataToSave);
}
