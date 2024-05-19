const proxy_url = 'https://guarded-peak-87453-f4335472c9a9.herokuapp.com/'

export const proxyFetch = (url, init = {}) => {
    return fetch(`${proxy_url}${url}`, {
        ...init,
        headers: {
            ...(init?.headers || {}),
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
}
