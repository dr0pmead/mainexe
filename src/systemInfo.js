const os = require('os');
const si = require('systeminformation');
const axios = require('axios');
const WmiClient = require('wmi-client');
const Registry = require('winreg');
const { execSync } = require('child_process');
const log = require('electron-log');
const { exec } = require('child_process');

const wmi = new WmiClient({
    host: 'localhost', // Локальный компьютер
    namespace: 'root\\CIMV2',
  });

// Функция для определения версии ОС
function getWindowsVersion() {
    const versionMap = {
      '6.1': 'Майкрософт Windows 7',
      '6.2': 'Майкрософт Windows 8',
      '6.3': 'Майкрософт Windows 8.1',
      '10.0': 'Майкрософт Windows 10',
      '11.0': 'Майкрософт Windows 11',
    };
  
    const version = os.release().split('.').slice(0, 2).join('.'); // Берём только основные версии, например "6.1"
  
    return versionMap[version] || `Windows ${version}`;
  }

// Функция для определения типа устройства
async function determineDeviceType() {
  const platform = os.platform();
  try {
    const batteryInfo = await si.battery();
    return batteryInfo.hasBattery || platform === 'darwin' ? 'Ноутбук' : 'Компьютер';
  } catch (error) {
    log.info('Ошибка при определении типа устройства:', error.message);
    return 'Неизвестно';
  }
}

const getAllIPv4Addresses = async () => {
    const interfaces = os.networkInterfaces();
    const allAddresses = [];
  
    for (const interface of Object.keys(interfaces)) {
      for (const iface of interfaces[interface]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          allAddresses.push(iface.address);
        }
      }
    }
  
    // Получаем внешний IP
    const externalIP = await getExternalIP();
  
    // Формируем main, secondary и добавляем externalIP
    return {
      main: allAddresses[0] || 'Не найден', // Первый IP-адрес
      secondary: allAddresses.slice(1), // Остальные адреса
      external: externalIP, // Внешний IP
    };
  };
  
  // Функция для получения внешнего IP
  async function getExternalIP() {
    try {
      const response = await axios.get('https://api.ipify.org?format=json');
      return response.data.ip;
    } catch (error) {
      log.info('Ошибка при получении внешнего IP:', error.message);
      return null;
    }
  }
  
// Функция для получения информации о жёстких дисках
async function getHardDrives() {
  try {
    const diskLayout = await si.diskLayout();
    const fsSize = await si.fsSize();

    // Сопоставляем данные дисков
    const hardDrives = fsSize.map((disk) => {
      // Ищем устройство, соответствующее букве диска
      const matchingDisk = diskLayout.find((layout) => {
        // Проверяем совпадение по размеру и устройству
        return (
          Math.abs(layout.size - disk.size) < 1024 ** 3 && // Допустимая погрешность по размеру
          !layout.name.includes('CD-ROM') // Исключаем CD-ROM устройства
        );
      });

      return {
        littera: disk.mount, // Буква диска
        name: matchingDisk ? matchingDisk.name : 'Неизвестно', // Имя диска
        size: (disk.size / (1024 ** 3)).toFixed(2) + ' GB', // Общий размер
        free: (disk.available / (1024 ** 3)).toFixed(2) + ' GB', // Свободное место
      };
    });

    return hardDrives;
  } catch (error) {
    log.info('Ошибка при получении информации о жёстких дисках:', error.message);
    return [];
  }
}

async function getRAMInfo() {
  return new Promise((resolve, reject) => {
      const wmicPath = 'C:\\Windows\\System32\\wbem\\wmic.exe';
      const command = `${wmicPath} memorychip get Capacity, Manufacturer, PartNumber, Speed /format:csv`;

      exec(command, (error, stdout, stderr) => {
          if (error) {
              log.info('Ошибка при выполнении wmic для RAM:', error.message);
              return reject('Не удалось получить информацию о RAM.');
          }

          if (stderr) {
              log.info('stderr при выполнении wmic для RAM:', stderr);
              return reject('Не удалось получить информацию о RAM.');
          }

          // Разбираем вывод
          const lines = stdout.trim().split('\n').filter(Boolean);
          if (lines.length <= 1) {
              return resolve({ total: '0 GB', modules: [] }); // Нет данных
          }

          // Пропускаем заголовок
          const modules = lines.slice(1).map((line) => {
              const [node, capacity, manufacturer, partNumber, speed] = line.split(',');
              return {
                  manufacturer: `${manufacturer || 'Неизвестно'} ${partNumber || ''}`.trim(),
                  size: (parseInt(capacity, 10) / (1024 ** 3)).toFixed(2) + ' GB',
                  speed: `${speed || '0'} MHz`,
              };
          });

          // Считаем общий объём
          const total = modules.reduce((sum, mod) => sum + parseFloat(mod.size), 0).toFixed(2) + ' GB';

          resolve({ total, modules });
      });
  });
}

