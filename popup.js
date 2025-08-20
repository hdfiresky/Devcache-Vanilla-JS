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
        cacheList.innerHTML = ''; // Clear previous items
        const { cachedKeys = [] } = await chrome.storage.local.get('cachedKeys');

        if (cachedKeys.length === 0) {
            cacheList.innerHTML = `
                <li class="empty-state">
                    No requests cached. Enable caching and reload your application to see requests here.
                </li>`;
            return;
        }

        const cachedItems = await chrome.storage.local.get(cachedKeys);

        const getMethodBadgeClass = (method) => {
            return method.toLowerCase();
        };

        cachedKeys.slice().reverse().forEach(key => {
            const cacheData = cachedItems[key];
            if (!cacheData) return;

            const [method, ...urlParts] = key.split('::');
            const url = urlParts.join('::').split('::')[0];

            const li = document.createElement('li');
            li.className = 'cache-item';
            li.title = url; // Show full URL on hover

            // Method Badge
            const methodBadge = document.createElement('span');
            methodBadge.textContent = method;
            methodBadge.className = `method-badge ${getMethodBadgeClass(method)}`;

            // URL and Timestamp container
            const infoDiv = document.createElement('div');
            infoDiv.className = 'cache-item-info';
            
            const urlSpan = document.createElement('span');
            urlSpan.textContent = url;
            urlSpan.className = 'cache-item-url';

            const timeSpan = document.createElement('span');
            timeSpan.textContent = `Cached ${timeAgo(cacheData.timestamp)}`;
            timeSpan.className = 'cache-item-time';

            infoDiv.appendChild(urlSpan);
            infoDiv.appendChild(timeSpan);
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="delete-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
            deleteBtn.className = 'delete-btn';
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