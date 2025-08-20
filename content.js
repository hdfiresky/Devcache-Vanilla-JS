(function() {
    // Prevent script from running in iframes
    if (window.self !== window.top) {
        return;
    }

    // --- Start: Axios Interception Logic ---

    // 1. Inject the interceptor script into the page to access `window.axios`
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('interceptor.js');
    (document.head || document.documentElement).appendChild(s);
    s.onload = function() {
        // Clean up the script tag after it has run
        s.remove();
    };

    // 2. Listen for requests from the injected script (page context)
    window.addEventListener('api-cache-request', async (event) => {
        const { action, keys, data, requestId } = event.detail;
        let responseData = null;

        try {
            if (action === 'get') {
                responseData = await chrome.storage.local.get(keys);
            } else if (action === 'set') {
                await chrome.storage.local.set(data);
                responseData = { success: true };
            }
        } catch (e) {
            console.error('[API Cache] Error accessing storage:', e);
            responseData = { error: e.message };
        }
        
        // 3. Send the response back to the injected script
        window.dispatchEvent(new CustomEvent('api-cache-response', {
            detail: { requestId, data: responseData }
        }));
    });

    // --- End: Axios Interception Logic ---


    // --- Start: Fetch Interception Logic ---

    const originalFetch = window.fetch;

    /**
     * Generates a cache key for a fetch request. Now handles Request objects.
     * @param {Request|string} resource - The resource to fetch.
     * @param {object} [options] - The options for the fetch request.
     * @returns {Promise<string|null>} A promise that resolves to the cache key or null.
     */
    const getCacheKey = async (resource, options) => {
        const method = (options?.method || (typeof resource !== 'string' && resource.method) || 'GET').toUpperCase();
        const url = typeof resource === 'string' ? resource : resource.url;
        let body = '';

        // Only consider body for methods that might have one
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            let bodySource = options?.body;
            
            // If the resource is a Request object, its body is the source of truth.
            if (typeof resource !== 'string') {
                try {
                    // We MUST clone the request to read the body, as it's a one-time stream.
                    body = await resource.clone().text();
                } catch (e) {
                    // This can happen if the body is already used, which shouldn't be the case here.
                    console.warn('[API Cache] Could not read body from Request object. Caching may be inaccurate.', e);
                    body = ''; // Fallback to empty body
                }
            } else if (bodySource) {
                if (typeof bodySource === 'string') {
                    body = bodySource;
                } else {
                    // Not caching requests with non-string bodies for simplicity (e.g., FormData, Blob)
                    console.warn('[API Cache] Request body is not a string. Skipping cache for this request.');
                    return null;
                }
            }
        }
        return `${method}::${url}::${body}`;
    };

    const readResponseBody = async (response) => {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            // Use text first to avoid parse error on empty body
            const text = await response.text();
            try {
                return text ? JSON.parse(text) : {};
            } catch (e) {
                // If parsing fails, return the raw text.
                console.warn('[API Cache] Failed to parse JSON response, caching as text.', text);
                return text;
            }
        }
        return response.text();
    };

    window.fetch = async function(...args) {
        const [resource, options] = args;

        const url = (typeof resource === 'string') ? resource : resource.url;
        
        // Don't intercept requests made by the extension itself
        if (url.startsWith('chrome-extension://')) {
            return originalFetch.apply(this, args);
        }

        const { isCacheEnabled } = await chrome.storage.local.get({ isCacheEnabled: false });

        if (!isCacheEnabled) {
            return originalFetch.apply(this, args);
        }
        
        // `getCacheKey` is now async to handle reading request bodies.
        const cacheKey = await getCacheKey(resource, options);

        if (!cacheKey) {
            return originalFetch.apply(this, args);
        }
        
        const cachedResult = await chrome.storage.local.get(cacheKey);
        const methodForLog = options?.method || (typeof resource !== 'string' && resource.method) || 'GET';

        if (cachedResult[cacheKey]) {
            console.log(`%c[API Cache] Serving from cache (fetch): ${methodForLog} ${url}`, 'color: #4CAF50; font-weight: bold;');
            const { body, headers, status, statusText } = cachedResult[cacheKey];
            
            // The body from cache might be an object if it was JSON.
            // The Response constructor needs a string, Blob, etc.
            const responseBody = typeof body === 'string' ? body : JSON.stringify(body);

            return new Response(responseBody, { status, statusText, headers: new Headers(headers) });
        }
        
        const response = await originalFetch.apply(this, args);
        
        // Only cache successful responses
        if (response.ok) {
            const responseClone = response.clone();
            
            try {
                const responseBody = await readResponseBody(responseClone);
                const responseHeaders = {};
                responseClone.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });

                const dataToCache = {
                    body: responseBody,
                    headers: responseHeaders,
                    status: responseClone.status,
                    statusText: responseClone.statusText,
                    timestamp: Date.now()
                };
                
                console.log(`%c[API Cache] Caching new response for (fetch): ${methodForLog} ${url}`, 'color: #2196F3; font-weight: bold;');
                
                await chrome.storage.local.set({ [cacheKey]: dataToCache });
                
                const { cachedKeys = [] } = await chrome.storage.local.get('cachedKeys');
                if (!cachedKeys.includes(cacheKey)) {
                    await chrome.storage.local.set({ cachedKeys: [...cachedKeys, cacheKey] });
                }
            } catch (error) {
                console.error('[API Cache] Error processing response for caching:', error);
            }
        }
        
        return response;
    };
})();