async function getDefaultPrinter() {
  return new Promise((resolve, reject) => {
      const wmicPath = 'C:\\Windows\\System32\\wbem\\wmic.exe';
      const command = `${wmicPath} printer where "Default=True" get Name /format:csv`;

      exec(command, (error, stdout, stderr) => {
          if (error) {
              log.info('Ошибка при выполнении wmic для принтера:', error.message);
              return reject('Не удалось получить информацию о принтерах.');
          }

          if (stderr) {
              log.info('stderr при выполнении wmic для принтера:', stderr);
              return reject('Не удалось получить информацию о принтерах.');
          }

          const lines = stdout.trim().split('\n').filter(Boolean);
          if (lines.length <= 1) {
              return resolve(null); // Принтер по умолчанию не найден
          }

          const printerName = lines[1].trim(); // Имя принтера
          resolve({
              name: printerName || 'Неизвестно',
          });
      });
  });
}

  function getAnyDeskId() {
    try {
        const output = execSync('"C:\\Program Files (x86)\\AnyDesk\\AnyDesk.exe" --get-id', { encoding: 'utf-8' });
        return output.trim();
    } catch (error) {
        log.info('Ошибка при получении AnyDesk ID:', error.message);
        return 'N/A';
    }
}

function getTeamViewerId() {
  try {
    const regKey = new Registry({
      hive: Registry.HKLM,
      key: '\\SOFTWARE\\WOW6432Node\\TeamViewer',
    });

    return new Promise((resolve, reject) => {
      regKey.get('ClientID', (err, item) => {
        if (err || !item) {
          log.info('Ошибка при чтении реестра TeamViewer:', err?.message || 'Ключ не найден');
          resolve('N/A');
        } else {
          // Убедимся, что значение читается как число
          let clientId = parseInt(item.value, 16); // Преобразуем HEX в десятичное число
          if (isNaN(clientId)) {
            log.info('Ошибка: ClientID не удалось преобразовать в число.');
            resolve('N/A');
          } else {
            resolve(clientId.toString()); // Возвращаем строку для записи в БД
          }
        }
      });
    });
  } catch (error) {
    log.info('Ошибка при получении TeamViewer ID:', error.message);
    return Promise.resolve('N/A');
  }
}

async function getSystemInfo() {
    const result = {};
    try {
      // Имя компьютера
      result.computerName = os.hostname();
  
      // Процессор
      const cpuInfo = await si.cpu();
      result.processor = `${cpuInfo.manufacturer} ${cpuInfo.brand} ${cpuInfo.speed}GHz`;
  
      // Оперативная память
      result.ram = await getRAMInfo();
  
      // Материнская плата
      const baseboardInfo = await si.baseboard();
      result.motherboard = `${baseboardInfo.manufacturer} ${baseboardInfo.model}`;
  
      // Жёсткие диски
      result.hardDrives = await getHardDrives();
  
      // IP-адреса
      result.ipAddress = await getAllIPv4Addresses();
  
      // Видеокарта
      const graphicsInfo = await si.graphics();
      result.graphics = graphicsInfo.controllers.map((controller) => controller.model);
  
      // Тип устройства
      result.deviceType = await determineDeviceType();
  
      // Версия ОС
      result.osVersion = getWindowsVersion();

      result.anyDesk = getAnyDeskId();
      
      const teamViewerID = await getTeamViewerId();
      result.teamViewer = `${teamViewerID}`; // Преобразуем значение в строку
  
      // Принтеры
      result.printerInfo = await getDefaultPrinter();
  
      return result;
    } catch (error) {
      log.info('Ошибка при получении системной информации:', error.message);
      return { error: 'Не удалось получить системную информацию. Проверьте логи для деталей.' };
    }
  }
  

module.exports = { getSystemInfo };
