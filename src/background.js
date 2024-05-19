import { CurvePMSApi } from './api.js';
import { updateDynamicRules } from './rules.js';
import { setIcon } from './utils.js';

const app_url = 'https://app.flosspass.com'
const signin_url = (subdomain) => `https://${subdomain}.curvehero.com`
let subdomain = ''
let curveApi = null;
let user = null
const CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes
let intervalId = null;


async function initCurveApi() {
    if (subdomain) {
        curveApi = new CurvePMSApi(`${subdomain}.curvehero.com`);
        user = await curveApi.getUserInfo();
        setIcon(!!user)
        if (user) {
            chrome.storage.local.set({ userInfo: user });
            startInterval();
        } else {
            clearInterval();
        }
        return !!user
    }
    return false
}

async function checkUserSession() {
    if (curveApi) {
        const user = await curveApi.getUserInfo();
        setIcon(!!user);
        if (!user) {
            clearExistingInterval()
        }
    }
}

function startInterval() {
    if (!intervalId) {
        console.log('start interval')
        intervalId = setInterval(checkUserSession, CHECK_INTERVAL);
    }
}

function clearExistingInterval() {
    if (intervalId) {
        console.log('clear interval')
        clearInterval(intervalId);
        chrome.storage.local.remove('userInfo');
        intervalId = null;
    }
}


chrome.storage.local.get('subdomain').then(async (data) => {
    subdomain = data.subdomain || ''
    console.log('subdomain', subdomain)
    if (subdomain) {
        await updateDynamicRules(subdomain)
        initCurveApi()
    }
})

const signinListener = async (
    tabId,
    changeInfo,
    tab
) => {
    if (tab.status === 'complete') {
        if (!tab.url) {
            return;
        }
        if (tab.url.endsWith('#/')) {
            console.log('close this tab')
            if (tab.id) {
                await chrome.tabs.remove(tab.id);
            }
            chrome.tabs.onUpdated.removeListener(signinListener);
        }
    }
}

const signinToCurve = () => {
    if (!subdomain) {
        alert('Subdomain not set...')
        console.log('subdomain not set')
        return;
    }
    chrome.tabs.onUpdated.removeListener(signinListener)
    chrome.tabs.create({
        url: signin_url(subdomain),
        active: true,
    })
        .then(() => {
            chrome.tabs.onUpdated.addListener(signinListener);
        });
}

chrome.action.onClicked.addListener(async () => {
    if (!await initCurveApi()) {
        signinToCurve()
        return
    }
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
            signinToCurve()
            break;
    }
});


chrome.tabs.onUpdated.addListener(async function (tabId, changes, tab) {
    if (!tab.url || !subdomain) return;
    if (tab.url.startsWith(`https://${subdomain}.curvehero.com`)) {
        console.log('logged in...')
        await updateDynamicRules(subdomain)
        await initCurveApi()
    }
});
