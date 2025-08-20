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
            const li = document.createElement('li');
            li.textContent = 'No APIs cached yet.';
            li.className = 'text-gray-400 italic px-1';
            cacheList.appendChild(li);
            return;
        }

        cachedKeys.forEach(key => {
            const [method, url] = key.split('::');
            const li = document.createElement('li');
            li.className = 'flex flex-col p-2 bg-gray-700/50 rounded-md';
            
            const methodSpan = document.createElement('span');
            methodSpan.textContent = method;
            
            let methodColor = 'text-gray-400';
            if (method === 'GET') methodColor = 'text-blue-400';
            else if (method === 'POST') methodColor = 'text-green-400';
            else if (method === 'PUT' || method === 'PATCH') methodColor = 'text-yellow-400';
            else if (method === 'DELETE') methodColor = 'text-red-400';
            
            methodSpan.className = `font-bold ${methodColor}`;

            const urlSpan = document.createElement('span');
            urlSpan.textContent = url;
            urlSpan.className = 'text-gray-300 break-all text-xs mt-1';

            li.appendChild(methodSpan);
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

        await loadCachedItems();
        await loadCacheState();
    });

    loadCacheState();
    loadCachedItems();
});
