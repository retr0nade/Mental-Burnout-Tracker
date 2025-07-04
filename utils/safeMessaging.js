export function safeSendMessage(message) {
  if (!chrome.runtime || !chrome.runtime.sendMessage) {
    console.warn('[SafeSend] Extension context unavailable');
    return;
  }

  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[SafeSend] Failed:', chrome.runtime.lastError.message);
      } else {
        console.log('[SafeSend] Success:', response);
      }
    });
  } catch (error) {
    console.error('[SafeSend] Error:', error.message);
  }
}
