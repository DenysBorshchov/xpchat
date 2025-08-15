// XPchat Pro - Сервер для онлайн работы
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Импорт модулей
const Database = require('./database');
const FileManager = require('./file-manager');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Инициализация модулей
const db = new Database();
const fileManager = new FileManager();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// Статические файлы для загрузок
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// JWT секрет
const JWT_SECRET = process.env.JWT_SECRET || 'xpchat-pro-secret-key-2024';

// Хранилище данных в памяти (для активных соединений)
const onlineUsers = new Set();
const connections = new Map();

// Обработка WebSocket соединений
wss.on('connection', (ws, req) => {
    console.log('Новое WebSocket соединение');
    
    let userId = null;
    let userName = null;
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data, userId, userName);
        } catch (error) {
            console.error('Ошибка обработки сообщения:', error);
        }
    });
    
    ws.on('close', async () => {
        if (userId) {
            try {
                // Обновляем статус пользователя в базе данных
                await db.updateUserStatus(userId, 'offline');
                
                // Удаляем из онлайн пользователей
                onlineUsers.delete(userId);
                connections.delete(userId);
                
                // Уведомляем других пользователей
                await broadcastUserStatus(userId, false);
                
                console.log(`Пользователь ${userName} (${userId}) отключился`);
            } catch (error) {
                console.error('❌ Ошибка при отключении пользователя:', error);
            }
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket ошибка:', error);
    });
});

// Обработка WebSocket сообщений
function handleWebSocketMessage(ws, data, userId, userName) {
    switch (data.type) {
        case 'auth':
            handleAuth(ws, data, userId, userName);
            break;
        case 'message':
            handleMessage(ws, data, userId);
            break;
        case 'typing':
            handleTyping(ws, data, userId);
            break;
        case 'call_offer':
            handleCallOffer(ws, data, userId);
            break;
        case 'call_answer':
            handleCallAnswer(ws, data, userId);
            break;
        case 'call_rejection':
            handleCallRejection(ws, data, userId);
            break;
        case 'ice_candidate':
            handleIceCandidate(ws, data, userId);
            break;
        case 'call_end':
            handleCallEnd(ws, data, userId);
            break;
        case 'user_status':
            handleUserStatus(ws, data, userId);
            break;
        default:
            console.log('Неизвестный тип сообщения:', data.type);
    }
}

// Аутентификация пользователя
async function handleAuth(ws, data, userId, userName) {
    try {
        // Проверяем существующего пользователя или создаем нового
        let user = null;
        
        if (data.userId) {
            user = await db.getUserById(data.userId);
        }
        
        if (!user) {
            // Создаем нового пользователя
            const newUserId = uuidv4();
            const newUserName = data.userName || `Пользователь_${Math.floor(Math.random() * 10000)}`;
            
            user = await db.createUser({
                id: newUserId,
                username: newUserName,
                email: data.email || null,
                passwordHash: null, // Для гостевого доступа
                avatar: data.avatar || null
            });
            
            userId = newUserId;
            userName = newUserName;
        } else {
            userId = user.id;
            userName = user.username;
        }
        
        // Обновляем статус пользователя
        await db.updateUserStatus(userId, 'online');
        
        // Добавляем в онлайн пользователей
        onlineUsers.add(userId);
        connections.set(userId, ws);
        
        // Отправляем подтверждение аутентификации
        ws.send(JSON.stringify({
            type: 'auth_success',
            userId: userId,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                status: 'online'
            }
        }));
        
        // Уведомляем других пользователей
        broadcastUserStatus(userId, true);
        
        // Отправляем список онлайн пользователей
        const onlineUsersList = await getOnlineUsersList();
        ws.send(JSON.stringify({
            type: 'online_users',
            users: onlineUsersList
        }));
        
        console.log(`Пользователь ${userName} (${userId}) аутентифицирован`);
    } catch (error) {
        console.error('❌ Ошибка аутентификации:', error);
        ws.send(JSON.stringify({
            type: 'auth_error',
            error: 'Ошибка аутентификации'
        }));
    }
}

// Обработка сообщений
async function handleMessage(ws, data, userId) {
    if (!userId) return;
    
    try {
        const user = await db.getUserById(userId);
        if (!user) return;
        
        const message = {
            id: generateMessageId(),
            chatId: data.chatId || 'general',
            senderId: userId,
            content: data.content,
            type: data.messageType || 'text',
            filePath: data.filePath || null,
            fileName: data.fileName || null,
            fileSize: data.fileSize || null,
            replyTo: data.replyTo || null
        };
        
        // Сохраняем сообщение в базе данных
        await db.saveMessage(message);
        
        // Отправляем сообщение всем участникам чата
        broadcastMessage({
            ...message,
            senderName: user.username,
            senderAvatar: user.avatar,
            timestamp: Date.now()
        });
        
        console.log(`Новое сообщение от ${user.username}: ${message.content}`);
    } catch (error) {
        console.error('❌ Ошибка обработки сообщения:', error);
    }
}

