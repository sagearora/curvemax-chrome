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
});

async function getUserInfo() {
    return new Promise((resolve) => {
        chrome.storage.local.get('userInfo', (data) => {
            resolve(data.userInfo || null);
        });
    });
}