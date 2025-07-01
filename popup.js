document.addEventListener('DOMContentLoaded', () => {
  const launchButton = document.getElementById('launchButton');
  const urlDisplay = document.getElementById('urlDisplay');
  const storageKey = 'customProtocolUrl';

  // Retrieve the URL from storage
  chrome.storage.local.get([storageKey], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error retrieving URL from storage:', chrome.runtime.lastError);
      urlDisplay.textContent = 'Error loading URL.';
      launchButton.style.display = 'none'; // Hide button if URL can't be loaded
      return;
    }

    const customUrl = result[storageKey];

    if (customUrl) {
      urlDisplay.textContent = customUrl;
      launchButton.href = customUrl;

      // Clear the URL from storage once it's been retrieved and set
      chrome.storage.local.remove([storageKey], () => {
        if (chrome.runtime.lastError) {
          console.error('Error removing URL from storage:', chrome.runtime.lastError);
        }
      });
    } else {
      urlDisplay.textContent = 'No URL provided.';
      launchButton.style.display = 'none'; // Hide button if no URL
    }
  });

  // Add click listener to the launch button to close the popup
  // The default action of the anchor tag (opening the href) will still occur
  launchButton.addEventListener('click', () => {
    // Optional: Show a brief confirmation or loading state if needed
    // For example, changing button text:
    // launchButton.textContent = 'Launching...';
    // launchButton.disabled = true; // Prevent multiple clicks

    // Give a very short delay to ensure the link navigation is initiated
    // before the popup closes, especially for certain custom protocols.
    setTimeout(()_ => {
      window.close();
    }, 100);
  });
});