// Обработка набора текста
function handleTyping(ws, data, userId) {
    if (!userId) return;
    
    const typingData = {
        type: 'typing',
        userId: userId,
        userName: users.get(userId)?.name || 'Неизвестный',
        chatId: data.chatId || 'general',
        isTyping: data.isTyping
    };
    
    broadcastTyping(typingData);
}

// Обработка предложения звонка
async function handleCallOffer(ws, data, userId) {
    if (!userId) return;
    
    try {
        const user = await db.getUserById(userId);
        if (!user) return;
        
        // Создаем запись о звонке в базе данных
        const callId = uuidv4();
        await db.saveCall({
            id: callId,
            callerId: userId,
            receiverId: data.toUserId,
            callType: data.callType || 'audio',
            status: 'initiated',
            startTime: Date.now()
        });
        
        const callData = {
            type: 'call_offer',
            callId: callId,
            fromUserId: userId,
            fromUserName: user.username,
            toUserId: data.toUserId,
            offer: data.offer,
            callType: data.callType || 'audio'
        };
        
        // Отправляем предложение конкретному пользователю
        const targetConnection = connections.get(data.toUserId);
        if (targetConnection) {
            targetConnection.send(JSON.stringify(callData));
        }
    } catch (error) {
        console.error('❌ Ошибка обработки предложения звонка:', error);
    }
}

// Обработка ответа на звонок
function handleCallAnswer(ws, data, userId) {
    if (!userId) return;
    
    const answerData = {
        type: 'call_answer',
        fromUserId: userId,
        fromUserName: users.get(userId)?.name || 'Неизвестный',
        toUserId: data.toUserId,
        answer: data.answer
    };
    
    // Отправляем ответ конкретному пользователю
    const targetConnection = connections.get(data.toUserId);
    if (targetConnection) {
        targetConnection.send(JSON.stringify(answerData));
    }
}

// Обработка отклонения звонка
function handleCallRejection(ws, data, userId) {
    if (!userId) return;
    
    const rejectionData = {
        type: 'call_rejection',
        fromUserId: userId,
        fromUserName: users.get(userId)?.name || 'Неизвестный',
        toUserId: data.toUserId
    };
    
    // Отправляем отклонение конкретному пользователю
    const targetConnection = connections.get(data.toUserId);
    if (targetConnection) {
        targetConnection.send(JSON.stringify(rejectionData));
    }
}

// Обработка ICE кандидатов
function handleIceCandidate(ws, data, userId) {
    if (!userId) return;
    
    const candidateData = {
        type: 'ice_candidate',
        fromUserId: userId,
        toUserId: data.toUserId,
        candidate: data.candidate
    };
    
    // Отправляем ICE кандидат конкретному пользователю
    const targetConnection = connections.get(data.toUserId);
    if (targetConnection) {
        targetConnection.send(JSON.stringify(candidateData));
    }
}

// Обработка завершения звонка
async function handleCallEnd(ws, data, userId) {
    if (!userId) return;
    
    try {
        const user = await db.getUserById(userId);
        if (!user) return;
        
        // Обновляем статус звонка в базе данных
        if (data.callId) {
            const endTime = Date.now();
            const duration = Math.floor((endTime - data.startTime) / 1000); // в секундах
            
            await db.updateCallStatus(data.callId, 'ended', endTime, duration);
        }
        
        const endData = {
            type: 'call_end',
            callId: data.callId,
            fromUserId: userId,
            fromUserName: user.username,
            toUserId: data.toUserId
        };
        
        // Отправляем уведомление о завершении конкретному пользователю
        const targetConnection = connections.get(data.toUserId);
        if (targetConnection) {
            targetConnection.send(JSON.stringify(endData));
        }
    } catch (error) {
        console.error('❌ Ошибка обработки завершения звонка:', error);
    }
}

// Обработка статуса пользователя
async function handleUserStatus(ws, data, userId) {
    if (!userId) return;
    
    try {
        const status = data.status || 'online';
        await db.updateUserStatus(userId, status);
        
        // Уведомляем других пользователей об изменении статуса
        broadcastUserStatus(userId, status === 'online');
    } catch (error) {
        console.error('❌ Ошибка обновления статуса пользователя:', error);
    }
}

// Широковещательная отправка сообщений
function broadcastMessage(message) {
    const messageData = JSON.stringify({
        type: 'new_message',
        message: message
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageData);
        }
    });
}

