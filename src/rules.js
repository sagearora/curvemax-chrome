import { allResourceTypes } from './constants.js';
import { getCookiesForDomain } from './utils.js';

export const updateDynamicRules = async (subdomain) => {
    if (!subdomain) {
        console.log('no subdomain set');
        return false;
    }
    console.log('fetch cookies');
    const hero_cookies = await getCookiesForDomain(`${subdomain}.curvehero.com`);
    const gro_cookies = await getCookiesForDomain(`${subdomain}.curvegro.com`);
    if (hero_cookies.length === 0) {
        return false;
    }
    console.log('updating cookies', hero_cookies.length, gro_cookies.length)
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
        // {
        //     id: 2,
        //     priority: 1,
        //     action: {
        //         type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        //         requestHeaders: [
        //             {
        //                 operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        //                 header: 'X-Xsrf-Token',
        //                 value: gro_cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')?.value,
        //             },
        //         ]
        //     },
        //     condition: {
        //         urlFilter: 'guarded-peak',
        //         resourceTypes: allResourceTypes,
        //     }
        // }
    ];

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map((rule) => rule.id), // remove existing rules
        addRules: rules
    });
    return true;
};