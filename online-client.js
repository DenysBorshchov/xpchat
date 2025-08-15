// XPchat Pro - Онлайн клиент
class XPchatOnlineClient {
    constructor() {
        this.ws = null;
        this.serverUrl = 'ws://localhost:3000';
        this.isConnected = false;
        this.userId = null;
        this.userName = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        this.onlineUsers = new Map();
        this.chats = new Map();
        this.messages = new Map();
        
        this.eventListeners = new Map();
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.showConnectionStatus('Подключение...', 'connecting');
        this.connect();
    }
    
    // Подключение к серверу
    connect() {
        try {
            this.ws = new WebSocket(this.serverUrl);
            this.setupWebSocketHandlers();
        } catch (error) {
            console.error('Ошибка подключения к WebSocket:', error);
            this.handleConnectionError();
        }
    }
    
    // Настройка обработчиков WebSocket
    setupWebSocketHandlers() {
        this.ws.onopen = () => {
            console.log('WebSocket соединение установлено');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.showConnectionStatus('Подключено', 'connected');
            this.authenticate();
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('Ошибка обработки сообщения от сервера:', error);
            }
        };
        
        this.ws.onclose = (event) => {
            console.log('WebSocket соединение закрыто:', event.code, event.reason);
            this.isConnected = false;
            this.showConnectionStatus('Отключено', 'disconnected');
            this.handleDisconnection();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket ошибка:', error);
            this.handleConnectionError();
        };
    }
    
    // Аутентификация пользователя
    authenticate() {
        if (!this.isConnected) return;
        
        const storedUserId = localStorage.getItem('xpchat_user_id');
        const storedUserName = localStorage.getItem('xpchat_user_name');
        
        this.userId = storedUserId || null;
        this.userName = storedUserName || this.generateUserName();
        
        const authMessage = {
            type: 'auth',
            userId: this.userId,
            userName: this.userName,
            avatar: localStorage.getItem('xpchat_user_avatar') || null
        };
        
        this.sendMessage(authMessage);
    }
    
    // Генерация имени пользователя
    generateUserName() {
        const names = ['Алексей', 'Мария', 'Дмитрий', 'Анна', 'Сергей', 'Елена', 'Андрей', 'Ольга'];
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomNumber = Math.floor(Math.random() * 1000);
        return `${randomName}${randomNumber}`;
    }
    
    // Обработка сообщений от сервера
    handleServerMessage(data) {
        switch (data.type) {
            case 'auth_success':
                this.handleAuthSuccess(data);
                break;
            case 'online_users':
                this.handleOnlineUsers(data);
                break;
            case 'new_message':
                this.handleNewMessage(data);
                break;
            case 'typing':
                this.handleTyping(data);
                break;
            case 'user_status_change':
                this.handleUserStatusChange(data);
                break;
            case 'call_offer':
                this.handleCallOffer(data);
                break;
            case 'call_answer':
                this.handleCallAnswer(data);
                break;
            case 'call_rejection':
                this.handleCallRejection(data);
                break;
            case 'ice_candidate':
                this.handleIceCandidate(data);
                break;
            case 'call_end':
                this.handleCallEnd(data);
                break;
            default:
                console.log('Неизвестный тип сообщения от сервера:', data.type);
        }
    }
    
    // Обработка успешной аутентификации
    handleAuthSuccess(data) {
        this.userId = data.userId;
        this.userName = data.user.name;
        
        localStorage.setItem('xpchat_user_id', this.userId);
        localStorage.setItem('xpchat_user_name', this.userName);
        
        if (data.user.avatar) {
            localStorage.setItem('xpchat_user_avatar', data.user.avatar);
        }
        
        this.triggerEvent('auth_success', data.user);
        console.log('Пользователь аутентифицирован:', data.user);
    }
    
    // Обработка списка онлайн пользователей
    handleOnlineUsers(data) {
        this.onlineUsers.clear();
        data.users.forEach(user => {
            this.onlineUsers.set(user.id, user);
        });
        
        this.triggerEvent('online_users_updated', Array.from(this.onlineUsers.values()));
        this.updateOnlineUsersList();
    }
    
    // Обработка нового сообщения
    handleNewMessage(data) {
        const message = data.message;
        const chatId = message.chatId;
        
        if (!this.messages.has(chatId)) {
            this.messages.set(chatId, []);
        }
        
        this.messages.get(chatId).push(message);
        this.triggerEvent('new_message', message);
        this.displayMessage(message);
    }
    
    // Обработка статуса набора текста
    handleTyping(data) {
        this.triggerEvent('typing', data);
        this.showTypingIndicator(data);
    }
    
    // Обработка изменения статуса пользователя
    handleUserStatusChange(data) {
        const user = data.user;
        this.onlineUsers.set(user.id, user);
        
        this.triggerEvent('user_status_change', data);
        this.updateUserStatus(user.id, data.isOnline);
    }
    
    // Обработка предложения звонка
    handleCallOffer(data) {
        this.triggerEvent('call_offer', data);
        if (window.webrtcCalls) {
            window.webrtcCalls.handleCallOffer(data.fromUserId, data.offer, data.callType);
        }
    }
    
    // Обработка ответа на звонок
    handleCallAnswer(data) {
        this.triggerEvent('call_answer', data);
        if (window.webrtcCalls) {
            window.webrtcCalls.handleCallAnswer(data.fromUserId, data.answer);
        }
    }
    
    // Обработка отклонения звонка
    handleCallRejection(data) {
        this.triggerEvent('call_rejection', data);
        if (window.webrtcCalls) {
            window.webrtcCalls.handleCallRejection(data.fromUserId);
        }
    }
    
    // Обработка ICE кандидата
    handleIceCandidate(data) {
        this.triggerEvent('ice_candidate', data);
        if (window.webrtcCalls) {
            window.webrtcCalls.handleIceCandidate(data.fromUserId, data.candidate);
        }
    }
    
    // Обработка завершения звонка
    handleCallEnd(data) {
        this.triggerEvent('call_end', data);
        if (window.webrtcCalls) {
            window.webrtcCalls.notifyCallEnded();
        }
    }
    
    // Отправка сообщения на сервер
    sendMessage(data) {
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('WebSocket не подключен');
            this.queueMessage(data);
        }
    }
    
    // Отправка текстового сообщения
    sendTextMessage(content, chatId = 'general') {
        const message = {
            type: 'message',
            content: content,
            chatId: chatId,
            messageType: 'text'
        };
        
        this.sendMessage(message);
    }
    
    // Отправка статуса набора текста
    sendTypingStatus(isTyping, chatId = 'general') {
        const typingData = {
            type: 'typing',
            chatId: chatId,
            isTyping: isTyping
        };
        
        this.sendMessage(typingData);
    }
    
    // Отправка предложения звонка
    sendCallOffer(toUserId, offer, callType = 'audio') {
        const callData = {
            type: 'call_offer',
            toUserId: toUserId,
            offer: offer,
            callType: callType
        };
        
        this.sendMessage(callData);
    }
    
    // Отправка ответа на звонок
    sendCallAnswer(toUserId, answer) {
        const answerData = {
            type: 'call_answer',
            toUserId: toUserId,
            answer: answer
        };
        
        this.sendMessage(answerData);
    }
    
    // Отправка отклонения звонка
    sendCallRejection(toUserId) {
        const rejectionData = {
            type: 'call_rejection',
            toUserId: toUserId
        };
        
        this.sendMessage(rejectionData);
    }
    
    // Отправка ICE кандидата
    sendIceCandidate(toUserId, candidate) {
        const candidateData = {
            type: 'ice_candidate',
            toUserId: toUserId,
            candidate: candidate
        };
        
        this.sendMessage(candidateData);
    }
    
    // Отправка уведомления о завершении звонка
    sendCallEnd(toUserId) {
        const endData = {
            type: 'call_end',
            toUserId: toUserId
        };
        
        this.sendMessage(endData);
    }
    
    // Обработка отключения
    handleDisconnection() {
        this.isConnected = false;
        this.triggerEvent('disconnected');
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.reconnectDelay *= 2;
            
            setTimeout(() => {
                console.log(`Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                this.connect();
            }, this.reconnectDelay);
        } else {
            this.showConnectionStatus('Ошибка подключения', 'error');
            this.triggerEvent('connection_failed');
        }
    }
    
    // Обработка ошибки подключения
    handleConnectionError() {
        this.isConnected = false;
        this.showConnectionStatus('Ошибка подключения', 'error');
        this.triggerEvent('connection_error');
    }
    
    // Очередь сообщений для отправки после переподключения
    queueMessage(data) {
        if (!this.messageQueue) {
            this.messageQueue = [];
        }
        this.messageQueue.push(data);
    }
    
    // Отправка очереди сообщений
    sendQueuedMessages() {
        if (this.messageQueue && this.messageQueue.length > 0) {
            this.messageQueue.forEach(message => {
                this.sendMessage(message);
            });
            this.messageQueue = [];
        }
    }
    
    // Показ статуса подключения
    showConnectionStatus(status, type) {
        const statusElement = document.getElementById('onlineStatus');
        if (statusElement) {
            statusElement.innerHTML = `
                <div class="status-indicator ${type}"></div>
                <span>${status}</span>
            `;
        }
        
        this.triggerEvent('connection_status_change', { status, type });
    }
    
    // Обновление списка онлайн пользователей
    updateOnlineUsersList() {
        const contactsList = document.getElementById('contactsList');
        if (!contactsList) return;
        
        contactsList.innerHTML = '';
        
        this.onlineUsers.forEach(user => {
            if (user.id !== this.userId) {
                const userElement = this.createUserElement(user);
                contactsList.appendChild(userElement);
            }
        });
    }
    
    // Создание элемента пользователя
    createUserElement(user) {
        const userElement = document.createElement('div');
        userElement.className = 'contact-item online';
        userElement.dataset.userId = user.id;
        
        userElement.innerHTML = `
            <div class="contact-avatar">
                <img src="${user.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdFRUEiLz4KPHN2ZyB4PSIxMCIgeT0iMTIiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEwIDEyQzEyLjIwOTEgMTIgMTQgMTAuMjA5MSAxNCA4QzE0IDUuNzkwODYgMTIuMjA5MSA0IDEwIDRDNy43OTA4NiA0IDYgNS43OTA4NiA2IDhDNiAxMC4yMDkxIDcuNzkwODYgMTIgMTAgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgMTZDMzIgMTYgMzIgMTIgMzIgMTJDMzIgMTAgMjggOCAyMCA4QzEyIDggOCAxMCA4IDEyQzggMTIgOCAxNiAxNiAxNloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K'}" alt="${user.name}">
                <div class="online-indicator"></div>
            </div>
            <div class="contact-info">
                <div class="contact-name">${user.name}</div>
                <div class="contact-status">🟢 Онлайн</div>
            </div>
            <div class="contact-actions">
                <button class="action-btn" title="Аудио звонок" onclick="window.xpchatOnline.sendCallOffer('${user.id}', null, 'audio')">
                    <i class="fas fa-phone"></i>
                </button>
                <button class="action-btn" title="Видео звонок" onclick="window.xpchatOnline.sendCallOffer('${user.id}', null, 'video')">
                    <i class="fas fa-video"></i>
                </button>
                <button class="action-btn" title="Начать чат" onclick="window.xpchatOnline.startChat('${user.id}')">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        `;
        
        return userElement;
    }
    
    // Обновление статуса пользователя
    updateUserStatus(userId, isOnline) {
        const userElement = document.querySelector(`[data-user-id="${userId}"]`);
        if (userElement) {
            const statusElement = userElement.querySelector('.contact-status');
            const onlineIndicator = userElement.querySelector('.online-indicator');
            
            if (isOnline) {
                userElement.classList.add('online');
                statusElement.textContent = '🟢 Онлайн';
                onlineIndicator.style.display = 'block';
            } else {
                userElement.classList.remove('online');
                statusElement.textContent = '⚫ Офлайн';
                onlineIndicator.style.display = 'none';
            }
        }
    }
    
    // Показ индикатора набора текста
    showTypingIndicator(data) {
        this.triggerEvent('typing_indicator', data);
    }
    
    // Отображение сообщения
    displayMessage(message) {
        this.triggerEvent('message_display', message);
    }
    
    // Начало чата с пользователем
    startChat(userId) {
        const user = this.onlineUsers.get(userId);
        if (user) {
            this.triggerEvent('start_chat', { userId, user });
        }
    }
    
    // Система событий
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    triggerEvent(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Ошибка в обработчике события ${event}:`, error);
                }
            });
        }
    }
    
    // Настройка обработчиков событий
    setupEventListeners() {
        // Обработчик отправки сообщений
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.matches('#messageInput')) {
                e.preventDefault();
                const input = e.target;
                const message = input.value.trim();
                
                if (message) {
                    this.sendTextMessage(message);
                    input.value = '';
                }
            }
        });
        
        // Обработчик набора текста
        let typingTimeout;
        document.addEventListener('input', (e) => {
            if (e.target.matches('#messageInput')) {
                this.sendTypingStatus(true);
                
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    this.sendTypingStatus(false);
                }, 1000);
            }
        });
    }
    
    // Получение информации о пользователе
    getUserInfo(userId) {
        return this.onlineUsers.get(userId);
    }
    
    // Получение списка онлайн пользователей
    getOnlineUsers() {
        return Array.from(this.onlineUsers.values());
    }
    
    // Проверка подключения
    isServerConnected() {
        return this.isConnected;
    }
    
    // Переподключение вручную
    reconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.connect();
    }
}

// Инициализация онлайн клиента
window.xpchatOnline = new XPchatOnlineClient();
window.XPchatOnlineClient = XPchatOnlineClient;