// Широковещательная отправка статуса набора текста
function broadcastTyping(typingData) {
    const data = JSON.stringify(typingData);
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// Широковещательная отправка статуса пользователя
async function broadcastUserStatus(userId, isOnline) {
    try {
        const user = await db.getUserById(userId);
        if (!user) return;
        
        const statusData = JSON.stringify({
            type: 'user_status_change',
            userId: userId,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                status: isOnline ? 'online' : 'offline',
                lastSeen: user.last_seen
            },
            isOnline: isOnline
        });
        
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(statusData);
            }
        });
    } catch (error) {
        console.error('❌ Ошибка отправки статуса пользователя:', error);
    }
}

// Вспомогательные функции
async function getOnlineUsersList() {
    try {
        const onlineUsersArray = Array.from(onlineUsers);
        const usersList = [];
        
        for (const userId of onlineUsersArray) {
            const user = await db.getUserById(userId);
            if (user) {
                usersList.push({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    status: 'online',
                    lastSeen: user.last_seen
                });
            }
        }
        
        return usersList;
    } catch (error) {
        console.error('❌ Ошибка получения списка онлайн пользователей:', error);
        return [];
    }
}

// Генерация ID сообщения
function generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// API маршруты для пользователей
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Ошибка получения пользователей' });
    }
});

app.get('/api/users/:userId', async (req, res) => {
    try {
        const user = await db.getUserById(req.params.userId);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('❌ Ошибка получения пользователя:', error);
        res.status(500).json({ error: 'Ошибка получения пользователя' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, email, password, avatar } = req.body;
        
        // Проверяем уникальность username
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
        }
        
        // Хешируем пароль если он есть
        const passwordHash = password ? await bcrypt.hash(password, 10) : null;
        
        const user = await db.createUser({
            id: uuidv4(),
            username,
            email,
            passwordHash,
            avatar
        });
        
        res.status(201).json(user);
    } catch (error) {
        console.error('❌ Ошибка создания пользователя:', error);
        res.status(500).json({ error: 'Ошибка создания пользователя' });
    }
});

// API маршруты для чатов
app.get('/api/chats', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'Не указан ID пользователя' });
        }
        
        const chats = await db.getUserChats(userId);
        res.json(chats);
    } catch (error) {
        console.error('❌ Ошибка получения чатов:', error);
        res.status(500).json({ error: 'Ошибка получения чатов' });
    }
});

app.post('/api/chats', async (req, res) => {
    try {
        const { name, type, createdBy, participants } = req.body;
        
        const chat = await db.createChat({
            id: uuidv4(),
            name,
            type: type || 'personal',
            createdBy
        });
        
        // Добавляем участников
        if (participants && Array.isArray(participants)) {
            for (const participantId of participants) {
                await db.addChatParticipant(chat.id, participantId);
            }
        }
        
        // Добавляем создателя как участника
        await db.addChatParticipant(chat.id, createdBy, 'admin');
        
        res.status(201).json(chat);
    } catch (error) {
        console.error('❌ Ошибка создания чата:', error);
        res.status(500).json({ error: 'Ошибка создания чата' });
    }
});

// API маршруты для сообщений
app.get('/api/messages/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const messages = await db.getChatMessages(chatId, parseInt(limit), parseInt(offset));
        res.json(messages);
    } catch (error) {
        console.error('❌ Ошибка получения сообщений:', error);
        res.status(500).json({ error: 'Ошибка получения сообщений' });
    }
});

// API маршруты для загрузки файлов
app.post('/api/upload/avatar', fileManager.getUploadMiddleware('avatar', 1), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        const file = req.files[0];
        const userId = req.body.userId;
        
        if (!userId) {
            return res.status(400).json({ error: 'Не указан ID пользователя' });
        }
        
        const avatarInfo = await fileManager.uploadAvatar(userId, file);
        
        res.json({
            success: true,
            avatar: avatarInfo
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки аватара:', error);
        res.status(500).json({ error: 'Ошибка загрузки аватара' });
    }
});

app.post('/api/upload/chat', fileManager.getUploadMiddleware('file', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Файлы не загружены' });
        }
        
        const files = req.files;
        const chatId = req.body.chatId;
        const senderId = req.body.senderId;
        
        if (!chatId || !senderId) {
            return res.status(400).json({ error: 'Не указаны ID чата или отправителя' });
        }
        
        const uploadedFiles = [];
        
        for (const file of files) {
            const fileInfo = await fileManager.uploadChatFile(file, chatId, senderId);
            uploadedFiles.push(fileInfo);
        }
        
        res.json({
            success: true,
            files: uploadedFiles
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки файлов:', error);
        res.status(500).json({ error: 'Ошибка загрузки файлов' });
    }
});

