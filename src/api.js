import { proxyFetch } from './proxy-fetch.js';

export class CurvePMSApi {
    base_url;
    logout;

    constructor(base_url) {
        this.base_url = base_url
        this.logout = () => { console.log('should logout') }
    }

    hello() {
        return 'curve'
    }


    extractPatientId(id) {
        return id.split(':')[1]
    }

    normalizePatientId(id) {
        return `curve:${id}`
    }

    async parseJson(res) {
        if (res.status === 403) {
            this.logout()
            return null
        }
        return res.json()
    }

    async getUserInfo() {
        const res = await proxyFetch(`https://${this.base_url}/cheetah/userinfo`, {
            method: 'GET',
        })
        return this.parseJson(res)
    }
}