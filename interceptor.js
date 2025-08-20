/**
 * This script is injected into the page's context to intercept `axios` requests.
 * It communicates with the content script (`content.js`) via DOM events to
 * access the extension's `chrome.storage.local` API.
 */
(function() {
    // A promise-based event communication system to talk to the content script
    const comms = {
        request: (action, detail) => {
            return new Promise((resolve) => {
                const requestId = `api-cache-request-${Date.now()}-${Math.random()}`;
                
                const listener = (event) => {
                    if (event.detail.requestId === requestId) {
                        window.removeEventListener('api-cache-response', listener);
                        resolve(event.detail.data);
                    }
                };
                window.addEventListener('api-cache-response', listener);
                
                window.dispatchEvent(new CustomEvent('api-cache-request', {
                    detail: { action, ...detail, requestId }
                }));
            });
        }
    };
    
    // Function to generate a unique cache key from an axios config object
    const getAxiosCacheKey = (config) => {
        const { method = 'get', url, data } = config;
        let body = '';
        if (data && ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
            body = (typeof data === 'string') ? data : JSON.stringify(data);
        }
        // Use a fully qualified URL to prevent ambiguity
        const fullUrl = new URL(url, window.location.origin).href;
        return `${method.toUpperCase()}::${fullUrl}::${body}`;
    };

    // Poll the window object until `axios` is available
    const pollForAxios = setInterval(() => {
        if (window.axios) {
            clearInterval(pollForAxios);

            const originalAdapter = window.axios.defaults.adapter;

            // Replace the default adapter with our custom caching adapter
            window.axios.defaults.adapter = async (config) => {
                const storageData = await comms.request('get', { keys: ['isCacheEnabled'] });
                const isCacheEnabled = storageData ? storageData.isCacheEnabled : false;

                if (!isCacheEnabled) {
                    return originalAdapter(config);
                }

                const cacheKey = getAxiosCacheKey(config);
                const cachedResult = await comms.request('get', { keys: [cacheKey] });
                
                // If a cached response exists, return it immediately
                if (cachedResult && cachedResult[cacheKey]) {
                     const method = (config.method || 'get').toUpperCase();
                     console.log(`%c[API Cache] Serving from cache (axios): ${method} ${config.url}`, 'color: #4CAF50; font-weight: bold;');
                     
                     const cachedResponse = cachedResult[cacheKey];
                     return Promise.resolve({
                         data: cachedResponse.body,
                         status: cachedResponse.status,
                         statusText: cachedResponse.statusText,
                         headers: cachedResponse.headers,
                         config: config,
                         request: {} // Mock request object
                     });
                }

                // If not in cache, perform the real request using the original adapter
                return originalAdapter(config).then(async (response) => {
                    // Only cache successful responses (2xx status codes)
                    if (response.status >= 200 && response.status < 300) {
                        const method = (config.method || 'get').toUpperCase();
                        
                        const dataToCache = {
                            body: response.data,
                            headers: response.headers,
                            status: response.status,
                            statusText: response.statusText,
                            timestamp: Date.now()
                        };

                        console.log(`%c[API Cache] Caching new response for (axios): ${method} ${config.url}`, 'color: #2196F3; font-weight: bold;');
                        
                        // Set the data for this specific key
                        await comms.request('set', { data: { [cacheKey]: dataToCache } });
                        
                        // Atomically update the list of all cached keys
                        const { cachedKeys = [] } = await comms.request('get', { keys: ['cachedKeys'] });
                        if (!cachedKeys.includes(cacheKey)) {
                            await comms.request('set', { data: { cachedKeys: [...cachedKeys, cacheKey] } });
                        }
                    }
                    return response;
                }).catch(error => {
                    // Also pass through errors
                    console.warn(`[API Cache] Request failed for (axios): ${config.url}`, error);
                    return Promise.reject(error);
                });
            };
        }
    }, 100); // Poll every 100ms for axios to appear
})();