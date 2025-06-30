// Background service worker for Copy Title & URL extension

// Function to show badge text and clear it after 3 seconds
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

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // Get the current tab's title and URL
    const title = tab.title;
    const url = tab.url;

    // Format the text to copy (title on first line, URL on second line)
    const textToCopy = `${title}\n${url}`;

    // Copy to clipboard using the newer navigator.clipboard API
    // We need to execute this in the context of the web page
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
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
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'copySuccess') {
    showBadgeText('✔️');
  } else if (message.action === 'copyError') {
    showBadgeText('⚠️', true);
  }
});
