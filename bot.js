const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Замените на ваш токен от BotFather
const token = '7671395940:AAHwqDqy-PD8OfhFdjvCIjTE2u2yQ2yZ7wo';
const bot = new TelegramBot(token, { polling: true });

// URL вашего локального сайта
const baseUrl = 'http://localhost:3000';

// Хранилище для сессионного токена
let sessionToken = null;

// Определение команд для меню
const commands = [
    { command: 'login', description: 'Войти в систему: /login <login> <password>' },
    { command: 'logout', description: 'Выйти из учетной записи' },
    { command: 'list', description: 'Показать список задач' },
    { command: 'add', description: 'Добавить задачу: /add <текст>' },
    { command: 'delete', description: 'Удалить задачу: /delete <id>' },
    { command: 'showcom', description: 'Показать доступные команды' }
];

// Установка команд в меню
bot.setMyCommands(commands)
    .then(() => console.log('Команды успешно установлены в меню.'))
    .catch((error) => console.error('Ошибка при установке команд:', error));

// Функция для входа в систему
bot.onText(/\/login (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const login = match[1];
    const password = match[2];
    try {
        const response = await axios.post('http://localhost:3000/login', {
            login: login,
            password: password
        });
        sessionToken = response.data.token;
        console.log('Авторизация успешна, токен:', sessionToken);
        bot.sendMessage(chatId, 'Авторизация успешна.');
    } catch (error) {
        console.error('Ошибка авторизации:', error.message);
        bot.sendMessage(chatId, 'Ошибка авторизации. Неверный логин или пароль.');
    }
});

// Команда /logout - выход из учетной записи
bot.onText(/\/logout/, (msg) => {
    const chatId = msg.chat.id;
    sessionToken = null;
    bot.sendMessage(chatId, 'Вы успешно вышли из учетной записи.');
});

// Команда /showcom - показать доступные команды
bot.onText(/\/showcom/, (msg) => {
    const chatId = msg.chat.id;
    const commands = `
Доступные команды:
- /login <login> <password> - Войти в систему
- /logout - Выйти из учетной записи
- /list - Показать список задач
- /add <текст> - Добавить задачу
- /delete <id> - Удалить задачу по ID
- /showcom - Показать доступные команды
    `;
    bot.sendMessage(chatId, commands);
});

// Команда /list - показать список задач
bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    if (!sessionToken) {
        bot.sendMessage(chatId, 'Ошибка: вы не авторизованы. Используйте /login <login> <password>.');
        return;
    }
    try {
        console.log('Sending request with token:', sessionToken);
        const response = await axios.get('http://localhost:3000/api/items', {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        console.log('Response:', response.data);
        const items = response.data;
        const message = items.length > 0 
            ? items.map(item => `${item.id}: ${item.text}`).join('\n')
            : 'Список пуст.';
        bot.sendMessage(chatId, message);
    } catch (error) {
        console.error('Ошибка получения списка:', error.response ? error.response.data : error.message);
        bot.sendMessage(chatId, 'Ошибка получения списка.');
    }
});

// Команда /add - добавить задачу
bot.onText(/\/add (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!sessionToken) {
        bot.sendMessage(chatId, 'Ошибка: вы не авторизованы. Используйте /login <login> <password>.');
        return;
    }
    const text = match[1];
    try {
        await axios.post(`${baseUrl}/add`, { text }, {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        bot.sendMessage(chatId, 'Задача добавлена.');
    } catch (error) {
        console.error('Ошибка добавления задачи:', error.response ? error.response.data : error.message);
        bot.sendMessage(chatId, 'Ошибка добавления задачи.');
    }
});

// Команда /delete - удалить задачу по ID
bot.onText(/\/delete (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!sessionToken) {
        bot.sendMessage(chatId, 'Ошибка: вы не авторизованы. Используйте /login <login> <password>.');
        return;
    }
    const id = match[1];
    try {
        await axios.post(`${baseUrl}/delete`, { id }, {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        bot.sendMessage(chatId, 'Задача удалена.');
    } catch (error) {
        console.error('Ошибка удаления задачи:', error.response ? error.response.data : error.message);
        bot.sendMessage(chatId, 'Ошибка удаления задачи.');
    }
});

console.log('Бот запущен...');