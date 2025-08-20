document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('cacheToggle');
    const clearBtn = document.getElementById('clearCache');
    const cacheList = document.getElementById('cacheList');

    const loadCacheState = async () => {
        const { isCacheEnabled = false } = await chrome.storage.local.get('isCacheEnabled');
        toggle.checked = isCacheEnabled;
    };

    const loadCachedItems = async () => {
        cacheList.innerHTML = '';
        const { cachedKeys = [] } = await chrome.storage.local.get('cachedKeys');

        if (cachedKeys.length === 0) {
            cacheList.innerHTML = `
                <li class="text-slate-500 italic text-center py-8 px-2">
                    No requests cached yet. <br>
                    <span class="text-xs">Enable the cache and reload your app.</span>
                </li>`;
            return;
        }

        const getMethodBadgeClasses = (method) => {
            switch (method.toUpperCase()) {
                case 'GET':    return 'bg-sky-500/20 text-sky-300 ring-sky-500/30';
                case 'POST':   return 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30';
                case 'PUT':    return 'bg-amber-500/20 text-amber-300 ring-amber-500/30';
                case 'PATCH':  return 'bg-orange-500/20 text-orange-300 ring-orange-500/30';
                case 'DELETE': return 'bg-red-500/20 text-red-300 ring-red-500/30';
                default:       return 'bg-slate-600/50 text-slate-300 ring-slate-500/30';
            }
        };

        cachedKeys.slice().reverse().forEach(key => {
            const [method, url] = key.split('::');
            const li = document.createElement('li');
            li.className = 'flex items-center gap-2 p-2 mx-1 rounded-md hover:bg-slate-700/50 transition-colors duration-150 cursor-default';
            li.title = url; // Show full URL on hover

            // Method Badge
            const methodBadge = document.createElement('span');
            methodBadge.textContent = method;
            methodBadge.className = `px-2 py-0.5 text-xs font-bold tracking-wider rounded-full ring-1 shrink-0 ${getMethodBadgeClasses(method)}`;

            // URL Span
            const urlSpan = document.createElement('span');
            urlSpan.textContent = url;
            urlSpan.className = 'text-slate-300 text-xs truncate';

            li.appendChild(methodBadge);
            li.appendChild(urlSpan);
            cacheList.appendChild(li);
        });
    };

    toggle.addEventListener('change', (e) => {
        chrome.storage.local.set({ isCacheEnabled: e.target.checked });
    });

    clearBtn.addEventListener('click', async () => {
        const { cachedKeys = [] } = await chrome.storage.local.get('cachedKeys');
        
        let keysToRemove = [...cachedKeys, 'cachedKeys'];
        
        await chrome.storage.local.remove(keysToRemove);
        
        // Disable caching after clearing for safety
        await chrome.storage.local.set({ isCacheEnabled: false });

        // The storage listener will handle UI updates, but we can call them manually
        // for instant feedback in case the listener is slow.
        await loadCachedItems();
        await loadCacheState();
    });

    // Initial loads
    loadCacheState();
    loadCachedItems();

    // Listen for storage changes to update UI in realtime
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.cachedKeys) {
                loadCachedItems();
            }
            if (changes.isCacheEnabled) {
                loadCacheState();
            }
        }
    });
});