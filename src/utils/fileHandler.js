const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('electron-log');

// Путь к директории RubikomConnect в AppData
const appDataPath = path.join(process.env.APPDATA, 'RubikomConnect', 'data');

// Создаёт директорию, если её нет
function ensureAppDataDirectoryExists() {
    if (!fs.existsSync(appDataPath)) {
        fs.mkdirSync(appDataPath, { recursive: true });
    }
}

// Записывает зашифрованные данные в файл
function writeEncryptedFile(fileName, data) {
  ensureAppDataDirectoryExists();

  const filePath = path.join(appDataPath, fileName);
  const key = crypto.createHash('sha256').update('CYMHgczBrUQpecxBdggF0bsZrkVGI8zdyrz').digest();
  const cipher = crypto.createCipheriv('aes-256-ctr', key, Buffer.alloc(16, 0));

  try {
      const jsonData = JSON.stringify(data); // Преобразуем в строку JSON
      const encryptedData = Buffer.concat([cipher.update(jsonData), cipher.final()]);
      fs.writeFileSync(filePath, encryptedData);
  } catch (error) {
        log.info(`Ошибка записи файла ${fileName}:`, error.message);
      console.error(`Ошибка записи файла ${fileName}:`, error.message);
  }
}

// Читает и расшифровывает данные из файла
function readEncryptedFile(fileName) {
  const filePath = path.join(appDataPath, fileName);

  if (!fs.existsSync(filePath)) {
      log.info(`Файл ${fileName} не найден в ${filePath}`);
      console.error(`Файл ${fileName} не найден в ${filePath}`);
      return null;
  }

  const key = crypto.createHash('sha256').update('CYMHgczBrUQpecxBdggF0bsZrkVGI8zdyrz').digest();
  const decipher = crypto.createDecipheriv('aes-256-ctr', key, Buffer.alloc(16, 0));

  try {
      const fileData = fs.readFileSync(filePath);
      const decryptedData = Buffer.concat([decipher.update(fileData), decipher.final()]);
      return JSON.parse(decryptedData.toString());
  } catch (error) {
    log.info('Ошибка при чтении или парсинге файла:', error.message);
      console.error('Ошибка при чтении или парсинге файла:', error.message);
      return null;
  }
}

module.exports = {
    writeEncryptedFile,
    readEncryptedFile,
};
