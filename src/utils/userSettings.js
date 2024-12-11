const { BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { writeEncryptedFile, readEncryptedFile } = require('./fileHandler');
const mongoose = require('mongoose');
const Department = require('../../models/department'); // Путь к модели
require('dotenv').config();
const { app } = require('electron');

let userWindow;

mongoose.set('debug', true);
mongoose.connect('mongodb://46.161.40.192:27017/rubikomconnect', {

  })
    .then(() => console.log('Подключение установлено'))
    .catch(err => console.error('Ошибка подключения:', err));

// Создание окна пользователя
function openUserSettingsWindow(isEdit = false) {
    if (userWindow) return;
    const iconPath = path.join(app.getAppPath(), 'icon.ico');
    userWindow = new BrowserWindow({
        width: 350,
        height: 480,
        icon: iconPath,
        webPreferences: {
            preload: path.join(app.getAppPath(), 'src' , 'preload.js'), // Убедитесь, что путь корректный
            contextIsolation: true, // Обеспечивает безопасную изоляцию
            enableRemoteModule: false, // Отключите устаревший Remote API
            nodeIntegration: true, // Запретите Node.js в рендере
        },
        resizable: false,
        autoHideMenuBar: true,
    });

    userWindow.loadFile('user.html');
    userWindow.webContents.openDevTools();
    if (isEdit) {
        const userData = readEncryptedFile('user.con'); // Читаем файл user.con
        userWindow.webContents.once('did-finish-load', () => {
            userWindow.webContents.send('load-user-data', userData);
        });
    }

    userWindow.on('closed', () => {
        userWindow = null;
    });
}

// Обработчик сохранения данных пользователя
ipcMain.handle('save-user-data', async (event, userData) => {
    try {
        // Перезаписываем файл user.con
        writeEncryptedFile('user.con', userData);

        // Закрываем окно настроек пользователя, если оно открыто
        if (userWindow) {
            userWindow.close();
        }

        // Уведомляем о завершении сохранения
        ipcMain.emit('user-data-saved'); // Генерируем событие
    } catch (error) {
        console.error('Ошибка при сохранении данных пользователя:', error.message);
        throw error;
    }
});

// Обработчик загрузки данных пользователя
ipcMain.handle('load-user-data', async () => {
    try {
        const userData = readEncryptedFile('user.con'); // Читаем user.con
        const departments = await Department.find().lean();

        if (userData && userData.department) {
            const selectedDepartment = departments.find(dept => dept.name === userData.department);

            if (selectedDepartment) {
                userData.divisions = selectedDepartment.divisions || [];
            }
        }

        return { userData, departments };
    } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error.message);
        return { userData: null, departments: [] };
    }
});

// Обработчик для получения списка подразделений
ipcMain.handle('get-departments', async () => {
    try {
        const departments = await Department.find().lean();
        return departments;
    } catch (error) {
        console.error('Ошибка получения данных о подразделениях:', error);
        return [];
    }
});

const appDataPath = path.join(process.env.APPDATA, 'RubikomConnect', 'data');

function checkUserFile() {
    const userFilePath = path.join(appDataPath, 'user.con');
    return fs.existsSync(userFilePath);
}

module.exports = { openUserSettingsWindow, checkUserFile };
