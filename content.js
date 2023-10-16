console.log('loaded')

const origins = ['https://curve-max.web.app', 'http://opensteri.local', 'http://localhost:5173']

window.addEventListener('message', function (event) {
    // Check the sender origin to be sure it's trusted
    console.log(event.origin)
    if (origins.indexOf(event.origin) === -1) return;
    const { data } = event

    if (data.type === 'is_curvemax_installed') {
        window.postMessage({type: 'curvemax_installed'}, event.origin)
        return;
    }
    chrome.runtime.sendMessage({
        ...data,
        origin: event.origin
    })
});