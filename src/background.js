self.importScripts('firebase.js')
const allResourceTypes = Object.values(chrome.declarativeNetRequest.ResourceType);

const domain = 'http://localhost:5173'
const signin_url = `${domain}/login-callback`
let subdomain = ''
let login_tab_id = ''
let login_tab_origin = ''
const auth = firebase.auth();
const db = firebase.firestore();

const proxy_url = 'https://guarded-peak-87453-f4335472c9a9.herokuapp.com/'

const proxyFetch = (url, init) => {
    return fetch(`${proxy_url}${url}`, {
        ...init,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
}

async function searchContacts(query) {
    const res = await proxyFetch(`https://${subdomain}.curvehero.com/cheetah/contacts/search?filter=${query}&statuses=&fields=clientNumber%2Caddress%2Cphones%2Cstatus%2Cnames%2Cnickname%2Csubscriber%2Cdob%2Cthumbnail%2Ccategory&start=0`, {
        method: 'GET',
    })
    const data = await res.json()
    if (!data) {
        return []
    }
    return (data.items || []).map(item => ({
        id: item.id,
        first_name: item.first_name,
        last_name: item.last_name,
        dob: item.dob,
        phone: item.cell_phone_number,
        email: item.email,
    }))
}

auth.onAuthStateChanged((user) => {
    console.log('user', user)
    if (user && subdomain) {
        db.doc(`clinic/${subdomain}`).onSnapshot(async (doc) => {
            const data = doc.data()
            if (data) {
                const items = await searchContacts(data.phone)
                if (items && items.length > 0) {
                    chrome.notifications.create(
                        `rc-${data.id}-${items[0].id}`,
                        {
                            type: "basic",
                            iconUrl: "favicon.png",
                            title: `Call from ${items[0].first_name} ${items[0].last_name}`,
                            message: `📞 ${data.phone}`
                        },
                        function () { 
                            console.log('clicked')
                        }
                    );
                }
            }
        })
    } else {
        console.log('not signed in')
    }
})

chrome.notifications.onClicked.addListener((notification_id) => {
    if (notification_id.startsWith('rc')) {
        const parts = notification_id.split('-');
        const lastPart = parts[parts.length - 1];
        const profile_id = Number(lastPart);
        chrome.tabs.create({
            url: `https://${subdomain}.curvehero.com/#/main/patient/profile/${profile_id}`,
            active: true,
        })
        chrome.notifications.clear(notification_id)
    }
})

chrome.storage.local.get('subdomain').then((data) => {
    subdomain = data.subdomain || ''
    console.log('subdomain', subdomain)
    if (subdomain) {
        updateDynamicRules()
    }
})

const parseCustomToken = async (
    tabId,
    changeInfo,
    tab
) => {
    if (tab.status === 'complete') {
        if (!tab.url) {
            return;
        }
        console.log(tab)
        const url = new URL(tab.url);
        if (url.origin === domain) {
            const params = new URL(url.href).searchParams;
            const custom_token = params.get('custom_token')
            if (custom_token) {
                console.log("custom token found", custom_token);

                //we can close that tab now if we want
                if (tab.id) {
                    await chrome.tabs.remove(tab.id);
                }

                // store customToken in storage as these will be used to authenticate user in chrome extension
                const key = "authCustomToken";
                await chrome.storage.sync.set({
                    [key]: custom_token
                });

                // remove tab listener as token is set
                chrome.tabs.onUpdated.removeListener(parseCustomToken);

                auth.signInWithCustomToken(custom_token)
            }
        }
    }
}
chrome.action.setPopup({ popup: "" });
chrome.action.onClicked.addListener(() => {
    chrome.tabs.onUpdated.removeListener(parseCustomToken)
    chrome.tabs.create({
        url: signin_url,
        active: true,
    })
        .then((tab) => {
            chrome.tabs.onUpdated.addListener(parseCustomToken);
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
                url: login_tab_origin || signin_url,
            })
            login_tab_id = ''
            login_tab_origin = ''
        }
    }
});

