const { app } = require('electron');
const { createTray } = require('./tray');
const { connectToServer } = require('./utils/socket');
const { readEncryptedFile, writeEncryptedFile } = require('./utils/fileHandler');
const { getSystemInfo } = require('./systemInfo');
const { generateUUID } = require('./utils/createuuid');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');
const { openUserSettingsWindow, checkUserFile } = require('./utils/userSettings');
const os = require('os');
const { ipcMain } = require('electron');
const { autoUpdater, dialog } = require('electron-updater');

process.on('uncaughtException', (error) => {
    require('electron-log').error('Uncaught Exception:', error);
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    require('electron-log').error('Unhandled Rejection at:', promise, 'reason:', reason);
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.on('ready', async () => {

    app.setLoginItemSettings({
        openAtLogin: true, // Запускать при входе в систему
        path: app.getPath('exe'), // Путь к исполняемому файлу
    });

    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {

    });

    autoUpdater.on('update-downloaded', () => {
        autoUpdater.quitAndInstall();
    });

    autoUpdater.on('error', (error) => {
        console.error('Ошибка при обновлении:', error.message);
    });

    console.log('Клиент запущен');
    createTray();

    const appDataDir = path.join(process.env.APPDATA, 'RubikomConnect', 'data');

    // Убедитесь, что директория существует
    if (!fs.existsSync(appDataDir)) {
        fs.mkdirSync(appDataDir, { recursive: true });
    }

    try {
        // Функция для проверки и подготовки всех данных
        const prepareData = async () => {
            // Проверка и создание UUID
            if (!fs.existsSync(path.join(appDataDir, 'uuid.con'))) {
                const uuid = generateUUID();
                writeEncryptedFile('uuid.con', uuid);
                console.log('uuid.con записан лог:', uuid);
            }

            // Проверка и создание System Info
            const newSystemInfo = await getSystemInfo();
            writeEncryptedFile('data.con', newSystemInfo);
            
            // Проверка и создание User Settings
            if (!checkUserFile()) {
                await new Promise((resolve) => {
                    openUserSettingsWindow();

                    ipcMain.once('user-data-saved', () => {
                        console.log('user.con сохранен');
                        resolve(); // Уведомляем, что процесс завершен
                    });
                });
            }
        };

        // Дождитесь завершения всех проверок и подготовок данных
        await prepareData();

        // Подключение к серверу после завершения подготовки данных
        await connectToServer();
        console.log('Подключение к серверу успешно выполнено');
    } catch (error) {
        console.error('Ошибка при подготовке данных или подключении к серверу:', error.message);
        log.info('Ошибка при подготовке данных или подключении к серверу:', error.message);
    }
    

    // Настройка логирования
    log.transports.file.resolvePathFn = (variables) => {
        return path.join(os.homedir(), 'Documents', 'RubikomLogs', 'main.log');
    };

    // Логирование ошибок
    process.on('uncaughtException', (error) => {
        log.error('Uncaught Exception:', error);
    });

    log.info('Приложение успешно запущено');
});

app.on('window-all-closed', () => {
    // Приложение продолжает работать в фоне
});
