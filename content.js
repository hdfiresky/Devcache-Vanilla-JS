(function() {
    // Prevent script from running in iframes
    if (window.self !== window.top) {
        return;
    }

    const originalFetch = window.fetch;

    const getCacheKey = (url, options) => {
        const method = options?.method?.toUpperCase() || 'GET';
        let body = '';
        // Only consider body for state-changing methods
        if (options?.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
            if (typeof options.body === 'string') {
                body = options.body;
            } else {
                // Not caching requests with non-string bodies for simplicity (e.g., FormData, Blob)
                return null;
            }
        }
        return `${method}::${url}::${body}`;
    };

    const readResponseBody = async (response) => {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            // Use text first to avoid parse error on empty body
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        }
        return response.text();
    };

    window.fetch = async function(...args) {
        const [resource, options] = args;

        // Make sure we are dealing with a URL string, not a Request object
        const url = (typeof resource === 'string') ? resource : resource.url;
        
        // Don't intercept requests made by the extension itself
        if (url.startsWith('chrome-extension://')) {
            return originalFetch.apply(this, args);
        }

        const { isCacheEnabled } = await chrome.storage.local.get({ isCacheEnabled: false });

        if (!isCacheEnabled) {
            return originalFetch.apply(this, args);
        }

        const cacheKey = getCacheKey(url, options);

        if (!cacheKey) {
            return originalFetch.apply(this, args);
        }
        
        const cachedResult = await chrome.storage.local.get(cacheKey);

        if (cachedResult[cacheKey]) {
            console.log(`%c[API Cache] Serving from cache: ${options?.method || 'GET'} ${url}`, 'color: #4CAF50; font-weight: bold;');
            const { body, headers, status, statusText } = cachedResult[cacheKey];
            return new Response(JSON.stringify(body), { status, statusText, headers: new Headers(headers) });
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
                
                console.log(`%c[API Cache] Caching new response for: ${options?.method || 'GET'} ${url}`, 'color: #2196F3; font-weight: bold;');
                
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
