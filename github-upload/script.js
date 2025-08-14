class XPchat {
    constructor() {
        this.contacts = [];
        this.currentContact = null;
        this.messages = {};
        this.callState = {
            isInCall: false,
            isCaller: false,
            callType: null, // 'audio' или 'video'
            localStream: null,
            remoteStream: null,
            peerConnection: null,
            localVideo: null,
            remoteVideo: null
        };
        this.aiAssistant = {
            name: 'AI Помощник',
            isActive: false,
            context: [],
            personality: 'helpful'
        };
        
        // WebSocket и онлайн функциональность
        this.websocket = null;
        this.isOnline = false;
        this.userId = null;
        this.userName = null;
        this.typingTimeout = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.init();
    }

    init() {
        this.loadContacts();
        this.bindEvents();
        this.renderContacts();
        this.initCallUI();
        this.initAI();
        this.initWebSocket();
    }

    initWebSocket() {
        try {
            // Определяем WebSocket URL
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = window.location.port || (protocol === 'wss:' ? '443' : '3000');
            const wsUrl = `${protocol}//${host}:${port}`;
            
            console.log('Подключение к WebSocket:', wsUrl);
            
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                console.log('WebSocket соединение установлено');
                this.isOnline = true;
                this.reconnectAttempts = 0;
                this.updateOnlineStatus(true);
                
                // Подключаем пользователя
                this.connectUser();
            };
            
            this.websocket.onmessage = (event) => {
                this.handleWebSocketMessage(event.data);
            };
            
            this.websocket.onclose = (event) => {
                console.log('WebSocket соединение закрыто:', event.code, event.reason);
                this.isOnline = false;
                this.updateOnlineStatus(false);
                
                // Попытка переподключения
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    setTimeout(() => {
                        this.reconnectAttempts++;
                        console.log(`Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                        this.initWebSocket();
                    }, 2000 * this.reconnectAttempts);
                }
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket ошибка:', error);
                this.isOnline = false;
                this.updateOnlineStatus(false);
            };
            
        } catch (error) {
            console.error('Ошибка инициализации WebSocket:', error);
            this.isOnline = false;
            this.updateOnlineStatus(false);
        }
    }

    connectUser() {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;
        
        // Генерируем уникальный ID пользователя
        this.userId = localStorage.getItem('xpchat_user_id') || `user_${Date.now()}`;
        this.userName = localStorage.getItem('xpchat_user_name') || 'Пользователь XPchat';
        
        // Сохраняем в localStorage
        localStorage.setItem('xpchat_user_id', this.userId);
        localStorage.setItem('xpchat_user_name', this.userName);
        
        // Отправляем информацию о подключении
        this.websocket.send(JSON.stringify({
            type: 'user_connect',
            userId: this.userId,
            name: this.userName,
            avatar: 'default'
        }));
    }

    handleWebSocketMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'user_connected':
                    this.handleUserConnected(message);
                    break;
                case 'user_joined':
                    this.handleUserJoined(message);
                    break;
                case 'user_left':
                    this.handleUserLeft(message);
                    break;
                case 'new_message':
                    this.handleNewMessage(message);
                    break;
                case 'user_typing':
                    this.handleUserTyping(message);
                    break;
                case 'user_status_changed':
                    this.handleUserStatusChanged(message);
                    break;
                case 'contacts_list':
                    this.handleContactsList(message);
                    break;
                case 'contacts_updated':
                    this.handleContactsUpdated(message);
                    break;
                case 'messages_history':
                    this.handleMessagesHistory(message);
                    break;
                default:
                    console.log('Неизвестный тип WebSocket сообщения:', message.type);
            }
        } catch (error) {
            console.error('Ошибка обработки WebSocket сообщения:', error);
        }
    }

    handleUserConnected(message) {
        console.log('Пользователь подключен:', message.userId);
        this.userId = message.userId;
        
        // Запрашиваем список контактов
        this.websocket.send(JSON.stringify({
            type: 'get_contacts'
        }));
    }

    handleUserJoined(message) {
        console.log('Новый пользователь присоединился:', message.userInfo.name);
        
        // Добавляем нового пользователя в контакты
        const newContact = {
            id: message.userInfo.userId,
            name: message.userInfo.name,
            phone: '',
            lastMessage: 'Присоединился к чату',
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            isOnline: true,
            lastSeen: message.userInfo.lastSeen
        };
        
        this.contacts.push(newContact);
        this.saveContacts();
        this.renderContacts();
        
        this.showNotification('Новый пользователь', `${message.userInfo.name} присоединился к чату`);
    }

    handleUserLeft(message) {
        console.log('Пользователь покинул чат:', message.userName);
        
        // Обновляем статус пользователя
        const contact = this.contacts.find(c => c.id === message.userId);
        if (contact) {
            contact.isOnline = false;
            contact.lastSeen = message.lastSeen;
            contact.lastMessage = 'Покинул чат';
            contact.time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            
            this.saveContacts();
            this.renderContacts();
        }
        
        this.showNotification('Пользователь покинул чат', `${message.userName} отключился`);
    }

    handleNewMessage(message) {
        console.log('Новое сообщение:', message);
        
        // Добавляем сообщение в историю
        const contactId = message.contactId;
        if (!this.messages[contactId]) {
            this.messages[contactId] = [];
        }
        
        // Проверяем, не дублируем ли сообщение
        const existingMessage = this.messages[contactId].find(m => m.id === message.message.id);
        if (!existingMessage) {
            this.messages[contactId].push(message.message);
            
            // Обновляем последнее сообщение в контакте
            const contact = this.contacts.find(c => c.id === contactId);
            if (contact) {
                contact.lastMessage = message.message.text;
                contact.time = message.message.time;
                contact.unread = (contact.unread || 0) + 1;
                
                this.saveContacts();
                this.renderContacts();
            }
            
            // Если это текущий контакт, обновляем сообщения
            if (this.currentContact && this.currentContact.id === contactId) {
                this.renderMessages(contactId);
            }
            
            // Показываем уведомление если чат не активен
            if (!this.currentContact || this.currentContact.id !== contactId) {
                const senderName = message.message.senderName || 'Пользователь';
                this.showNotification('Новое сообщение', `${senderName}: ${message.message.text}`);
            }
        }
    }

    handleUserTyping(message) {
        // Показываем индикатор печати
        if (this.currentContact && this.currentContact.id === message.contactId) {
            this.showTypingIndicator(message.userName, message.isTyping);
        }
    }

    handleUserStatusChanged(message) {
        // Обновляем статус пользователя
        const contact = this.contacts.find(c => c.id === message.userId);
        if (contact) {
            contact.isOnline = message.isOnline;
            contact.lastSeen = message.lastSeen;
            
            this.saveContacts();
            this.renderContacts();
        }
    }

    handleContactsList(message) {
        console.log('Получен список контактов:', message.contacts);
        
        // Обновляем контакты с сервера
        this.contacts = message.contacts;
        this.saveContacts();
        this.renderContacts();
    }

    handleContactsUpdated(message) {
        console.log('Контакты обновлены:', message.contacts);
        
        // Обновляем контакты
        this.contacts = message.contacts;
        this.saveContacts();
        this.renderContacts();
    }

    handleMessagesHistory(message) {
        console.log('История сообщений:', message.messages);
        
        // Обновляем историю сообщений
        this.messages[message.contactId] = message.messages;
        this.saveMessages();
        
        // Если это текущий контакт, обновляем отображение
        if (this.currentContact && this.currentContact.id === message.contactId) {
            this.renderMessages(message.contactId);
        }
    }

    updateOnlineStatus(isOnline) {
        const statusElement = document.getElementById('onlineStatus');
        if (statusElement) {
            statusElement.textContent = isOnline ? '🟢 Онлайн' : '🔴 Офлайн';
            statusElement.className = isOnline ? 'online' : 'offline';
        }
        
        // Обновляем заголовок страницы
        document.title = isOnline ? 'XPchat - Онлайн' : 'XPchat - Офлайн';
        
        // Показываем уведомление
        if (isOnline) {
            this.showNotification('Подключение', 'Соединение с сервером установлено');
        } else {
            this.showNotification('Отключение', 'Соединение с сервером потеряно');
        }
    }

    showTypingIndicator(userName, isTyping) {
        const typingElement = document.getElementById('typingIndicator');
        if (!typingElement) return;
        
        if (isTyping) {
            typingElement.textContent = `${userName} печатает...`;
            typingElement.style.display = 'block';
        } else {
            typingElement.style.display = 'none';
        }
    }

    sendMessageOnline(text, contactId) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            console.log('WebSocket не подключен, отправляем локально');
            return false;
        }
        
        // Отправляем сообщение через WebSocket
        this.websocket.send(JSON.stringify({
            type: 'send_message',
            text: text,
            contactId: contactId
        }));
        
        return true;
    }

    sendTypingStatus(contactId, isTyping) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;
        
        this.websocket.send(JSON.stringify({
            type: 'user_typing',
            contactId: contactId,
            isTyping: isTyping
        }));
    }

    formatLastSeen(timestamp) {
        try {
            const lastSeen = new Date(timestamp);
            const now = new Date();
            const diffMs = now - lastSeen;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) {
                return 'Только что';
            } else if (diffMins < 60) {
                return `${diffMins} мин назад`;
            } else if (diffHours < 24) {
                return `${diffHours} ч назад`;
            } else if (diffDays < 7) {
                return `${diffDays} дн назад`;
            } else {
                return lastSeen.toLocaleDateString('ru-RU');
            }
        } catch (error) {
            return 'Неизвестно';
        }
    }

    handleTyping(isTyping) {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Отправляем статус печати
        this.sendTypingStatus(this.currentContact.id, isTyping);
        
        if (isTyping) {
            // Останавливаем индикатор печати через 3 секунды
            this.typingTimeout = setTimeout(() => {
                this.sendTypingStatus(this.currentContact.id, false);
            }, 3000);
        }
    }

    initAI() {
        // Создаем AI помощника как контакт
        const aiContact = {
            id: 'ai_assistant',
            name: '🤖 AI Помощник',
            phone: 'AI-001',
            lastMessage: 'Привет! Я ваш AI помощник. Чем могу помочь?',
            time: this.getCurrentTime(),
            unread: 0,
            isAI: true
        };

        // Добавляем AI в начало списка контактов
        this.contacts.unshift(aiContact);

        // Создаем начальные сообщения для AI
        this.messages['ai_assistant'] = [
            {
                id: 1,
                text: 'Привет! Я ваш AI помощник в XPchat. Я могу помочь вам с различными вопросами, дать советы или просто пообщаться. Что вас интересует?',
                time: this.getCurrentTime(),
                sent: false,
                isAI: true
            }
        ];

        this.saveContacts();
        this.saveMessages();
        this.renderContacts();
    }

    bindEvents() {
        // Кнопка нового чата
        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.showNewChatModal();
        });

        // Закрытие модального окна
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.hideNewChatModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideNewChatModal();
        });

        // Создание нового чата
        document.getElementById('createChatBtn').addEventListener('click', () => {
            this.createNewChat();
        });

        // Отправка сообщения
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        // Отправка по Enter
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Индикатор печати
        document.getElementById('messageInput').addEventListener('input', (e) => {
            if (this.currentContact && !this.currentContact.isAI) {
                this.handleTyping(e.target.value.length > 0);
            }
        });

        // Поиск контактов
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchContacts(e.target.value);
        });

        // Кнопки звонков
        document.getElementById('voiceCallBtn').addEventListener('click', () => {
            this.initiateCall('audio');
        });

        document.getElementById('videoCallBtn').addEventListener('click', () => {
            this.initiateCall('video');
        });

        document.getElementById('moreOptionsBtn').addEventListener('click', () => {
            this.showNotification('Дополнительно', 'Функция в разработке');
        });

        document.getElementById('attachBtn').addEventListener('click', () => {
            this.showNotification('Прикрепить файл', 'Функция в разработке');
        });

        document.getElementById('emojiBtn').addEventListener('click', () => {
            this.showNotification('Эмодзи', 'Функция в разработке');
        });
    }

    initCallUI() {
        // Создаем UI для звонков
        const callUI = document.createElement('div');
        callUI.id = 'callUI';
        callUI.className = 'call-ui';
        callUI.innerHTML = `
            <div class="call-overlay">
                <div class="call-container">
                    <div class="call-header">
                        <div class="call-info">
                            <h3 id="callContactName">Звонок</h3>
                            <span id="callStatus">Подключение...</span>
                        </div>
                        <div class="call-timer" id="callTimer">00:00</div>
                    </div>
                    
                    <div class="video-container">
                        <video id="remoteVideo" autoplay playsinline muted></video>
                        <video id="localVideo" autoplay playsinline muted></video>
                    </div>
                    
                    <div class="call-controls">
                        <button class="call-btn mute-btn" id="muteBtn">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <button class="call-btn camera-btn" id="cameraBtn">
                            <i class="fas fa-video"></i>
                        </button>
                        <button class="call-btn end-call-btn" id="endCallBtn">
                            <i class="fas fa-phone-slash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(callUI);

        // Привязываем события кнопок звонка
        document.getElementById('muteBtn').addEventListener('click', () => this.toggleMute());
        document.getElementById('cameraBtn').addEventListener('click', () => this.toggleCamera());
        document.getElementById('endCallBtn').addEventListener('click', () => this.endCall());
    }

    async initiateCall(type) {
        if (!this.currentContact) {
            this.showNotification('Ошибка', 'Выберите контакт для звонка');
            return;
        }

        if (this.currentContact.isAI) {
            this.showNotification('AI Помощник', 'К сожалению, AI помощник не поддерживает звонки. Но я всегда готов помочь в чате!');
            return;
        }

        if (this.callState.isInCall) {
            this.showNotification('Ошибка', 'Уже в звонке');
            return;
        }

        this.callState.callType = type;
        this.callState.isCaller = true;

        try {
            // Получаем доступ к медиа устройствам
            const constraints = {
                audio: true,
                video: type === 'video'
            };

            this.callState.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Показываем локальное видео
            const localVideo = document.getElementById('localVideo');
            localVideo.srcObject = this.callState.localStream;

            // Показываем UI звонка
            this.showCallUI();
            this.updateCallInfo(`${type === 'audio' ? 'Аудио' : 'Видео'} звонок`, 'Набор номера...');

            // Симулируем ответ через 2-4 секунды
            setTimeout(() => {
                this.simulateCallAnswer();
            }, Math.random() * 2000 + 2000);

        } catch (error) {
            console.error('Ошибка доступа к медиа устройствам:', error);
            this.showNotification('Ошибка', 'Не удалось получить доступ к камере/микрофону');
        }
    }

    simulateCallAnswer() {
        if (!this.callState.isInCall) return;

        this.callState.isInCall = true;
        this.updateCallInfo('В разговоре', '00:00');
        this.startCallTimer();

        // Симулируем удаленный поток
        this.simulateRemoteStream();
    }

    async simulateRemoteStream() {
        try {
            // Создаем тестовый поток для демонстрации
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');

            // Рисуем тестовое изображение
            const drawTestImage = () => {
                ctx.fillStyle = '#667eea';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = 'white';
                ctx.font = '48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.currentContact.name, canvas.width/2, canvas.height/2);
                
                ctx.font = '24px Arial';
                ctx.fillText('Тестовое видео', canvas.width/2, canvas.height/2 + 40);
            };

            drawTestImage();
            setInterval(drawTestImage, 1000);

            const stream = canvas.captureStream(30);
            
            // Добавляем аудио синусоиду для демонстрации
            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            
            oscillator.start();
            
            // Останавливаем через 5 секунд
            setTimeout(() => {
                oscillator.stop();
            }, 5000);

            this.callState.remoteStream = stream;
            const remoteVideo = document.getElementById('remoteVideo');
            remoteVideo.srcObject = stream;

        } catch (error) {
            console.error('Ошибка создания тестового потока:', error);
        }
    }

    showCallUI() {
        document.getElementById('callUI').style.display = 'block';
        
        // Скрываем локальное видео для аудио звонков
        const localVideo = document.getElementById('localVideo');
        if (this.callState.callType === 'audio') {
            localVideo.style.display = 'none';
        } else {
            localVideo.style.display = 'block';
        }
    }

    hideCallUI() {
        document.getElementById('callUI').style.display = 'none';
    }

    updateCallInfo(status, timer) {
        document.getElementById('callContactName').textContent = this.currentContact.name;
        document.getElementById('callStatus').textContent = status;
        if (timer) {
            document.getElementById('callTimer').textContent = timer;
        }
    }

    startCallTimer() {
        let seconds = 0;
        this.callTimer = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            document.getElementById('callTimer').textContent = timeString;
        }, 1000);
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    }

    toggleMute() {
        if (this.callState.localStream) {
            const audioTrack = this.callState.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const muteBtn = document.getElementById('muteBtn');
                const icon = muteBtn.querySelector('i');
                
                if (audioTrack.enabled) {
                    icon.className = 'fas fa-microphone';
                    muteBtn.classList.remove('active');
                } else {
                    icon.className = 'fas fa-microphone-slash';
                    muteBtn.classList.add('active');
                }
            }
        }
    }

    toggleCamera() {
        if (this.callState.localStream && this.callState.callType === 'video') {
            const videoTrack = this.callState.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                const cameraBtn = document.getElementById('cameraBtn');
                const icon = cameraBtn.querySelector('i');
                
                if (videoTrack.enabled) {
                    icon.className = 'fas fa-video';
                    cameraBtn.classList.remove('active');
                } else {
                    icon.className = 'fas fa-video-slash';
                    cameraBtn.classList.add('active');
                }
            }
        }
    }

    endCall() {
        this.callState.isInCall = false;
        this.stopCallTimer();
        this.hideCallUI();

        // Останавливаем все потоки
        if (this.callState.localStream) {
            this.callState.localStream.getTracks().forEach(track => track.stop());
            this.callState.localStream = null;
        }

        if (this.callState.remoteStream) {
            this.callState.remoteStream.getTracks().forEach(track => track.stop());
            this.callState.remoteStream = null;
        }

        // Сбрасываем состояние
        this.callState = {
            isInCall: false,
            isCaller: false,
            callType: null,
            localStream: null,
            remoteStream: null,
            peerConnection: null,
            localVideo: null,
            remoteVideo: null
        };

        this.showNotification('Звонок завершен', 'Разговор окончен');
    }

    loadContacts() {
        // Загружаем контакты из localStorage или создаем демо-данные
        const savedContacts = localStorage.getItem('xpchat_contacts');
        if (savedContacts) {
            this.contacts = JSON.parse(savedContacts);
        } else {
            // Демо-контакты
            this.contacts = [
                {
                    id: 1,
                    name: 'Анна Петрова',
                    phone: '+7 (999) 123-45-67',
                    lastMessage: 'Привет! Как дела?',
                    time: '14:30',
                    unread: 2
                },
                {
                    id: 2,
                    name: 'Михаил Сидоров',
                    phone: '+7 (999) 234-56-78',
                    lastMessage: 'Встречаемся завтра?',
                    time: '12:15',
                    unread: 0
                },
                {
                    id: 3,
                    name: 'Елена Козлова',
                    phone: '+7 (999) 345-67-89',
                    lastMessage: 'Спасибо за помощь!',
                    time: 'Вчера',
                    unread: 1
                }
            ];
            this.saveContacts();
        }

        // Загружаем сообщения
        const savedMessages = localStorage.getItem('xpchat_messages');
        if (savedMessages) {
            this.messages = JSON.parse(savedMessages);
        } else {
            // Демо-сообщения
            this.messages = {
                1: [
                    { id: 1, text: 'Привет!', time: '14:25', sent: false },
                    { id: 2, text: 'Привет! Как дела?', time: '14:30', sent: false },
                    { id: 3, text: 'Привет! Все хорошо, спасибо!', time: '14:32', sent: true }
                ],
                2: [
                    { id: 1, text: 'Привет, Михаил!', time: '12:10', sent: true },
                    { id: 2, text: 'Встречаемся завтра?', time: '12:15', sent: false }
                ],
                3: [
                    { id: 1, text: 'Помоги, пожалуйста, с проектом', time: 'Вчера 15:20', sent: false },
                    { id: 2, text: 'Конечно! Что нужно?', time: 'Вчера 15:25', sent: true },
                    { id: 3, text: 'Спасибо за помощь!', time: 'Вчера 16:00', sent: false }
                ]
            };
            this.saveMessages();
        }
    }

    saveContacts() {
        localStorage.setItem('xpchat_contacts', JSON.stringify(this.contacts));
    }

    saveMessages() {
        localStorage.setItem('xpchat_messages', JSON.stringify(this.messages));
    }

    renderContacts() {
        const contactsList = document.getElementById('contactsList');
        contactsList.innerHTML = '';

        this.contacts.forEach(contact => {
            const contactElement = this.createContactElement(contact);
            contactsList.appendChild(contactElement);
        });
    }

    createContactElement(contact) {
        const contactDiv = document.createElement('div');
        contactDiv.className = 'contact-item';
        contactDiv.dataset.contactId = contact.id;

        const avatarIcon = contact.isAI ? 'fas fa-robot' : 'fas fa-user';
        const aiBadge = contact.isAI ? '<div class="ai-badge">AI</div>' : '';
        
        // Индикатор онлайн статуса
        const onlineIndicator = contact.isAI ? '' : 
            `<div class="${contact.isOnline ? 'online-indicator' : 'offline-indicator'}"></div>`;
        
        // Время последнего посещения
        const lastSeen = contact.lastSeen ? 
            `<div class="contact-last-seen">${this.formatLastSeen(contact.lastSeen)}</div>` : '';

        contactDiv.innerHTML = `
            <div class="contact-avatar ${contact.isAI ? 'ai-avatar' : ''}">
                <i class="${avatarIcon}"></i>
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-last-message">${contact.lastMessage}</div>
                <div class="contact-time">${contact.time}</div>
                ${lastSeen}
            </div>
            ${onlineIndicator}
            ${contact.unread > 0 ? `<div class="unread-badge">${contact.unread}</div>` : ''}
            ${aiBadge}
        `;

        contactDiv.addEventListener('click', () => {
            this.selectContact(contact);
        });

        return contactDiv;
    }

    selectContact(contact) {
        // Убираем активный класс у всех контактов
        document.querySelectorAll('.contact-item').forEach(item => {
            item.classList.remove('active');
        });

        // Добавляем активный класс к выбранному контакту
        const contactElement = document.querySelector(`[data-contact-id="${contact.id}"]`);
        if (contactElement) {
            contactElement.classList.add('active');
        }

        this.currentContact = contact;
        this.updateChatHeader(contact);
        this.renderMessages(contact.id);
        this.hideWelcomeMessage();
    }

    updateChatHeader(contact) {
        document.getElementById('currentContactName').textContent = contact.name;
        if (contact.isAI) {
            document.getElementById('contactStatus').textContent = 'AI Помощник • Онлайн';
        } else {
            document.getElementById('contactStatus').textContent = 'В сети';
        }
    }

    renderMessages(contactId) {
        const messagesContainer = document.getElementById('messagesContainer');
        const messages = this.messages[contactId] || [];

        messagesContainer.innerHTML = '';

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // Прокручиваем к последнему сообщению
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sent ? 'sent' : 'received'}`;

        const aiIndicator = message.isAI ? '<div class="ai-indicator">🤖</div>' : '';

        messageDiv.innerHTML = `
            <div class="message-content ${message.isAI ? 'ai-message' : ''}">
                ${aiIndicator}
                <div class="message-text">${message.text}</div>
                <div class="message-time">${message.time}</div>
            </div>
        `;

        return messageDiv;
    }

    hideWelcomeMessage() {
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    showNewChatModal() {
        document.getElementById('newChatModal').classList.add('show');
        document.getElementById('contactName').focus();
    }

    hideNewChatModal() {
        document.getElementById('newChatModal').classList.remove('show');
        document.getElementById('contactName').value = '';
        document.getElementById('contactPhone').value = '';
    }

    createNewChat() {
        const name = document.getElementById('contactName').value.trim();
        const phone = document.getElementById('contactPhone').value.trim();

        if (!name) {
            this.showNotification('Ошибка', 'Введите имя контакта');
            return;
        }

        const newContact = {
            id: Date.now(),
            name: name,
            phone: phone || '',
            lastMessage: 'Новый чат',
            time: this.getCurrentTime(),
            unread: 0
        };

        this.contacts.unshift(newContact);
        this.messages[newContact.id] = [];
        
        this.saveContacts();
        this.saveMessages();
        this.renderContacts();
        this.hideNewChatModal();
        this.selectContact(newContact);

        this.showNotification('Успех', 'Новый чат создан!');
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value.trim();

        if (!text || !this.currentContact) {
            return;
        }

        const message = {
            id: Date.now(),
            text: text,
            time: this.getCurrentTime(),
            sent: true
        };

        // Добавляем сообщение в массив
        if (!this.messages[this.currentContact.id]) {
            this.messages[this.currentContact.id] = [];
        }
        this.messages[this.currentContact.id].push(message);

        // Обновляем последнее сообщение в контакте
        this.currentContact.lastMessage = text;
        this.currentContact.time = this.getCurrentTime();
        this.currentContact.unread = 0;

        this.saveMessages();
        this.saveContacts();
        this.renderContacts();
        this.renderMessages(this.currentContact.id);

        // Очищаем поле ввода
        messageInput.value = '';

        // Если это AI помощник, генерируем ответ
        if (this.currentContact.isAI) {
            setTimeout(() => {
                this.generateAIResponse(text);
            }, 1000 + Math.random() * 2000);
        } else {
            // Пытаемся отправить онлайн
            const sentOnline = this.sendMessageOnline(text, this.currentContact.id);
            
            if (!sentOnline) {
                // Если онлайн не работает, симулируем ответ
                setTimeout(() => {
                    this.simulateResponse();
                }, Math.random() * 2000 + 1000);
            }
        }
    }

    generateAIResponse(userMessage) {
        const response = this.getAIResponse(userMessage);
        
        const aiMessage = {
            id: Date.now(),
            text: response,
            time: this.getCurrentTime(),
            sent: false,
            isAI: true
        };

        this.messages[this.currentContact.id].push(aiMessage);
        this.currentContact.lastMessage = response;
        this.currentContact.time = this.getCurrentTime();
        this.currentContact.unread = 1;

        this.saveMessages();
        this.saveContacts();
        this.renderContacts();
        this.renderMessages(this.currentContact.id);
    }

    getAIResponse(userMessage) {
        const message = userMessage.toLowerCase();
        
        // База знаний AI помощника
        const responses = {
            greetings: [
                'Привет! Рад вас видеть! Как дела?',
                'Здравствуйте! Чем могу помочь сегодня?',
                'Привет! Я готов помочь вам с любыми вопросами!'
            ],
            help: [
                'Конечно! Я могу помочь вам с различными вопросами. Что именно вас интересует?',
                'Я здесь, чтобы помочь! Расскажите, что вам нужно.',
                'Буду рад помочь! Задавайте любые вопросы.'
            ],
            weather: [
                'К сожалению, я не могу проверить погоду в реальном времени, но могу дать общие советы по подготовке к разным погодным условиям!',
                'Для точной информации о погоде рекомендую использовать специализированные сервисы.',
                'Я не имею доступа к данным о погоде, но могу помочь с другими вопросами!'
            ],
            time: [
                `Сейчас ${this.getCurrentTime()}. Время летит быстро!`,
                `Текущее время: ${this.getCurrentTime()}. Надеюсь, ваш день проходит продуктивно!`,
                `Время сейчас: ${this.getCurrentTime()}. Не забудьте сделать перерыв!`
            ],
            joke: [
                'Почему программисты путают Рождество и Хэллоуин? Потому что Oct 31 == Dec 25! 😄',
                'Как программист ломает голову? Git push --force! 😂',
                'Что сказал программист на свадьбе? "Да, я согласен!" 💍'
            ],
            advice: [
                'Мой совет: всегда начинайте день с позитивных мыслей и планирования!',
                'Помните: маленькие шаги ведут к большим целям. Не сдавайтесь!',
                'Лучший совет: будьте добры к себе и окружающим. Это всегда окупается!'
            ],
            thanks: [
                'Пожалуйста! Рад был помочь! 😊',
                'Не за что! Обращайтесь, если понадобится помощь!',
                'Спасибо за обращение! Буду рад помочь снова!'
            ],
            default: [
                'Интересный вопрос! Давайте разберем его подробнее.',
                'Хм, это интересная тема. Что именно вас интересует?',
                'Я понимаю ваш вопрос. Могу ли я помочь чем-то конкретным?'
            ]
        };

        // Определяем тип сообщения
        let responseType = 'default';
        
        if (message.includes('привет') || message.includes('здравствуй') || message.includes('добрый')) {
            responseType = 'greetings';
        } else if (message.includes('помоги') || message.includes('помощь') || message.includes('нужна помощь')) {
            responseType = 'help';
        } else if (message.includes('погода') || message.includes('дождь') || message.includes('солнце')) {
            responseType = 'weather';
        } else if (message.includes('время') || message.includes('который час')) {
            responseType = 'time';
        } else if (message.includes('анекдот') || message.includes('шутка') || message.includes('смешн')) {
            responseType = 'joke';
        } else if (message.includes('совет') || message.includes('рекомендация')) {
            responseType = 'advice';
        } else if (message.includes('спасибо') || message.includes('благодарю')) {
            responseType = 'thanks';
        }

        // Выбираем случайный ответ из соответствующей категории
        const possibleResponses = responses[responseType];
        return possibleResponses[Math.floor(Math.random() * possibleResponses.length)];
    }

    simulateResponse() {
        if (!this.currentContact) return;

        const responses = [
            'Понятно!',
            'Согласен',
            'Интересно',
            'Хорошо',
            'Спасибо!',
            'Отлично!',
            'Да, конечно',
            'Нет проблем'
        ];

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const message = {
            id: Date.now(),
            text: randomResponse,
            time: this.getCurrentTime(),
            sent: false
        };

        this.messages[this.currentContact.id].push(message);
        this.currentContact.lastMessage = randomResponse;
        this.currentContact.time = this.getCurrentTime();
        this.currentContact.unread = 1;

        this.saveMessages();
        this.saveContacts();
        this.renderContacts();
        this.renderMessages(this.currentContact.id);
    }

    searchContacts(query) {
        const contactItems = document.querySelectorAll('.contact-item');
        
        contactItems.forEach(item => {
            const contactName = item.querySelector('.contact-name').textContent.toLowerCase();
            const contactMessage = item.querySelector('.contact-last-message').textContent.toLowerCase();
            const searchQuery = query.toLowerCase();

            if (contactName.includes(searchQuery) || contactMessage.includes(searchQuery)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    getCurrentTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    showNotification(title, message) {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;

        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        // Показываем уведомление
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Скрываем через 3 секунды
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new XPchat();
});

// Добавляем стили для уведомлений, звонков и AI
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .notification-content h4 {
        margin: 0 0 5px 0;
        font-size: 16px;
    }
    
    .notification-content p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
    }
    
    .unread-badge {
        background: #ff4757;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        margin-left: 10px;
    }

    /* Стили для AI помощника */
    .ai-avatar {
        background: linear-gradient(135deg, #667eea, #764ba2) !important;
        position: relative;
    }

    .ai-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #28a745;
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 10px;
        border: 2px solid white;
    }

    .ai-message {
        background: linear-gradient(135deg, #667eea, #764ba2) !important;
        color: white !important;
        border: none !important;
    }

    .ai-indicator {
        position: absolute;
        top: -10px;
        left: -10px;
        background: #28a745;
        color: white;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        border: 2px solid white;
    }

    /* Стили для звонков */
    .call-ui {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.9);
    }

    .call-overlay {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .call-container {
        background: #1a1a1a;
        border-radius: 20px;
        padding: 30px;
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
    }

    .call-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        color: white;
    }

    .call-info h3 {
        margin: 0 0 5px 0;
        font-size: 24px;
    }

    .call-info span {
        font-size: 16px;
        opacity: 0.8;
    }

    .call-timer {
        font-size: 18px;
        font-weight: bold;
        color: #667eea;
    }

    .video-container {
        position: relative;
        width: 100%;
        height: 400px;
        background: #000;
        border-radius: 15px;
        overflow: hidden;
        margin-bottom: 20px;
    }

    #remoteVideo {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    #localVideo {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 120px;
        height: 90px;
        border-radius: 10px;
        object-fit: cover;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .call-controls {
        display: flex;
        justify-content: center;
        gap: 20px;
    }

    .call-btn {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        font-size: 20px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .mute-btn, .camera-btn {
        background: rgba(255, 255, 255, 0.2);
        color: white;
    }

    .mute-btn:hover, .camera-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
    }

    .mute-btn.active, .camera-btn.active {
        background: #ff4757;
    }

    .end-call-btn {
        background: #ff4757;
        color: white;
    }

    .end-call-btn:hover {
        background: #ff3742;
        transform: scale(1.1);
    }

    /* Адаптивность для звонков */
    @media (max-width: 768px) {
        .call-container {
            padding: 20px;
            border-radius: 0;
            max-width: 100%;
            height: 100vh;
        }

        .video-container {
            height: 300px;
        }

        #localVideo {
            width: 80px;
            height: 60px;
        }

        .call-controls {
            gap: 15px;
        }

        .call-btn {
            width: 50px;
            height: 50px;
            font-size: 18px;
        }
    }
`;
document.head.appendChild(additionalStyles);
