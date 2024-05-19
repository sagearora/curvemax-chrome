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

    async searchContacts(query) {
        const res = await proxyFetch(`https://${this.base_url}/cheetah/contacts/search?filter=${query}&statuses=&fields=clientNumber%2Caddress%2Cphones%2Cstatus%2Cnames%2Cnickname%2Csubscriber%2Cdob%2Cthumbnail%2Ccategory&start=0`, {
            method: 'GET',
        })
        const data = await this.parseJson(res)
        if (!data) {
            return []
        }
        return (data.items || []).map(item => ({
            id: this.normalizePatientId(item.id),
            first_name: item.first_name,
            last_name: item.last_name,
            dob: item.dob,
            phone: item.cell_phone_number,
            email: item.email,
        }))
    }
}