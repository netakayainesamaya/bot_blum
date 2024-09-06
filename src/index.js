const _ = require('moment-timezone');
const moment = require('moment');
moment.locale('ru-RU');
moment.tz.setDefault('Europe/Moscow');

const {
    Api
} = require('./api.js');
const {delay, random, msToTime} = require('./utils');

const log = (text) => {
    console.log(text);
}

class Bot {
    constructor(name, token, ref) {
        this.timeout = null;
        this.countTimeout = 0;
        this.userName = name;
        this.userToken = token;
        this.userRef = ref;
        this.api = new Api(this.userName, this.userToken, this.userRef);
    }

    async start() {
        try {
            console.log(`${this.userName} Запустили бота`);
            await this.api.getToken();
            await delay(5000);
            const {username, balance, tribe, friendsBalance} = await this.accInfo();
            await delay(5000);
            let lastFarmTime = 0;
            if (Boolean(balance?.farming)) {
                lastFarmTime = balance.farming.endTime - new Date().getTime();
            }

            if (lastFarmTime <= 0) {
                const farmingSession = await this.getReward();
                lastFarmTime = farmingSession.endTime - new Date().getTime();
            }
            await delay(5000);
            if (friendsBalance.canClaim) {
                await this.getRewardFriends();
            }

            if (balance.playPasses > 0) {
                await this.playGames(balance.playPasses);
            }

            log(`${this.userName} Следующий через ${msToTime(lastFarmTime)} в ${moment(new Date().getTime() + lastFarmTime).format('h:mm')}`);
            if (this.timeout) {
                clearTimeout(this.timeout)
            }
            this.timeout = setTimeout(() => {
                this.start();
            }, lastFarmTime + 1000)

            console.log(`[${this.userName}] ✅ Auto completing tasks...`);

            const tasksData = await this.api.getTasks();
            let taskReward = 0;
            let taskStarted = 0;
            tasksData.forEach((category) => {
                category.tasks.forEach(async (task) => {
                    if (task.status === 'FINISHED') {
                    } else if (task.status === 'NOT_STARTED' && task.kind !== 'ONGOING') {
                        if (Boolean(task?.subTasks)) {

                        } else {
                            await this.api.startTask(task.id, task.title);
                            taskStarted++;
                        }
                    } else if (task.status === 'STARTED' || task.status === 'READY_FOR_CLAIM') {
                        try {
                            const claimedTask = await this.api.claimTaskReward(task.id);
                            taskReward += claimedTask.reward;
                        } catch (error) {
                            console.log(`🚫 Unable to claim task "${task.title}".`);
                        }
                    }
                });
            });
            if (taskReward > 0) {
                log(`${this.userName} Награда заданий: ${claimedTask.reward}`);
            } else {
                console.log(`${this.userName} Заданий начато ${taskStarted}`)
            }
        } catch (error) {
            this.countTimeout++;
            if (this.timeout) {
                clearTimeout(this.timeout)
            }
            setTimeout(() => {
                if (this.countTimeout > 5) {
                    log(`[${this.userName}] Слишком много ошибок. не запускаем сного. ожидаем вмешательство юзера`)
                    return
                }
                this.start();
            }, 5000);
            setTimeout(() => {
                this.countTimeout = 0;
            }, 60000);

            if (error?.response?.data?.message) {
                log(this.userName + ' ' + error.response.config.url + '\r\n' + error.response.status + '\r\n' + error.response.data.message);
            } else {
                console.error(error);
            }

        }
    }

    async accInfo() {
        const username = await this.api.getUsername();
        const rew = await this.api.claimDailyReward();
        const balance = await this.api.getBalance();
        const tribe = await this.api.getTribe();
        const friendsBalance = await this.api.getFriendsBalance();
        console.log(`Имя ${username}!\r\nБаланс ${balance.availableBalance}\r\nОсталось игр ${balance.playPasses}`);
        return {
            username,
            balance,
            tribe,
            friendsBalance
        }
    }

    async getReward() {
        console.log(`${this.userName} Попытка получить награду`);
        const claimResponse = await this.api.claimFarmReward();
        if (claimResponse) {
            console.log(`${this.userName} Успешно получили награду`);
        }
        console.log(`${this.userName} Попытка начать фарм награды`);
        const farmingSession = await this.api.startFarmingSession();
        //const farmStartTime = moment(farmingSession.startTime).format('h:mm:ss');
        const farmEndTime = moment(farmingSession.endTime).format('hh:mm:ss');
        log(`[${this.userName}] Получили 8ч награду`);
        return farmingSession
    }

    async getRewardFriends() {
        console.log(`${this.userName} Попытка получить награду друзей`);
        const friendsBalance = await this.api.claimFriends();
        log(`[${this.userName}] Собрано с друзей ${friendsBalance?.claimBalance}`);
    }

    async playGames(counter) {
        console.log(`[${this.userName}] Начинаем играть в игры`);
        let earnSum = 0;

        while (counter > 0) {
            console.log(`[${this.userName}] Осталось поиграть ${counter}`);
            try {
                var gameData = await this.api.getGameId();
            } catch (error) {
                if (error.response &&
                    error.response.data &&
                    error.response.data.message === 'cannot start game') {
                    console.error(error.response.data.message)
                    continue;
                }
            }

            const time = random(30_000, 40_000);
            console.log(`[${this.userName}] Ждем ${Math.floor(time / 1000)} сек`);
            await delay(time);

            const randPoints = random(150, 180);
            earnSum += randPoints;
            const letsPlay = await this.api.claimGamePoints(
                gameData.gameId,
                randPoints
            );

            if (letsPlay === 'OK') {
                const balance = await this.api.getBalance();
                console.log(`[${this.userName}] Заработали ${randPoints}, баланс ${balance.availableBalance} BLUM`);
            }
            counter--;
            await delay(30000);
        }
        log(`[${this.userName}] Закончились игры. Всего заработали ${earnSum}`);
    }
}

module.exports = {
    Bot
}
