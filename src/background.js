const allResourceTypes = Object.values(chrome.declarativeNetRequest.ResourceType);

const app_url = 'https://curve-max.web.app'
let subdomain = ''
let login_tab_id = ''
let login_tab_origin = ''

chrome.storage.local.get('subdomain').then((data) => {
    subdomain = data.subdomain || ''
    console.log('subdomain', subdomain)
    if (subdomain) {
        updateDynamicRules()
    }
})


chrome.action.setPopup({ popup: "" });
chrome.action.onClicked.addListener(() => {
    chrome.tabs.update({
        url: app_url
    });
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    console.log(request, sender, sendResponse)
    switch (request.type) {
        case 'set_subdomain':
            if (subdomain === request.value) {
                return;
            }
            console.log(`Update subdomain to ${request.value}`)
            chrome.storage.local.set({
                subdomain: request.value
            })
            subdomain = request.value
            break;
        case 'login':
            if (!subdomain) {
                console.log('subdomain not set')
                return;
            }
            // cause the current tab to change to curvegro.
            // once logged in, switch back.
            console.log('login to curvehero')
            const tab = await chrome.tabs.update({
                url: `https://${subdomain}.curvegro.com`
            })
            login_tab_id = tab.id
            login_tab_origin = request.redirect_url || request.origin
            break;
    }
});

async function getCookiesForDomain(domain) {
    return new Promise(res => {
        chrome.cookies.getAll({ domain: domain }, function (cookies) {
            res(cookies)
        });
    })
}

const updateDynamicRules = async () => {
    if (!subdomain) {
        console.log('no subdomain set')
        return false;
    }
    console.log('fetch cookies and update')
    const gro_cookies = await getCookiesForDomain(`${subdomain}.curvegro.com`)
    const hero_cookies = await getCookiesForDomain(`${subdomain}.curvehero.com`)
    if (gro_cookies.length === 0 || hero_cookies.length === 0) {
        return false;
    }
    const rules = [
        {
            id: 1,
            priority: 1,
            action: {
                type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                requestHeaders: [
                    {
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        header: 'Cookie',
                        value: `${hero_cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')}; ${gro_cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')};`,
                    },
                ]
            },
            condition: {
                urlFilter: 'guarded-peak',
                resourceTypes: allResourceTypes,
            }
        },
        {
            id: 2,
            priority: 1,
            action: {
                type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                requestHeaders: [
                    {
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        header: 'X-Xsrf-Token',
                        value: gro_cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')?.value,
                    },
                ]
            },
            condition: {
                urlFilter: 'guarded-peak',
                resourceTypes: allResourceTypes,
            }
        }
    ];

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map((rule) => rule.id), // remove existing rules
        addRules: rules
    });
    return true
}

chrome.tabs.onUpdated.addListener(async function (tabId, changes, tab) {
    if (!tab.url || !subdomain) return;
    if (tab.url.startsWith(`https://${subdomain}.curvegro.com`)) {
        console.log('logged in...')
        await updateDynamicRules()
        if (tabId === login_tab_id) {
            console.log('login complete')
            chrome.tabs.update({
                url: login_tab_origin || app_url,
            })
            login_tab_id = ''
            login_tab_origin = ''
        }
    }
});

