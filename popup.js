document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('cacheToggle');
    const clearBtn = document.getElementById('clearCache');
    const cacheList = document.getElementById('cacheList');

    const timeAgo = (timestamp) => {
        if (!timestamp) return '';
        const now = Date.now();
        const seconds = Math.floor((now - timestamp) / 1000);
        if (seconds < 10) return 'just now';
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    };

    const loadCacheState = async () => {
        const { isCacheEnabled = false } = await chrome.storage.local.get('isCacheEnabled');
        toggle.checked = isCacheEnabled;
    };

    const loadCachedItems = async () => {
        cacheList.innerHTML = '';
        const { cachedKeys = [] } = await chrome.storage.local.get('cachedKeys');

        if (cachedKeys.length === 0) {
            cacheList.innerHTML = `
                <li class="text-slate-500 italic text-center py-10 px-4">
                    No requests cached. Enable caching and reload your application to see requests here.
                </li>`;
            return;
        }

        const cachedItems = await chrome.storage.local.get(cachedKeys);

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
            const cacheData = cachedItems[key];
            if (!cacheData) return;

            const [method, ...urlParts] = key.split('::');
            const url = urlParts.join('::').split('::')[0];

            const li = document.createElement('li');
            li.className = 'flex items-center gap-3 p-2.5 mx-1 rounded-lg hover:bg-slate-700/50 transition-colors duration-150 cursor-default group';
            li.title = url; // Show full URL on hover

            // Method Badge
            const methodBadge = document.createElement('span');
            methodBadge.textContent = method;
            methodBadge.className = `px-2 py-0.5 text-xs font-bold tracking-wider rounded-full ring-1 shrink-0 ${getMethodBadgeClasses(method)}`;

            // URL and Timestamp container
            const infoDiv = document.createElement('div');
            infoDiv.className = 'flex-grow truncate';
            
            const urlSpan = document.createElement('span');
            urlSpan.textContent = url;
            urlSpan.className = 'text-slate-300 text-sm';

            const timeSpan = document.createElement('span');
            timeSpan.textContent = `Cached ${timeAgo(cacheData.timestamp)}`;
            timeSpan.className = 'text-slate-500 text-xs block';

            infoDiv.appendChild(urlSpan);
            infoDiv.appendChild(timeSpan);
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
            deleteBtn.className = 'ml-auto shrink-0 p-1 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity';
            deleteBtn.title = 'Delete this item from cache';

            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                li.style.opacity = '0.5';
                const { cachedKeys: currentKeys = [] } = await chrome.storage.local.get('cachedKeys');
                const newKeys = currentKeys.filter(k => k !== key);
                await chrome.storage.local.set({ cachedKeys: newKeys });
                await chrome.storage.local.remove(key);
            });


            li.appendChild(methodBadge);
            li.appendChild(infoDiv);
            li.appendChild(deleteBtn);
            cacheList.appendChild(li);
        });
    };

    toggle.addEventListener('change', (e) => {
        chrome.storage.local.set({ isCacheEnabled: e.target.checked });
    });

    clearBtn.addEventListener('click', async () => {
        const { cachedKeys = [] } = await chrome.storage.local.get('cachedKeys');
        if (cachedKeys.length === 0) return;
        
        let keysToRemove = [...cachedKeys, 'cachedKeys'];
        
        await chrome.storage.local.remove(keysToRemove);
        // Note: No longer disabling the cache on clear.
    });

    // Initial loads
    loadCacheState();
    loadCachedItems();

    // Listen for storage changes to update UI in realtime
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            // If keys change (add, remove, clear), reload the list
            if (changes.cachedKeys) {
                loadCachedItems();
            }
            // If toggle state changes, update the toggle
            if (changes.isCacheEnabled) {
                loadCacheState();
            }
        }
    });
});