const { Tray, Menu, app } = require('electron');
const path = require('path');
const { openUserSettingsWindow } = require('./utils/userSettings');
const sudo = require('sudo-prompt');
const log = require('electron-log');

let tray;

function createTray() {
    const iconPath = path.join(app.getAppPath(), 'icon.ico'); // Используем app.getAppPath() вместо __dirname
    tray = new Tray(iconPath);
    tray.setToolTip('Рубиком Администратор');

    const contextMenu = [
        {
            label: 'Настройки пользователя',
            click: () => {
                const options = {
                    name: 'Рубиком Администратор',
                };

                sudo.exec('echo Administrator Privileges Granted', options, (error, stdout, stderr) => {
                    if (error) {
                        console.error('Ошибка запроса прав администратора:', error.message);
                        return;
                    }

                    log.info('Права администратора успешно получены:', stdout.trim());
                    openUserSettingsWindow(true);
                });
            },
        },
    ];

    tray.setContextMenu(Menu.buildFromTemplate(contextMenu));
}

module.exports = { createTray };
