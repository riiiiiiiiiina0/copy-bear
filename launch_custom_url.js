const launchButton = /** @type {HTMLButtonElement} */ (
  document.getElementById('launchButton')
);
const urlDisplay = /** @type {HTMLDivElement} */ (
  document.getElementById('urlDisplay')
);
const storageKey = 'customProtocolUrl';

// Retrieve the URL from storage
chrome.storage.local.get([storageKey], (result) => {
  if (chrome.runtime.lastError) {
    console.error(
      'Error retrieving URL from storage:',
      chrome.runtime.lastError,
    );
    urlDisplay.textContent = 'Error loading URL.';
    launchButton.style.display = 'none'; // Hide button if URL can't be loaded
    return;
  }

  const customUrl = result[storageKey];

  if (customUrl) {
    urlDisplay.textContent = customUrl;
    launchButton.addEventListener('click', () => {
      window.open(customUrl, '_blank');
      setTimeout(() => {
        window.close();
      }, 5000);
    });

    // Clear the URL from storage once it's been retrieved and set
    chrome.storage.local.remove([storageKey], () => {
      if (chrome.runtime.lastError) {
        console.error(
          'Error removing URL from storage:',
          chrome.runtime.lastError,
        );
      }
    });
  } else {
    urlDisplay.textContent = 'No URL provided.';
    launchButton.style.display = 'none'; // Hide button if no URL
  }
});
