require('dotenv').config();
const mongoose = require('mongoose');
const Department = require('./models/department'); // Убедитесь, что путь к модели корректный

const createDepartment = async () => {
    try {
        // Подключение к базе данных
        await mongoose.connect('mongodb://46.161.40.192:27017/rubikomconnect', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Подключение к базе данных установлено.');

        // Создание подразделения
        const department = new Department({
            name: 'Центральный офис',
            divisions: [
                { name: 'IT Отдел' },
                { name: 'Касса' },
                { name: 'Бухгалтерия (4 этаж)' },
                { name: 'СЭБ' },
                { name: 'Экономисты' },
                { name: 'Полеводы' },
                { name: 'Бухгалтерия (2 этаж)' },
                { name: 'Секретариат Руфа' },
                { name: 'Секретариат генерального директора' },
                { name: 'Юристы (4 этаж)' },
                { name: 'Нач. юристов (3 этаж)' },
                { name: 'Экологи (3 этаж)' },
                { name: 'ПТО (3 этаж)' },
                { name: 'Проектный отдел (3 этаж)' },
                { name: 'Снабжение Гарант (3 этаж)' },
                { name: 'Снабжение рубиком (3 этаж)' },
            ],
        });

        // Сохранение в базу данных
        await department.save();
        console.log('Подразделение "Центральный офис" успешно создано.');

        // Закрываем соединение
        await mongoose.disconnect();
        console.log('Соединение с базой данных закрыто.');
    } catch (error) {
        console.error('Ошибка при создании подразделения:', error.message);
    }
};

createDepartment();
