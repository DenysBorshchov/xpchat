// XPchat Pro v2.0 - Основной скрипт для PWA
class XPchatPro {
    constructor() {
        this.currentUser = null;
        this.chats = new Map();
        this.messages = new Map();
        this.onlineUsers = new Set();
        this.currentChat = null;
        this.isTyping = false;
        this.typingTimeout = null;
        
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.setupPWA();
        this.loadChats();
        this.setupAI();
        this.setupWebRTC();
        this.setupNotifications();
        
        console.log('🚀 XPchat Pro v2.0 инициализирован');
    }

    // Загрузка данных пользователя
    loadUserData() {
        const savedUser = localStorage.getItem('xpchat_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updateUserInterface();
        } else {
            this.showLoginModal();
        }
    }

    // Сохранение данных пользователя
    saveUserData() {
        if (this.currentUser) {
            localStorage.setItem('xpchat_user', JSON.stringify(this.currentUser));
        }
    }

    // Показ модального окна входа
    showLoginModal() {
        const modal = document.createElement('div');
        modal.className = 'login-modal';
        modal.innerHTML = `
            <div class="login-content">
                <h2>Добро пожаловать в XPchat Pro!</h2>
                <div class="login-form">
                    <input type="text" id="username" placeholder="Ваше имя" maxlength="20">
                    <input type="email" id="email" placeholder="Email (опционально)">
                    <button id="loginBtn">Войти</button>
                </div>
                <p class="login-info">Введите имя для начала работы</p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.handleLogin();
        });
        
        document.getElementById('username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
    }

    // Обработка входа
    handleLogin() {
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        
        if (!username) {
            this.showNotification('Введите имя пользователя', 'error');
            return;
        }
        
        // Создаем пользователя
        this.currentUser = {
            id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            username: username,
            email: email || null,
            avatar: null,
            status: 'online',
            lastSeen: Date.now()
        };
        
        this.saveUserData();
        this.updateUserInterface();
        
        // Убираем модальное окно
        const modal = document.querySelector('.login-modal');
        if (modal) {
            modal.remove();
        }
        
        this.showNotification(`Добро пожаловать, ${username}!`, 'success');
        
        // Создаем демо чат
        this.createDemoChat();
    }

    // Создание демо чата
    createDemoChat() {
        const demoChat = {
            id: 'demo_chat',
            name: 'Демо чат',
            type: 'group',
            participants: [this.currentUser.id],
            messages: []
        };
        
        this.chats.set(demoChat.id, demoChat);
        this.messages.set(demoChat.id, []);
        
        // Добавляем приветственное сообщение
        const welcomeMessage = {
            id: 'welcome_msg',
            content: 'Добро пожаловать в XPchat Pro v2.0! 🎉\n\nЗдесь вы можете:\n• Отправлять сообщения\n• Использовать AI помощника\n• Делать звонки\n• Загружать файлы\n• Настраивать интерфейс',
            senderId: 'system',
            senderName: 'Система',
            timestamp: Date.now(),
            type: 'text'
        };
        
        this.messages.get(demoChat.id).push(welcomeMessage);
        this.loadChats();
        this.selectChat(demoChat.id);
    }

    // Обновление интерфейса пользователя
    updateUserInterface() {
        if (!this.currentUser) return;
        
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="user-avatar">
                    <img src="${this.currentUser.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiM2MzczODAiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTEyIDExQzE0LjIwOTEgMTEgMTYgOS4yMDkxIDx2IDE2QzE2IDkuMjA5MSAxNCAxMSAxMiAxMVoiIGZpbGw9IiNGRkYiLz4KPHBhdGggZD0iTTEyIDExQzEwLjg5NTQgMTEgMTAgMTIuODk1NCAxMCAxNFYxNkMxMCAxNy4xMDQ2IDEwLjg5NTQgMTggMTIgMThDMTMuMTA0NiAxOCAxNCAxNy4xMDQ2IDE0IDE2VjE0QzE0IDEyLjg5NTQgMTMuMTA0NiAxMSAxMiAxMVoiIGZpbGw9IiNGRkYiLz4KPC9zdmc+Cjwvc3ZnPgo='}" alt="Avatar">
                </div>
                <div class="user-details">
                    <div class="user-name">${this.currentUser.username}</div>
                    <div class="user-status">🟢 Онлайн</div>
                </div>
            `;
        }
        
