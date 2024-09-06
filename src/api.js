const axios = require('axios');
const fs = require('fs');
const path = require('path');

class Api {
    constructor(name, token, ref) {
        this.auth = null;
        this.name = name;
        this.token = token;
        this.ref = ref;
        this.instance = axios.create();
        this.instance.defaults.headers.common['Authorization'] = 'Bearer ';
        this.instance.defaults.headers.common['sec-ch-ua-mobile'] = '?1';
        this.instance.defaults.headers.common['sec-ch-ua-platform'] = 'iOS';
        this.instance.defaults.headers.common['sec-fetch-dest'] = 'empty';
        this.instance.defaults.headers.common['sec-fetch-mode'] = 'cors';
        this.instance.defaults.headers.common['sec-fetch-site'] = 'ame-site';
        this.instance.defaults.headers.common['user-agent'] = 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_1_3 like Mac OS X; en-us) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile/7E18 Safari/528.16';
    }

    async getToken() {
        const TOKEN_FILE_PATH = path.join(process.cwd() + '/sessions', this.name + 'accessToken.json');
        if (!fs.existsSync(TOKEN_FILE_PATH)) {
            this.log("Файл не найден");
            fs.appendFileSync(TOKEN_FILE_PATH, JSON.stringify({access: null}));
        }
        const file = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, 'utf-8'));
        this.instance.defaults.headers.common['Authorization'] = 'Bearer ' + file.access;
        try {
            const balance = await this.getUsername();
            this.log('Токен свеж', balance);
        } catch (error) {
            this.log('Токен умер. Пытаемся обновить');
            delete this.instance.defaults.headers.common['Authorization'];
            await this.instance({
                url: 'https://user-domain.blum.codes/api/v1/auth/provider/PROVIDER_TELEGRAM_MINI_APP',
                method: 'POST',
                data: {
                    referralToken: this.ref,
                    query: this.token,
                },
            }).then(response => {
                this.auth = response.data.token;
                this.instance.defaults.headers.common['Authorization'] = 'Bearer ' + this.auth.access;
                fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(this.auth));
            })
                .catch(error => {
                    console.error(error?.response?.data?.message);
                });
        }
    }

    async getUsername() {
        const response = await this.instance({
            url: 'https://user-domain.blum.codes/api/v1/user/me',
            method: 'GET',
        });
        return response.data.username;
    }

    async getBalance() {
        const response = await this.instance({
            url: 'https://game-domain.blum.codes/api/v1/user/balance',
            method: 'GET',
        });
        return response.data;
    }

    async getTribe() {
        try {
            const response = await this.instance({
                url: 'https://game-domain.blum.codes/api/v1/tribe/my',
                method: 'GET',
            });
            return response.data;
        } catch (error) {
            if (error.response.data.message === 'NOT_FOUND') {
                return;
            } else {
                this.log(error.response.data.message);
            }
        }
    }

    async claimFarmReward() { // сбор
        try {
            const {data} = await this.instance({
                url: 'https://game-domain.blum.codes/api/v1/farming/claim',
                method: 'POST',
                data: null,
            });
            return data;
        } catch (error) {
            if (error.response.data.message === `It's too early to claim`) {
                console.error(`Время не пришло для сбора`);
            } else {
                console.error(`Ошибка сбора: ${error}`);
            }
        }
    }

    async claimDailyReward() { // хз не робит в самом приложениее
        try {
            const {data} = await this.instance({
                url: 'https://game-domain.blum.codes/api/v1/daily-reward?offset=-180',
                method: 'POST',
                data: null,
            });

            return data;
        } catch (error) {
            if (error.response.data.message === 'same day') {
                console.error(`Ежедневная награда уже получена`);
            } else {
                console.error(`Ошибка получения ежедневной награды`);
            }
        }
    }

    async startFarmingSession() { // начать сбор
        const {data} = await this.instance({
            url: 'https://game-domain.blum.codes/api/v1/farming/start',
            method: 'POST',
            data: null,
        });
        return data;
    }

    async getTasks() {
        const {data} = await this.instance({
            url: 'https://game-domain.blum.codes/api/v1/tasks',
            method: 'GET',
        });
        return data;
    }

    async startTask(taskId, title) {
        try {
            const {data} = await this.instance({
                url: `https://game-domain.blum.codes/api/v1/tasks/${taskId}/start`,
                method: 'POST',
                data: null,
            });
            return data;
        } catch (error) {
            if (
                error.response &&
                error.response.data &&
                error.response.data.message === 'Task type does not support start'
            ) {
                console.error(`🚨 Start task "${title}" failed, because the task is not started yet.`);
            } else {
                this.log(error.response.data.message);
            }
        }
    }

    async claimTaskReward(taskId) {
        const {data} = await this.instance({
            url: `https://game-domain.blum.codes/api/v1/tasks/${taskId}/claim`,
            method: 'POST',
            data: null,
        });
        return data;
    }

    async getGameId() {
        const {data} = await this.instance({
            url: 'https://game-domain.blum.codes/api/v1/game/play',
            method: 'POST',
            data: null,
        });
        return data;
    }

    async claimGamePoints(gameId, points) {
        const {data} = await this.instance({
            url: `https://game-domain.blum.codes/api/v1/game/claim`,
            method: 'POST',
            data: {
                gameId,
                points,
            },
        });
        return data;
    }

    async getFriendsBalance() {
        const {data} = await this.instance({ // canClaim
            url: `https://user-domain.blum.codes/api/v1/friends/balance`,
            method: 'GET',
        });
        return data;
    }

    async claimFriends() {
        const {data} = await this.instance({
            url: `https://user-domain.blum.codes/api/v1/friends/claim`,
            method: 'POST',
        });
        return data;
    }

    log(text) {
        console.log(`${this.name} ${text}`);
    }
}

module.exports = {
    Api
};
