const fs = require('fs');
const path = require('path');
const { readEncryptedFile } = require('./fileHandler');
const { registerEquipment } = require('./socket');
const { getOrCreateUUID } = require('./createuuid');

// Пути к файлам
const dataFilePath = path.join(process.env.APPDATA, 'RubikomConnect', 'data', 'data.con');
const userFilePath = path.join(process.env.APPDATA, 'RubikomConnect', 'data', 'user.con');

// Функция для отправки данных на сервер
async function sendPcInfoToServer() {
    try {
        const uuid = getOrCreateUUID();
        console.log('Прочитанный UUID:', uuid);

        const pcInfo = readEncryptedFile('data.con') || {};
        const userInfo = readEncryptedFile('user.con') || {};

        // Формируем объект данных в соответствии с ожиданиями сервера
        const dataToSend = {
            uuid,
            systemInfo: {
                ...pcInfo,
                ...userInfo,
            },
        };

        console.log('Формируемые данные для отправки:', dataToSend);

        await registerEquipment(dataToSend);
        console.log('Данные успешно отправлены на сервер.');
    } catch (error) {
        console.error('Ошибка при отправке данных на сервер:', error.message);
    }
}

// Наблюдение за изменениями файлов
function watchFiles() {
    const watchFile = (filePath, description) => {
        if (fs.existsSync(filePath)) {
            fs.watch(filePath, async (eventType) => {
                if (eventType === 'change') {
                    console.log(`Файл ${description} был изменён, отправка обновлений на сервер...`);
                    await sendPcInfoToServer();
                }
            });
            console.log(`Наблюдение за файлом ${description} включено.`);
        } else {
            console.warn(`Файл ${description} не найден, наблюдение пропущено.`);
        }
    };

    watchFile(dataFilePath, 'data.con');
    watchFile(userFilePath, 'user.con');
}

module.exports = { sendPcInfoToServer, watchFiles };
