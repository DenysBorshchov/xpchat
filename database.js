// XPchat Pro - Модуль базы данных
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'data', 'xpchat.db');
        this.db = null;
        this.init();
    }

    async init() {
        try {
            // Создаем папку для данных если её нет
            await fs.ensureDir(path.dirname(this.dbPath));
            
            // Подключаемся к базе данных
            this.db = new sqlite3.Database(this.dbPath);
            
            // Создаем таблицы
            await this.createTables();
            
            console.log('✅ База данных инициализирована');
        } catch (error) {
            console.error('❌ Ошибка инициализации базы данных:', error);
        }
    }

    createTables() {
        return new Promise((resolve, reject) => {
            const tables = [
                // Таблица пользователей
                `CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE,
                    password_hash TEXT,
                    avatar TEXT,
                    status TEXT DEFAULT 'offline',
                    last_seen INTEGER,
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
                )`,

                // Таблица чатов
                `CREATE TABLE IF NOT EXISTS chats (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    type TEXT DEFAULT 'personal',
                    created_by TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
                    FOREIGN KEY (created_by) REFERENCES users (id)
                )`,

                // Таблица участников чатов
                `CREATE TABLE IF NOT EXISTS chat_participants (
                    chat_id TEXT,
                    user_id TEXT,
                    role TEXT DEFAULT 'member',
                    joined_at INTEGER DEFAULT (strftime('%s', 'now')),
                    PRIMARY KEY (chat_id, user_id),
                    FOREIGN KEY (chat_id) REFERENCES chats (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )`,

                // Таблица сообщений
                `CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    chat_id TEXT NOT NULL,
                    sender_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    type TEXT DEFAULT 'text',
                    file_path TEXT,
                    file_name TEXT,
                    file_size INTEGER,
                    reply_to TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
                    FOREIGN KEY (chat_id) REFERENCES chats (id),
                    FOREIGN KEY (sender_id) REFERENCES users (id),
                    FOREIGN KEY (reply_to) REFERENCES messages (id)
                )`,

                // Таблица звонков
                `CREATE TABLE IF NOT EXISTS calls (
                    id TEXT PRIMARY KEY,
                    caller_id TEXT NOT NULL,
                    receiver_id TEXT NOT NULL,
                    call_type TEXT DEFAULT 'audio',
                    status TEXT DEFAULT 'initiated',
                    start_time INTEGER,
                    end_time INTEGER,
                    duration INTEGER,
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    FOREIGN KEY (caller_id) REFERENCES users (id),
                    FOREIGN KEY (receiver_id) REFERENCES users (id)
                )`,

                // Таблица настроек пользователей
                `CREATE TABLE IF NOT EXISTS user_settings (
                    user_id TEXT PRIMARY KEY,
                    theme TEXT DEFAULT 'auto',
                    font_size TEXT DEFAULT 'medium',
                    notifications_enabled BOOLEAN DEFAULT 1,
                    sound_enabled BOOLEAN DEFAULT 1,
                    language TEXT DEFAULT 'ru',
                    timezone TEXT DEFAULT 'Europe/Moscow',
                    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )`,

                // Таблица AI разговоров
                `CREATE TABLE IF NOT EXISTS ai_conversations (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    title TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )`,

                // Таблица AI сообщений
                `CREATE TABLE IF NOT EXISTS ai_messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    tokens_used INTEGER,
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    FOREIGN KEY (conversation_id) REFERENCES ai_conversations (id)
                )`
            ];

            let completed = 0;
            const total = tables.length;

            tables.forEach((sql, index) => {
                this.db.run(sql, (err) => {
                    if (err) {
                        console.error(`❌ Ошибка создания таблицы ${index + 1}:`, err);
                        reject(err);
                    } else {
                        completed++;
                        if (completed === total) {
                            console.log('✅ Все таблицы созданы');
                            resolve();
                        }
                    }
                });
            });
        });
    }

    // Методы для работы с пользователями
    async createUser(userData) {
        return new Promise((resolve, reject) => {
            const { id, username, email, passwordHash, avatar } = userData;
            const sql = `
                INSERT INTO users (id, username, email, password_hash, avatar, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
            `;
            
            this.db.run(sql, [id, username, email, passwordHash, avatar], function(err) {
                if (err) {
                    reject(err);
                } else {
                    // Создаем настройки по умолчанию
                    this.createUserSettings(id);
                    resolve({ id, username, email, avatar });
                }
            }.bind(this));
        });
    }

    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM users WHERE id = ?';
            this.db.get(sql, [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM users WHERE username = ?';
            this.db.get(sql, [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async updateUserStatus(userId, status) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE users 
                SET status = ?, last_seen = strftime('%s', 'now'), updated_at = strftime('%s', 'now')
                WHERE id = ?
            `;
            this.db.run(sql, [status, userId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    async getAllUsers() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT id, username, email, avatar, status, last_seen FROM users ORDER BY username';
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Методы для работы с чатами
    async createChat(chatData) {
        return new Promise((resolve, reject) => {
            const { id, name, type, createdBy } = chatData;
            const sql = `
                INSERT INTO chats (id, name, type, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
            `;
            
            this.db.run(sql, [id, name, type, createdBy], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, name, type, createdBy });
                }
            });
        });
    }

    async addChatParticipant(chatId, userId, role = 'member') {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO chat_participants (chat_id, user_id, role, joined_at)
                VALUES (?, ?, ?, strftime('%s', 'now'))
            `;
            
            this.db.run(sql, [chatId, userId, role], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    async getChatParticipants(chatId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT u.id, u.username, u.avatar, u.status, cp.role, cp.joined_at
                FROM chat_participants cp
                JOIN users u ON cp.user_id = u.id
                WHERE cp.chat_id = ?
                ORDER BY cp.joined_at
            `;
            
            this.db.all(sql, [chatId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getUserChats(userId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT c.*, cp.role, 
                       (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as message_count,
                       (SELECT m.content FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
                FROM chat_participants cp
                JOIN chats c ON cp.chat_id = c.id
                WHERE cp.user_id = ?
                ORDER BY c.updated_at DESC
            `;
            
            this.db.all(sql, [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Методы для работы с сообщениями
    async saveMessage(messageData) {
        return new Promise((resolve, reject) => {
            const { id, chatId, senderId, content, type, filePath, fileName, fileSize, replyTo } = messageData;
            const sql = `
                INSERT INTO messages (id, chat_id, sender_id, content, type, file_path, file_name, file_size, reply_to, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
            `;
            
            this.db.run(sql, [id, chatId, senderId, content, type, filePath, fileName, fileSize, replyTo], function(err) {
                if (err) {
                    reject(err);
                } else {
                    // Обновляем время последнего сообщения в чате
                    this.updateChatLastMessage(chatId);
                    resolve({ id, chatId, senderId, content, type });
                }
            }.bind(this));
        });
    }

    async getChatMessages(chatId, limit = 50, offset = 0) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT m.*, u.username as sender_name, u.avatar as sender_avatar
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.chat_id = ?
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?
            `;
            
            this.db.all(sql, [chatId, limit, offset], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.reverse()); // Возвращаем в хронологическом порядке
            });
        });
    }

    async updateChatLastMessage(chatId) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE chats 
                SET updated_at = strftime('%s', 'now')
                WHERE id = ?
            `;
            this.db.run(sql, [chatId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    // Методы для работы с настройками пользователей
    async createUserSettings(userId) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO user_settings (user_id, theme, font_size, notifications_enabled, sound_enabled, language, timezone, updated_at)
                VALUES (?, 'auto', 'medium', 1, 1, 'ru', 'Europe/Moscow', strftime('%s', 'now'))
            `;
            
            this.db.run(sql, [userId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    async getUserSettings(userId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM user_settings WHERE user_id = ?';
            this.db.get(sql, [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async updateUserSettings(userId, settings) {
        return new Promise((resolve, reject) => {
            const { theme, fontSize, notificationsEnabled, soundEnabled, language, timezone } = settings;
            const sql = `
                UPDATE user_settings 
                SET theme = ?, font_size = ?, notifications_enabled = ?, sound_enabled = ?, language = ?, timezone = ?, updated_at = strftime('%s', 'now')
                WHERE user_id = ?
            `;
            
            this.db.run(sql, [theme, fontSize, notificationsEnabled, soundEnabled, language, timezone, userId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    // Методы для работы с AI разговорами
    async createAIConversation(conversationData) {
        return new Promise((resolve, reject) => {
            const { id, userId, provider, title } = conversationData;
            const sql = `
                INSERT INTO ai_conversations (id, user_id, provider, title, created_at, updated_at)
                VALUES (?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
            `;
            
            this.db.run(sql, [id, userId, provider, title], function(err) {
                if (err) reject(err);
                else resolve({ id, userId, provider, title });
            });
        });
    }

    async saveAIMessage(messageData) {
        return new Promise((resolve, reject) => {
            const { id, conversationId, role, content, tokensUsed } = messageData;
            const sql = `
                INSERT INTO ai_messages (id, conversation_id, role, content, tokens_used, created_at)
                VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
            `;
            
            this.db.run(sql, [id, conversationId, role, content, tokensUsed], function(err) {
                if (err) reject(err);
                else resolve({ id, conversationId, role, content });
            });
        });
    }

    async getAIConversation(conversationId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT c.*, 
                       (SELECT COUNT(*) FROM ai_messages m WHERE m.conversation_id = c.id) as message_count
                FROM ai_conversations c
                WHERE c.id = ?
            `;
            
            this.db.get(sql, [conversationId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getUserAIConversations(userId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT c.*, 
                       (SELECT COUNT(*) FROM ai_messages m WHERE m.conversation_id = c.id) as message_count,
                       (SELECT m.content FROM ai_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
                FROM ai_conversations c
                WHERE c.user_id = ?
                ORDER BY c.updated_at DESC
            `;
            
            this.db.all(sql, [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getAIConversationMessages(conversationId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM ai_messages 
                WHERE conversation_id = ?
                ORDER BY created_at ASC
            `;
            
            this.db.all(sql, [conversationId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Методы для работы со звонками
    async saveCall(callData) {
        return new Promise((resolve, reject) => {
            const { id, callerId, receiverId, callType, status, startTime, endTime, duration } = callData;
            const sql = `
                INSERT INTO calls (id, caller_id, receiver_id, call_type, status, start_time, end_time, duration, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
            `;
            
            this.db.run(sql, [id, callerId, receiverId, callType, status, startTime, endTime, duration], function(err) {
                if (err) reject(err);
                else resolve({ id, callerId, receiverId, callType, status });
            });
        });
    }

    async updateCallStatus(callId, status, endTime = null, duration = null) {
        return new Promise((resolve, reject) => {
            let sql, params;
            
            if (endTime && duration) {
                sql = `
                    UPDATE calls 
                    SET status = ?, end_time = ?, duration = ?
                    WHERE id = ?
                `;
                params = [status, endTime, duration, callId];
            } else {
                sql = `
                    UPDATE calls 
                    SET status = ?
                    WHERE id = ?
                `;
                params = [status, callId];
            }
            
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    async getUserCallHistory(userId, limit = 20) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT c.*, 
                       u1.username as caller_name, u1.avatar as caller_avatar,
                       u2.username as receiver_name, u2.avatar as receiver_avatar
                FROM calls c
                JOIN users u1 ON c.caller_id = u1.id
                JOIN users u2 ON c.receiver_id = u2.id
                WHERE c.caller_id = ? OR c.receiver_id = ?
                ORDER BY c.created_at DESC
                LIMIT ?
            `;
            
            this.db.all(sql, [userId, userId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Закрытие соединения с базой данных
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Ошибка закрытия базы данных:', err);
                } else {
                    console.log('✅ Соединение с базой данных закрыто');
                }
            });
        }
    }

    // Резервное копирование базы данных
    async backup(backupPath) {
        try {
            await fs.copy(this.dbPath, backupPath);
            console.log(`✅ Резервная копия создана: ${backupPath}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка создания резервной копии:', error);
            return false;
        }
    }

    // Восстановление из резервной копии
    async restore(backupPath) {
        try {
            await fs.copy(backupPath, this.dbPath);
            console.log(`✅ База данных восстановлена из: ${backupPath}`);
            return true;
        } catch (error) {
            console.error('❌ Ошибка восстановления базы данных:', error);
            return false;
        }
    }
}

module.exports = Database;
