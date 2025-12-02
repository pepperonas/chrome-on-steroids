/**
 * Background Service Worker für Chrome Extension
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Chrome On Steroids Extension installed');
  } else if (details.reason === 'update') {
    console.log('Chrome On Steroids Extension updated');
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_STORAGE') {
    chrome.storage.sync.get(message.keys, (result) => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'SET_STORAGE') {
    chrome.storage.sync.set(message.data, () => {
      sendResponse({ success: !chrome.runtime.lastError });
    });
    return true;
  }

  // API Request Proxy für Claude API (umgeht CORS)
  if (message.type === 'CLAUDE_API_REQUEST') {
    console.log('[Service Worker] Claude API Request:', {
      url: message.url,
      method: message.method,
      hasHeaders: !!message.headers,
      hasApiKey: !!message.headers?.['x-api-key'],
      apiKeyPrefix: message.headers?.['x-api-key']?.substring(0, 15) + '...',
      bodyLength: message.body?.length
    });

    // Stelle sicher, dass alle Header korrekt sind
    const headers: Record<string, string> = {
      ...(message.headers || {}),
      'Content-Type': message.headers?.['content-type'] || message.headers?.['Content-Type'] || 'application/json'
    };

    fetch(message.url, {
      method: message.method || 'POST',
      headers: headers,
      body: message.body
    })
      .then(async (response) => {
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        
        console.log('[Service Worker] Claude API Response:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          dataType: typeof data,
          hasError: !!data?.error,
          errorMessage: data?.error?.message || data?.error?.type
        });

        sendResponse({
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: data
        });
      })
      .catch((error) => {
        console.error('[Service Worker] Claude API Error:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        sendResponse({
          success: false,
          status: 0,
          statusText: 'Network Error',
          error: error.message || 'Unbekannter Netzwerkfehler',
          data: null
        });
      });
    return true; // Keep channel open for async response
  }

  return false; // Not handled
});

