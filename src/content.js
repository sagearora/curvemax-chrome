const Version = 1
console.log(`CurveMax Extension loaded: v${Version}`)
const Key = '97c05386-c744-4956-98cc-fc94e8d19db2'
var registered = false
const ServiceName = 'FlossPass'
let matchedContacts = {}

const enableRcServices = (data) => {
    switch (data.type) {
        case 'rc-login-status-notify':
            if (!registered) {
                registered = true
                document.querySelector("#rc-widget-adapter-frame").contentWindow.postMessage({
                    type: 'rc-adapter-register-third-party-service',
                    service: {
                        name: ServiceName,
                        contactsPath: '/contacts',
                        contactSearchPath: '/contacts/search',
                        contactMatchPath: '/contacts/match',
                        contactMatchTtl: 2 * 60 * 60 * 1000, // optional, contact match data cache deleted time in seconds, default is 2 hours, supported from v1.10.2
                        contactNoMatchTtl: 5 * 60 * 1000, // optional, contact match data expired in seconds, will re-match at next match trigger, default is 5 minutes, from v1.10.2                    
                    }
                }, '*');
            }
            break;
        case 'rc-post-message-request':
            switch (data.path) {
                case '/contacts':
                    console.log('get contacts', data)
                    document.querySelector("#rc-widget-adapter-frame").contentWindow.postMessage({
                        type: 'rc-post-message-response',
                        responseId: data.requestId,
                        response: {
                            data: [],
                            nextPage: null,
                            syncTimestamp: Date.now()
                        },
                    }, '*');
                    break;
                case '/contacts/search':
                    chrome.runtime.sendMessage({
                        type: 'search_contacts',
                        query: data.body.searchString,
                        requestId: data.requestId
                    });
                    break;
                case '/contacts/match':
                    chrome.runtime.sendMessage({
                        type: 'match_contacts',
                        query: data.body.phoneNumbers,
                        requestId: data.requestId
                    });
                    break;
                default:
                    console.log('message', data)
            }
            break;
        case 'rc-active-call-notify':
            // only pop call for incoming ringing call
            if (data.call.direction === 'Inbound' && data.call.telephonyStatus === 'Ringing') {
                // here we popup a Google form pre-fill uri:
                console.log(`${data.call.direction} - ${data.call.from.phoneNumber}`)
                // const formUri = `https://docs.google.com/forms/d/e/xxxxxxxxx/viewform?usp=pp_url&entry.985526131=${data.call.direction}&entry.1491856435=${data.call.from.phoneNumber}&entry.875629840=${encodeURIComponent(data.call.fromName)}&entry.1789287962=${data.call.to.phoneNumber}&entry.1281736933=${encodeURIComponent(data.call.toName)}`;
                // window.open(formUri, 'Call form', 'width=600,height=600');
            }
            break;
        default:
            break;
    }
}

const runtimeListener = (message, sender, sendResponse) => {
    switch (message.type) {
        case 'search_contacts_results': {
            document.querySelector("#rc-widget-adapter-frame").contentWindow.postMessage({
                type: 'rc-post-message-response',
                responseId: message.requestId,
                response: {
                    data: message.results.map(result => ({
                        id: result.id, // id to identify third party contact
                        name: `${result.first_name} ${result.last_name}`,
                        type: ServiceName,
                        phoneNumbers: [{
                            phoneNumber: result.phone,
                            phoneType: 'direct', // support: business, extension, home, mobile, phone, unknown, company, direct, fax, other
                        }]
                    }))
                },
            }, '*');
            break;
        }
        case 'match_contacts_results': {
            matchedContacts = message.results.reduce((obj, result) => ({
                ...obj,
                [result.phone]: [...(obj[result.phone] || []), {
                    id: result.id, // id to identify third party contact
                    name: `${result.first_name} ${result.last_name}`,
                    type: ServiceName,
                    phoneNumbers: [{
                        phoneNumber: result.phone,
                        phoneType: 'phone', // support: business, extension, home, mobile, phone, unknown, company, direct, fax, other
                    }]
                }],
            }), matchedContacts)
            console.log(matchedContacts)
            document.querySelector("#rc-widget-adapter-frame").contentWindow.postMessage({
                type: 'rc-post-message-response',
                responseId: message.requestId,
                response: {
                    data: matchedContacts,
                },
            }, '*');
            document.querySelector("#rc-widget-adapter-frame").contentWindow.postMessage({
                type: 'rc-post-message-response',
                responseId: message.requestId,
                response: {
                    data: matchedContacts
                },
            }, '*');
            break;
        }
    }
}

chrome.storage.local.get('ringCentralEnabled', (data) => {
    console.log('Setting up ringcentral', data.ringCentralEnabled)
    window.addEventListener('message', function (event) {
        const { data } = event

        if (!data) {
            return;
        }

        if (data.curvemax_key === Key) {
            chrome.runtime.sendMessage({
                ...data,
                origin: event.origin
            })
            return;
        }
        if (data.ringCentralEnabled) {
            enableRcServices();
        }
    });

    if (data.ringCentralEnabled) {
        console.log('inject RingCentral extension');
        const script = document.createElement('script');
        var clientId = 'ev8zb9NmHdbbtmQQ60pCMt';
        // var appServer = "https://platform.devtest.ringcentral.com";
        var appServer = "https://platform.ringcentral.com";
        script.src = chrome.runtime.getURL(`lib/adapter.js?clientId=${clientId}&appServer=${appServer}`);  // Local path to the downloaded script
        script.onload = () => {
            console.log('RingCentral adapter loaded.');
        };
        (document.head || document.documentElement).appendChild(script);
        chrome.runtime.onMessage.addListener(runtimeListener);
    }
})

chrome.storage.local.get('subdomain', function (data) {
    subdomain = data.subdomain || ''
    const installed_proof = document.createElement("div");
    installed_proof.className = `curvemax-extension v-${Version} domain-${subdomain}`
    document.body.appendChild(installed_proof);
})




