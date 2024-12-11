const { io } = require('socket.io-client');
const { readEncryptedFile, writeEncryptedFile } = require('./fileHandler');
const { getSystemInfo } = require('../systemInfo');
const { getOrCreateUUID } = require('./createuuid');
const { BrowserWindow, ipcMain, screen, systemPreferences } = require('electron');
const path = require('path');
const log = require('electron-log');
const fs = require('fs');

let notificationWindow;
const socketUrl = 'http://localhost:5000'; // Адрес сервера
let socket;

// Пути к файлам
const dataFilePath = path.join(process.env.APPDATA, 'RubikomConnect', 'data', 'data.con');
const userFilePath = path.join(process.env.APPDATA, 'RubikomConnect', 'data', 'user.con');

// Функция для отправки данных на сервер
async function sendPcInfoToServer() {
    try {
        const uuid = readEncryptedFile('uuid.con')  || {};  
        const pcInfo = readEncryptedFile('data.con') || {};
        const userInfo = readEncryptedFile('user.con') || {};
        const lastUpdate = new Date().toISOString();
        
        const dataToSend = {
            uuid,
            systemInfo: {
                ...pcInfo,
                ...userInfo,
            },
            lastUpdate
        };

        console.log('Отправка данных на сервер:', dataToSend);
        socket.emit('registerEquipment', dataToSend);
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
                    console.log(`Изменения в файле ${description} обнаружены.`);
                    await sendPcInfoToServer();
                }
            });
        } else {
            console.warn(`Файл ${description} не найден, наблюдение пропущено.`);
        }
    };

    watchFile(dataFilePath, 'data.con');
    watchFile(userFilePath, 'user.con');
}

// Обновление данных системы и отправка их на сервер
async function updateSystemData() {
    try {
        console.log('Запущено обновление данных о системе...');

        const systemInfo = await getSystemInfo();
        writeEncryptedFile('data.con', systemInfo);

        console.log('Информация о системе успешно обновлена.');

        await sendPcInfoToServer();
    } catch (error) {
        console.error('Ошибка при обновлении данных о системе:', error.message);
    }
}

// Функция подключения к серверу
const connectToServer = async () => {
    try {
        // Check and handle UUID
        const uuid = await readEncryptedFile('uuid.con')  || {};    
        const pcInfo = await readEncryptedFile('data.con') || {};
        const userInfo = await readEncryptedFile('user.con') || {};

        // Data to send to the server
        const dataToSend = {
            uuid,
            systemInfo: {
                ...pcInfo,
                ...userInfo,
            },
        };

        console.log('Данные для подключения:', dataToSend);

        // Initialize socket connection
        socket = io(socketUrl);

        let isFirstConnect = true;
        
        socket.on('connect', () => {
            console.log(`Подключение установлено: ${socket.id}`);
            
            if (isFirstConnect) {
                socket.emit('registerEquipment', dataToSend);
                isFirstConnect = false;
            }
        });

        socket.on('disconnect', () => {
            console.log('Соединение потеряно');
            isFirstConnect = true; // Разрешить повторную отправку при восстановлении соединения
        });

        socket.on('connect_error', (error) => {
            console.error('Ошибка подключения к серверу:', error.message);
        });

        // Handle notifications
        socket.on('showNotification', async (data) => {
            if (notificationWindow) {
                notificationWindow.close();
            }

            const { width, height } = screen.getPrimaryDisplay().workAreaSize;

            notificationWindow = new BrowserWindow({
                width,
                height,
                frame: false,
                alwaysOnTop: true,
                skipTaskbar: true,
                transparent: true,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                },
            });

            notificationWindow.loadFile('notification.html');

            try {
                const rawColor = systemPreferences.getAccentColor();
                const accentColor = `#${rawColor}`;

                notificationWindow.webContents.once('did-finish-load', () => {
                    notificationWindow.webContents.send('notification-data', {
                        title: data.title || 'Новое уведомление',
                        message: data.message || 'Сообщение отсутствует',
                        accentColor,
                    });
                });
            } catch (error) {
                console.error('Ошибка получения цвета акцента:', error);
            }

            ipcMain.once('close-notification', () => {
                if (notificationWindow) {
                    notificationWindow.close();
                    notificationWindow = null;
                }
            });
        });

        watchFiles(); // Watch for file changes
    } catch (error) {
        console.error('Ошибка при подключении к серверу:', error.message);
    }
};

// Запуск наблюдения за системой
async function startSystemWatcher() {
    setInterval(updateSystemData, 3600000); // Обновление данных системы каждый час
}

module.exports = { connectToServer, startSystemWatcher };
