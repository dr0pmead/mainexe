const path = require('path');
const log = require('electron-log');
const { writeEncryptedFile, readEncryptedFile } = require('./fileHandler');

// Путь к файлу UUID
const uuidFileName = 'uuid.con';

// Генерация UUID в формате xxxx-xxxx-xxxx-xxxx
function generateUUID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const segmentLength = 4; // Длина одного сегмента
    const segments = 4; // Количество сегментов
    let uuid = [];

    for (let i = 0; i < segments; i++) {
        let segment = '';
        for (let j = 0; j < segmentLength; j++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        uuid.push(segment);
    }

    return uuid.join('-'); // Соединяем сегменты через '-'
}

// Получение или создание UUID
function getOrCreateUUID() {
    try {
        // Проверяем существование и читаем UUID
        const existingUUID = readEncryptedFile(uuidFileName);
        if (existingUUID) {
            return existingUUID;
        }

        // Генерация нового UUID
        const newUUID = generateUUID();
        writeEncryptedFile(uuidFileName, newUUID);
        return newUUID;
    } catch (err) {
        console.error('Ошибка работы с UUID:', err.message);
        log.info('Ошибка работы с UUID:', err.message);
        throw err;
    }
}

module.exports = { getOrCreateUUID, generateUUID };
