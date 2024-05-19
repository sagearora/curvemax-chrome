export async function getCookiesForDomain(domain) {
    return new Promise((resolve) => {
        chrome.cookies.getAll({ domain: domain }, function (cookies) {
            resolve(cookies);
        });
    });
}

export function setIcon(logged_in) {
    const path = logged_in ? 'icons/icon-success.png' : 'icons/icon-error.png';
    chrome.action.setIcon({ path });
}