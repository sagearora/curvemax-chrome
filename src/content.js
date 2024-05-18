const Version = 1
console.log(`CurveMax Extension loaded: v${Version}`)
const Key = '97c05386-c744-4956-98cc-fc94e8d19db2'

window.addEventListener('message', function (event) {
    const { data } = event
    if (data.curvemax_key !== Key) {
        return;
    }
    chrome.runtime.sendMessage({
        ...data,
        origin: event.origin
    })
});

chrome.storage.local.get('subdomain', function (data) {
    subdomain = data.subdomain || ''
    const installed_proof = document.createElement("div");
    installed_proof.className = `curvemax-extension v-${Version} domain-${subdomain}`
    document.body.appendChild(installed_proof);
})

chrome.storage.sync.get('authCustomToken', (data) => {
  const customToken = data.authCustomToken;
  if (customToken) {
    console.log('token found', customToken)
  } else {
    console.log('No custom token found in storage');
  }
});