        // Обновляем заголовок
        const header = document.querySelector('.chat-header h2');
        if (header) {
            header.textContent = `XPchat Pro - ${this.currentUser.username}`;
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Отправка сообщений
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            messageInput.addEventListener('input', () => {
                this.handleTyping();
            });
        }
        
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        // Создание нового чата
        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                this.showNewChatModal();
            });
        }
        
        // Настройки
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }
        
        // AI помощник
        const aiBtn = document.getElementById('aiBtn');
        if (aiBtn) {
            aiBtn.addEventListener('click', () => {
                this.openAIAssistant();
            });
        }
    }

    // Отправка сообщения
    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content || !this.currentChat) return;
        
        const message = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            content: content,
            senderId: this.currentUser.id,
            senderName: this.currentUser.username,
            timestamp: Date.now(),
            type: 'text'
        };
        
        // Добавляем сообщение в чат
        const chatMessages = this.messages.get(this.currentChat);
        if (chatMessages) {
            chatMessages.push(message);
            this.messages.set(this.currentChat, chatMessages);
        }
        
        // Отображаем сообщение
        this.displayMessage(message);
        
        // Очищаем поле ввода
        messageInput.value = '';
        
        // Сохраняем в localStorage
        this.saveChatData();
        
        // Останавливаем индикатор печати
        this.stopTyping();
    }

    // Отображение сообщения
    displayMessage(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.senderId === this.currentUser.id ? 'own' : 'other'}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">${message.senderName}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${this.formatMessage(message.content)}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Форматирование сообщения
    formatMessage(content) {
        // Эмодзи
        content = content.replace(/:\)/g, '😊')
                       .replace(/:\(/g, '😢')
                       .replace(/:D/g, '😄')
                       .replace(/;\)/g, '😉')
                       .replace(/<3/g, '❤️');
        
        // Переносы строк
        content = content.replace(/\n/g, '<br>');
        
        // Ссылки
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        
        return content;
    }

    // Обработка печати
    handleTyping() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        this.showTypingIndicator();
        
        // Останавливаем индикатор через 2 секунды
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 2000);
    }

    // Показ индикатора печати
    showTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'block';
            typingIndicator.textContent = `${this.currentUser.username} печатает...`;
        }
    }

    // Остановка индикатора печати
    stopTyping() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }
    }

    // Загрузка чатов
    loadChats() {
        const savedChats = localStorage.getItem('xpchat_chats');
        if (savedChats) {
            this.chats = new Map(JSON.parse(savedChats));
        }
        
        const savedMessages = localStorage.getItem('xpchat_messages');
        if (savedMessages) {
            this.messages = new Map(JSON.parse(savedMessages));
        }
        
        this.updateChatsList();
    }

    // Сохранение данных чатов
    saveChatData() {
        localStorage.setItem('xpchat_chats', JSON.stringify(Array.from(this.chats.entries())));
        localStorage.setItem('xpchat_messages', JSON.stringify(Array.from(this.messages.entries())));
    }

    // Обновление списка чатов
    updateChatsList() {
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) return;
        
        chatsList.innerHTML = '';
        
        this.chats.forEach((chat, chatId) => {
            const chatElement = document.createElement('div');
            chatElement.className = 'chat-item';
            chatElement.dataset.chatId = chatId;
            
            const lastMessage = this.messages.get(chatId);
            const lastMessageText = lastMessage && lastMessage.length > 0 
                ? lastMessage[lastMessage.length - 1].content 
                : 'Нет сообщений';
            
            chatElement.innerHTML = `
                <div class="chat-avatar">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiM2MzczODAiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTEyIDExQzE0LjIwOTEgMTEgMTYgOS4yMDkxIDx2IDE2QzE2IDkuMjA5MSAxNCAxMSAxMiAxMVoiIGZpbGw9IiNGRkYiLz4KPHBhdGggZD0iTTEyIDExQzEwLjg5NTQgMTEgMTAgMTIuODk1NCAxMCAxNFYxNkMxMCAxNy4xMDQ2IDEwLjg5NTQgMTggMTIgMThDMTMuMTA0NiAxOCAxNCAxNy4xMDQ2IDE0IDE2VjE0QzE0IDEyLjg5NTQgMTMuMTA0NiAxMSAxMiAxMVoiIGZpbGw9IiNGRkYiLz4KPC9zdmc+Cjwvc3ZnPgo=" alt="Chat">
                </div>
                <div class="chat-info">
                    <div class="chat-name">${chat.name}</div>
                    <div class="chat-last-message">${lastMessageText}</div>
                </div>
            `;
            
            chatElement.addEventListener('click', () => {
                this.selectChat(chatId);
            });
            
            chatsList.appendChild(chatElement);
        });
    }

    // Выбор чата
    selectChat(chatId) {
        this.currentChat = chatId;
        this.loadChatMessages(chatId);
        this.updateChatHeader(chatId);
        
        // Подсвечиваем выбранный чат
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedChat = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (selectedChat) {
            selectedChat.classList.add('active');
        }
    }

    // Загрузка сообщений чата
    loadChatMessages(chatId) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        
        const chatMessages = this.messages.get(chatId);
        if (chatMessages) {
            chatMessages.forEach(message => {
                this.displayMessage(message);
            });
        }
    }

    // Обновление заголовка чата
    updateChatHeader(chatId) {
        const chat = this.chats.get(chatId);
        if (!chat) return;
        
        const chatHeader = document.querySelector('.chat-header h3');
        if (chatHeader) {
            chatHeader.textContent = chat.name;
        }
    }

    // Показ модального окна нового чата
    showNewChatModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Новый чат</h3>
                <div class="form-group">
                    <label>Имя контакта:</label>
                    <input type="text" id="contactName" placeholder="Введите имя">
                </div>
                <div class="form-group">
                    <label>Телефон (опционально):</label>
                    <input type="tel" id="contactPhone" placeholder="+7 (999) 123-45-67">
                </div>
                <div class="form-group">
                    <label>Тип чата:</label>
                    <select id="chatType">
                        <option value="personal">Личный чат</option>
                        <option value="group">Групповой чат</option>
                        <option value="ai">AI Помощник</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
                    <button class="btn-primary" onclick="xpchat.createNewChat()">Создать чат</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Создание нового чата
    createNewChat() {
        const contactName = document.getElementById('contactName').value.trim();
        const contactPhone = document.getElementById('contactPhone').value.trim();
        const chatType = document.getElementById('chatType').value;
        
        if (!contactName) {
            this.showNotification('Введите имя контакта', 'error');
            return;
        }
        
        const chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const newChat = {
            id: chatId,
            name: contactName,
            type: chatType,
            participants: [this.currentUser.id],
            created: Date.now()
        };
        
        this.chats.set(chatId, newChat);
        this.messages.set(chatId, []);
        
        this.saveChatData();
        this.updateChatsList();
        this.selectChat(chatId);
        
        // Убираем модальное окно
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
        
        this.showNotification(`Чат "${contactName}" создан`, 'success');
    }

    // Показ настроек
    showSettings() {
        const modal = document.createElement('div');
        modal.className = 'modal settings-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Настройки XPchat Pro</h3>
                <div class="settings-section">
                    <h4>Внешний вид</h4>
                    <div class="form-group">
                        <label>Тема:</label>
                        <select id="themeSelect">
                            <option value="auto">Авто</option>
                            <option value="light">Светлая</option>
                            <option value="dark">Темная</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Размер шрифта:</label>
                        <select id="fontSizeSelect">
                            <option value="small">Маленький</option>
                            <option value="medium">Средний</option>
                            <option value="large">Большой</option>
                        </select>
                    </div>
                </div>
                <div class="settings-section">
                    <h4>Уведомления</h4>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="soundNotifications"> Звуковые уведомления
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="pushNotifications"> Push уведомления
                        </label>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
                    <button class="btn-primary" onclick="xpchat.saveSettings()">Сохранить</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Загружаем текущие настройки
        this.loadSettings();
    }

    // Загрузка настроек
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('xpchat_settings') || '{}');
        
        if (settings.theme) {
            document.getElementById('themeSelect').value = settings.theme;
        }
        if (settings.fontSize) {
            document.getElementById('fontSizeSelect').value = settings.fontSize;
        }
        if (settings.soundNotifications !== undefined) {
            document.getElementById('soundNotifications').checked = settings.soundNotifications;
        }
        if (settings.pushNotifications !== undefined) {
            document.getElementById('pushNotifications').checked = settings.pushNotifications;
        }
    }

    // Сохранение настроек
    saveSettings() {
        const settings = {
            theme: document.getElementById('themeSelect').value,
            fontSize: document.getElementById('fontSizeSelect').value,
            soundNotifications: document.getElementById('soundNotifications').checked,
            pushNotifications: document.getElementById('pushNotifications').checked
        };
        
        localStorage.setItem('xpchat_settings', JSON.stringify(settings));
        this.applySettings(settings);
        
        this.showNotification('Настройки сохранены', 'success');
        
        // Убираем модальное окно
        const modal = document.querySelector('.settings-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Применение настроек
    applySettings(settings) {
        // Тема
        document.body.className = `theme-${settings.theme}`;
        
        // Размер шрифта
        document.documentElement.style.fontSize = {
            'small': '14px',
            'medium': '16px',
            'large': '18px'
        }[settings.fontSize] || '16px';
    }

    // Открытие AI помощника
    openAIAssistant() {
        const modal = document.createElement('div');
        modal.className = 'modal ai-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>AI Помощник</h3>
                <div class="ai-chat">
                    <div class="ai-messages" id="aiMessages"></div>
                    <div class="ai-input">
                        <input type="text" id="aiInput" placeholder="Задайте вопрос AI...">
                        <button onclick="xpchat.sendAIMessage()">Отправить</button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Закрыть</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Фокус на поле ввода
        setTimeout(() => {
            document.getElementById('aiInput').focus();
        }, 100);
    }

    // Отправка сообщения AI
    sendAIMessage() {
        const input = document.getElementById('aiInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Добавляем сообщение пользователя
        this.addAIMessage(message, 'user');
        input.value = '';
        
        // Имитируем ответ AI
        setTimeout(() => {
            const aiResponse = this.generateAIResponse(message);
            this.addAIMessage(aiResponse, 'ai');
        }, 1000);
    }

    // Добавление сообщения AI
    addAIMessage(content, sender) {
        const aiMessages = document.getElementById('aiMessages');
        if (!aiMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `ai-message ${sender}`;
        messageElement.innerHTML = `
            <div class="ai-message-content">
                <div class="ai-message-sender">${sender === 'user' ? 'Вы' : 'AI Помощник'}</div>
                <div class="ai-message-text">${content}</div>
            </div>
        `;
        
        aiMessages.appendChild(messageElement);
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }

    // Генерация ответа AI
    generateAIResponse(message) {
        const responses = {
            'привет': 'Привет! Как дела? Чем могу помочь?',
            'как дела': 'Спасибо, отлично! Готов помочь вам с любыми вопросами.',
            'помощь': 'Я могу помочь с:\n• Ответами на вопросы\n• Решением задач\n• Объяснением концепций\n• Творческими идеями',
            'спасибо': 'Пожалуйста! Рад был помочь. Обращайтесь еще!',
            'пока': 'До свидания! Буду ждать новых вопросов!'
        };
        
        const lowerMessage = message.toLowerCase();
        
        for (const [key, response] of Object.entries(responses)) {
            if (lowerMessage.includes(key)) {
                return response;
            }
        }
        
        return 'Интересный вопрос! Давайте разберем его подробнее. Что именно вас интересует?';
    }

    // Настройка PWA
    setupPWA() {
        // Проверяем поддержку Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('Service Worker зарегистрирован:', registration);
                })
                .catch(error => {
                    console.log('Ошибка регистрации Service Worker:', error);
                });
        }
        
        // Проверяем поддержку установки
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallPrompt();
        });
    }

    // Показ предложения установки
    showInstallPrompt() {
        const installPrompt = document.createElement('div');
        installPrompt.className = 'install-prompt';
        installPrompt.innerHTML = `
            <div class="install-content">
                <span>Установить XPchat Pro как приложение</span>
                <button onclick="xpchat.installApp()">Установить</button>
                <button onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;
        
        document.body.appendChild(installPrompt);
    }

    // Установка приложения
    installApp() {
        if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            window.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('Пользователь принял установку');
                }
                window.deferredPrompt = null;
            });
        }
    }

    // Настройка WebRTC
    setupWebRTC() {
        // Проверяем поддержку WebRTC
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.log('WebRTC не поддерживается');
            return;
        }
        
        // Добавляем кнопки звонков
        this.addCallButtons();
    }

    // Добавление кнопок звонков
    addCallButtons() {
        const chatHeader = document.querySelector('.chat-header');
        if (!chatHeader) return;
        
        const callButtons = document.createElement('div');
        callButtons.className = 'call-buttons';
        callButtons.innerHTML = `
            <button class="call-btn voice-call" title="Голосовой звонок">📞</button>
            <button class="call-btn video-call" title="Видеозвонок">📹</button>
        `;
        
        chatHeader.appendChild(callButtons);
        
        // Обработчики для кнопок
        callButtons.querySelector('.voice-call').addEventListener('click', () => {
            this.initiateCall('audio');
        });
        
        callButtons.querySelector('.video-call').addEventListener('click', () => {
            this.initiateCall('video');
        });
    }

    // Инициация звонка
    initiateCall(type) {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для звонка', 'error');
            return;
        }
        
        this.showNotification(`Инициация ${type === 'audio' ? 'голосового' : 'видео'} звонка...`, 'info');
        
        // Здесь будет логика WebRTC
        // Пока просто показываем уведомление
        setTimeout(() => {
            this.showNotification('Звонок инициирован (демо режим)', 'success');
        }, 2000);
    }

    // Настройка уведомлений
    setupNotifications() {
        // Проверяем поддержку уведомлений
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }

    // Показ уведомления
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Автоматически убираем через 3 секунды
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Настройка AI
    setupAI() {
        // AI функционал уже реализован в openAIAssistant
        console.log('AI помощник готов к работе');
    }
}

// Инициализация приложения
let xpchat;
document.addEventListener('DOMContentLoaded', () => {
    xpchat = new XPchatPro();
});

// Глобальные функции для кнопок
window.xpchat = null;
window.addEventListener('load', () => {
    window.xpchat = xpchat;
});