// API маршруты для настроек пользователей
app.get('/api/users/:userId/settings', async (req, res) => {
    try {
        const settings = await db.getUserSettings(req.params.userId);
        if (settings) {
            res.json(settings);
        } else {
            res.status(404).json({ error: 'Настройки не найдены' });
        }
    } catch (error) {
        console.error('❌ Ошибка получения настроек:', error);
        res.status(500).json({ error: 'Ошибка получения настроек' });
    }
});

app.put('/api/users/:userId/settings', async (req, res) => {
    try {
        const { theme, fontSize, notificationsEnabled, soundEnabled, language, timezone } = req.body;
        
        const result = await db.updateUserSettings(req.params.userId, {
            theme,
            fontSize,
            notificationsEnabled,
            soundEnabled,
            language,
            timezone
        });
        
        if (result > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('❌ Ошибка обновления настроек:', error);
        res.status(500).json({ error: 'Ошибка обновления настроек' });
    }
});

// API маршруты для AI разговоров
app.get('/api/ai/conversations/:userId', async (req, res) => {
    try {
        const conversations = await db.getUserAIConversations(req.params.userId);
        res.json(conversations);
    } catch (error) {
        console.error('❌ Ошибка получения AI разговоров:', error);
        res.status(500).json({ error: 'Ошибка получения AI разговоров' });
    }
});

app.get('/api/ai/conversations/:conversationId/messages', async (req, res) => {
    try {
        const messages = await db.getAIConversationMessages(req.params.conversationId);
        res.json(messages);
    } catch (error) {
        console.error('❌ Ошибка получения AI сообщений:', error);
        res.status(500).json({ error: 'Ошибка получения AI сообщений' });
    }
});

// API маршруты для звонков
app.get('/api/calls/:userId', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const calls = await db.getUserCallHistory(req.params.userId, parseInt(limit));
        res.json(calls);
    } catch (error) {
        console.error('❌ Ошибка получения истории звонков:', error);
        res.status(500).json({ error: 'Ошибка получения истории звонков' });
    }
});

// API маршруты для статистики
app.get('/api/stats/files', async (req, res) => {
    try {
        const stats = await fileManager.getFileStats();
        res.json(stats);
    } catch (error) {
        console.error('❌ Ошибка получения статистики файлов:', error);
        res.status(500).json({ error: 'Ошибка получения статистики файлов' });
    }
});

// API маршруты для резервного копирования
app.post('/api/backup/create', async (req, res) => {
    try {
        const backupPath = path.join(__dirname, 'backups', `backup_${Date.now()}`);
        
        // Создаем резервную копию базы данных
        await db.backup(backupPath + '.db');
        
        // Создаем резервную копию файлов
        await fileManager.createBackup(backupPath + '_files');
        
        res.json({
            success: true,
            backupPath: backupPath
        });
    } catch (error) {
        console.error('❌ Ошибка создания резервной копии:', error);
        res.status(500).json({ error: 'Ошибка создания резервной копии' });
    }
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('🚀 XPchat Pro v2.0 - Производственный сервер запущен!');
    console.log(`📱 Приложение доступно по адресу: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket сервер: ws://localhost:${PORT}`);
    console.log(`💾 База данных: SQLite (${db.dbPath})`);
    console.log(`📁 Файловое хранилище: ${fileManager.uploadDir}`);
    console.log(`🔐 JWT секрет: ${JWT_SECRET.substring(0, 10)}...`);
    console.log('✅ Все модули инициализированы');
    console.log('🌐 Готов к работе в продакшене!');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Получен сигнал SIGTERM, завершение работы...');
    
    try {
        // Закрываем все WebSocket соединения
        wss.clients.forEach(client => {
            client.close();
        });
        
        // Закрываем сервер
        server.close(() => {
            console.log('Сервер успешно остановлен');
        });
        
        // Закрываем базу данных
        db.close();
        
        // Очищаем временные файлы
        await fileManager.cleanupTempFiles();
        
        console.log('✅ Все ресурсы освобождены');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при завершении работы:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('Получен сигнал SIGINT, завершение работы...');
    
    try {
        // Закрываем все WebSocket соединения
        wss.clients.forEach(client => {
            client.close();
        });
        
        // Закрываем сервер
        server.close(() => {
            console.log('Сервер успешно остановлен');
        });
        
        // Закрываем базу данных
        db.close();
        
        // Очищаем временные файлы
        await fileManager.cleanupTempFiles();
        
        console.log('✅ Все ресурсы освобождены');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при завершении работы:', error);
        process.exit(1);
    }
});

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
    console.error('❌ Необработанная ошибка:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Необработанное отклонение промиса:', reason);
    process.exit(1);
});
