document.addEventListener('DOMContentLoaded', async () => {
    const userInfo = await getUserInfo();
    if (userInfo) {
        document.getElementById('name').textContent = userInfo.name || '';
        document.getElementById('email').textContent = userInfo.email || '';
        document.getElementById('username').textContent = userInfo['x-cdnewco-username'] || '';
        document.getElementById('tenant_name').textContent = userInfo['x-cdnewco-tenant_name'] || '';
        document.getElementById('tenant_uuid').textContent = userInfo['x-cdnewco-tenant_uuid'] || '';
        document.getElementById('user_id').textContent = userInfo['x-cdnewco-user_id'] || '';
    }
    const toggleRingCentral = document.getElementById('toggleRingCentral');

    // Load the saved state from local storage
    chrome.storage.local.get('ringCentralEnabled', (data) => {
        toggleRingCentral.checked = data.ringCentralEnabled || false;
    });

    // Save the state to local storage when the toggle changes
    toggleRingCentral.addEventListener('change', () => {
        const isEnabled = toggleRingCentral.checked;
        chrome.storage.local.set({ ringCentralEnabled: isEnabled }, () => {
            // Reload all tabs with .curvehero.com
            const urlsToMatch = [
                "http://localhost:*/*",
                "*://*.flosspass.com/*",
                "*://*.curvehero.com/*"
            ];

            // Reload all tabs matching the URLs
            urlsToMatch.forEach(urlPattern => {
                chrome.tabs.query({ url: urlPattern }, (tabs) => {
                    tabs.forEach(tab => {
                        chrome.tabs.reload(tab.id);
                    });
                });
            });
        });
    });
});

async function getUserInfo() {
    return new Promise((resolve) => {
        chrome.storage.local.get('userInfo', (data) => {
            resolve(data.userInfo || null);
        });
    });
}