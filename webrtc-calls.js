// XPchat Pro - WebRTC Звонки
class WebRTCCalls {
    constructor() {
        this.localStream = null;
        this.remoteStreams = new Map();
        this.peerConnections = new Map();
        this.localVideo = null;
        this.remoteVideos = new Map();
        this.isInCall = false;
        this.callType = null; // 'audio', 'video', 'screen'
        this.isMuted = false;
        this.isVideoEnabled = true;
        this.isScreenSharing = false;
        this.screenStream = null;
        this.callHistory = JSON.parse(localStorage.getItem('call_history') || '[]');
        this.maxCallHistory = 100;
        
        // WebRTC конфигурация
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCallInterface();
        this.loadCallHistory();
    }

    setupEventListeners() {
        // Обработчики для кнопок звонков
        document.addEventListener('click', (e) => {
            if (e.target.matches('.call-btn')) {
                const userId = e.target.dataset.userId;
                const callType = e.target.dataset.callType || 'audio';
                this.initiateCall(userId, callType);
            }
        });

        // Обработчики для входящих звонков
        document.addEventListener('click', (e) => {
            if (e.target.matches('.accept-call-btn')) {
                this.acceptCall();
            } else if (e.target.matches('.reject-call-btn')) {
                this.rejectCall();
            }
        });
    }

    setupCallInterface() {
        // Создаем интерфейс для звонков
        this.createCallInterface();
        this.addCallEventListeners();
    }

    createCallInterface() {
        const callInterface = document.createElement('div');
        callInterface.className = 'call-interface';
        callInterface.id = 'callInterface';
        callInterface.innerHTML = `
            <div class="call-header">
                <div class="call-info">
                    <h3 id="callTitle">Звонок</h3>
                    <p id="callStatus">Подключение...</p>
                </div>
                <button class="close-call-btn" id="closeCallBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="call-content">
                <div class="video-container">
                    <div class="local-video-wrapper">
                        <video id="localVideo" autoplay muted playsinline></video>
                        <div class="local-video-overlay">
                            <span class="local-label">Вы</span>
                        </div>
                    </div>
                    <div class="remote-videos" id="remoteVideos"></div>
                </div>
                
                <div class="call-controls">
                    <button class="control-btn mute-btn" id="muteBtn" title="Отключить микрофон">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="control-btn video-btn" id="videoBtn" title="Отключить видео">
                        <i class="fas fa-video"></i>
                    </button>
                    <button class="control-btn screen-btn" id="screenBtn" title="Поделиться экраном">
                        <i class="fas fa-desktop"></i>
                    </button>
                    <button class="control-btn end-call-btn" id="endCallBtn" title="Завершить звонок">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                </div>
            </div>
            
            <div class="call-actions">
                <button class="action-btn" id="addParticipantBtn">
                    <i class="fas fa-user-plus"></i> Добавить участника
                </button>
                <button class="action-btn" id="recordCallBtn">
                    <i class="fas fa-record-vinyl"></i> Записать
                </button>
                <button class="action-btn" id="chatBtn">
                    <i class="fas fa-comment"></i> Чат
                </button>
            </div>
        `;

        document.body.appendChild(callInterface);
        this.localVideo = document.getElementById('localVideo');
    }

    addCallEventListeners() {
        const callInterface = document.getElementById('callInterface');
        
        // Кнопка закрытия
        document.getElementById('closeCallBtn').addEventListener('click', () => {
            this.endCall();
        });

        // Кнопка отключения микрофона
        document.getElementById('muteBtn').addEventListener('click', () => {
            this.toggleMute();
        });

        // Кнопка отключения видео
        document.getElementById('videoBtn').addEventListener('click', () => {
            this.toggleVideo();
        });

        // Кнопка демонстрации экрана
        document.getElementById('screenBtn').addEventListener('click', () => {
            this.toggleScreenSharing();
        });

        // Кнопка завершения звонка
        document.getElementById('endCallBtn').addEventListener('click', () => {
            this.endCall();
        });

        // Добавление участника
        document.getElementById('addParticipantBtn').addEventListener('click', () => {
            this.showAddParticipantDialog();
        });

        // Запись звонка
        document.getElementById('recordCallBtn').addEventListener('click', () => {
            this.toggleRecording();
        });

        // Чат во время звонка
        document.getElementById('chatBtn').addEventListener('click', () => {
            this.toggleCallChat();
        });
    }

    async initiateCall(userId, callType = 'audio') {
        try {
            this.callType = callType;
            this.isInCall = true;
            
            // Получаем локальный поток
            await this.getLocalStream(callType);
            
            // Показываем интерфейс звонка
            this.showCallInterface();
            
            // Создаем PeerConnection
            const peerConnection = new RTCPeerConnection(this.rtcConfig);
            this.peerConnections.set(userId, peerConnection);
            
            // Добавляем локальный поток
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
            
            // Обработчики событий
            this.setupPeerConnectionHandlers(peerConnection, userId);
            
            // Создаем предложение
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            // Отправляем предложение через WebSocket
            this.sendCallOffer(userId, offer, callType);
            
            // Обновляем статус
            this.updateCallStatus(`Вызываем ${this.getUserName(userId)}...`);
            
        } catch (error) {
            console.error('Ошибка при инициации звонка:', error);
            this.showCallError('Не удалось инициировать звонок');
        }
    }

    async getLocalStream(callType) {
        try {
            let constraints = {};
            
            if (callType === 'audio') {
                constraints = {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                };
            } else if (callType === 'video') {
                constraints = {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    }
                };
            } else if (callType === 'screen') {
                constraints = {
                    audio: false,
                    video: {
                        mediaSource: 'screen'
                    }
                };
            }
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (this.localVideo) {
                this.localVideo.srcObject = this.localStream;
            }
            
        } catch (error) {
            console.error('Ошибка при получении медиапотока:', error);
            throw new Error('Не удалось получить доступ к микрофону/камере');
        }
    }

    setupPeerConnectionHandlers(peerConnection, userId) {
        // Обработчик ICE кандидатов
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendIceCandidate(userId, event.candidate);
            }
        };

        // Обработчик входящих потоков
        peerConnection.ontrack = (event) => {
            this.handleRemoteTrack(event, userId);
        };

        // Обработчик изменения состояния соединения
        peerConnection.onconnectionstatechange = () => {
            this.handleConnectionStateChange(peerConnection, userId);
        };

        // Обработчик ICE состояния
        peerConnection.oniceconnectionstatechange = () => {
            this.handleIceConnectionStateChange(peerConnection, userId);
        };
    }

    handleRemoteTrack(event, userId) {
        const remoteVideo = document.createElement('video');
        remoteVideo.id = `remoteVideo_${userId}`;
        remoteVideo.autoplay = true;
        remoteVideo.playsinline = true;
        remoteVideo.className = 'remote-video';
        
        const videoWrapper = document.createElement('div');
        videoWrapper.className = 'remote-video-wrapper';
        videoWrapper.innerHTML = `
            <video id="remoteVideo_${userId}" autoplay playsinline></video>
            <div class="remote-video-overlay">
                <span class="remote-label">${this.getUserName(userId)}</span>
            </div>
        `;
        
        document.getElementById('remoteVideos').appendChild(videoWrapper);
        
        const videoElement = videoWrapper.querySelector('video');
        videoElement.srcObject = event.streams[0];
        this.remoteStreams.set(userId, event.streams[0]);
        this.remoteVideos.set(userId, videoElement);
        
        this.updateCallStatus(`${this.getUserName(userId)} присоединился к звонку`);
    }

    handleConnectionStateChange(peerConnection, userId) {
        const state = peerConnection.connectionState;
        console.log(`Состояние соединения с ${userId}:`, state);
        
        switch (state) {
            case 'connected':
                this.updateCallStatus('Соединение установлено');
                break;
            case 'disconnected':
                this.updateCallStatus(`${this.getUserName(userId)} отключился`);
                break;
            case 'failed':
                this.updateCallStatus('Ошибка соединения');
                break;
            case 'closed':
                this.removeRemoteVideo(userId);
                break;
        }
    }

    handleIceConnectionStateChange(peerConnection, userId) {
        const state = peerConnection.iceConnectionState;
        console.log(`ICE состояние с ${userId}:`, state);
        
        if (state === 'failed') {
            this.updateCallStatus('Проблемы с соединением');
        }
    }

    async acceptCall() {
        try {
            // Получаем локальный поток
            await this.getLocalStream(this.callType);
            
            // Показываем интерфейс звонка
            this.showCallInterface();
            
            // Создаем ответ
            const peerConnection = this.peerConnections.get(this.incomingCallFrom);
            if (peerConnection) {
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                // Отправляем ответ
                this.sendCallAnswer(this.incomingCallFrom, answer);
                
                this.updateCallStatus('Звонок принят');
            }
            
        } catch (error) {
            console.error('Ошибка при принятии звонка:', error);
            this.showCallError('Не удалось принять звонок');
        }
    }

    rejectCall() {
        // Отправляем отклонение
        this.sendCallRejection(this.incomingCallFrom);
        
        // Скрываем уведомление о входящем звонке
        this.hideIncomingCallNotification();
        
        // Очищаем состояние
        this.incomingCallFrom = null;
        this.callType = null;
    }

    endCall() {
        // Останавливаем все медиапотоки
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        
        // Закрываем все PeerConnection
        this.peerConnections.forEach(connection => {
            connection.close();
        });
        this.peerConnections.clear();
        
        // Очищаем удаленные видео
        this.remoteStreams.clear();
        this.remoteVideos.clear();
        
        // Скрываем интерфейс звонка
        this.hideCallInterface();
        
        // Сбрасываем состояние
        this.isInCall = false;
        this.callType = null;
        this.isMuted = false;
        this.isVideoEnabled = true;
        this.isScreenSharing = false;
        
        // Добавляем в историю
        this.addToCallHistory('ended');
        
        // Уведомляем других участников
        this.notifyCallEnded();
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isMuted = !audioTrack.enabled;
                
                const muteBtn = document.getElementById('muteBtn');
                if (this.isMuted) {
                    muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                    muteBtn.title = 'Включить микрофон';
                    muteBtn.classList.add('muted');
                } else {
                    muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                    muteBtn.title = 'Отключить микрофон';
                    muteBtn.classList.remove('muted');
                }
            }
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                this.isVideoEnabled = videoTrack.enabled;
                
                const videoBtn = document.getElementById('videoBtn');
                if (!this.isVideoEnabled) {
                    videoBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
                    videoBtn.title = 'Включить видео';
                    videoBtn.classList.add('disabled');
                } else {
                    videoBtn.innerHTML = '<i class="fas fa-video"></i>';
                    videoBtn.title = 'Отключить видео';
                    videoBtn.classList.remove('disabled');
                }
            }
        }
    }

    async toggleScreenSharing() {
        try {
            if (!this.isScreenSharing) {
                // Начинаем демонстрацию экрана
                this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });
                
                // Заменяем видео поток на экран
                const videoTrack = this.screenStream.getVideoTracks()[0];
                const sender = this.peerConnections.values().next().value?.getSenders()
                    .find(s => s.track?.kind === 'video');
                
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
                
                this.isScreenSharing = true;
                
                const screenBtn = document.getElementById('screenBtn');
                screenBtn.innerHTML = '<i class="fas fa-stop"></i>';
                screenBtn.title = 'Остановить демонстрацию экрана';
                screenBtn.classList.add('active');
                
                // Обработчик остановки демонстрации экрана
                videoTrack.onended = () => {
                    this.stopScreenSharing();
                };
                
            } else {
                this.stopScreenSharing();
            }
            
        } catch (error) {
            console.error('Ошибка при демонстрации экрана:', error);
            this.showCallError('Не удалось начать демонстрацию экрана');
        }
    }

    stopScreenSharing() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        
        // Возвращаем обычное видео
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            const sender = this.peerConnections.values().next().value?.getSenders()
                .find(s => s.track?.kind === 'video');
            
            if (sender && videoTrack) {
                sender.replaceTrack(videoTrack);
            }
        }
        
        this.isScreenSharing = false;
        
        const screenBtn = document.getElementById('screenBtn');
        screenBtn.innerHTML = '<i class="fas fa-desktop"></i>';
        screenBtn.title = 'Поделиться экраном';
        screenBtn.classList.remove('active');
    }

    showCallInterface() {
        const callInterface = document.getElementById('callInterface');
        callInterface.style.display = 'flex';
        callInterface.classList.add('active');
        
        // Обновляем заголовок
        const callTitle = document.getElementById('callTitle');
        if (this.callType === 'audio') {
            callTitle.textContent = 'Голосовой звонок';
        } else if (this.callType === 'video') {
            callTitle.textContent = 'Видеозвонок';
        } else if (this.callType === 'screen') {
            callTitle.textContent = 'Демонстрация экрана';
        }
    }

    hideCallInterface() {
        const callInterface = document.getElementById('callInterface');
        callInterface.style.display = 'none';
        callInterface.classList.remove('active');
    }

    updateCallStatus(status) {
        const callStatus = document.getElementById('callStatus');
        if (callStatus) {
            callStatus.textContent = status;
        }
    }

    showCallError(message) {
        // Показываем уведомление об ошибке
        const notification = document.createElement('div');
        notification.className = 'call-error-notification';
        notification.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button class="close-error-btn">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        // Кнопка закрытия
        notification.querySelector('.close-error-btn').addEventListener('click', () => {
            notification.remove();
        });
    }

    showIncomingCallNotification(fromUserId, callType) {
        this.incomingCallFrom = fromUserId;
        this.callType = callType;
        
        const notification = document.createElement('div');
        notification.className = 'incoming-call-notification';
        notification.innerHTML = `
            <div class="call-notification-content">
                <div class="caller-info">
                    <i class="fas fa-phone"></i>
                    <div class="caller-details">
                        <h4>${this.getUserName(fromUserId)}</h4>
                        <p>${callType === 'audio' ? 'Голосовой звонок' : 'Видеозвонок'}</p>
                    </div>
                </div>
                <div class="call-actions">
                    <button class="accept-call-btn" title="Принять">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button class="reject-call-btn" title="Отклонить">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Звуковое уведомление
        this.playIncomingCallSound();
        
        // Автоматически скрываем через 30 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
                this.incomingCallFrom = null;
                this.callType = null;
            }
        }, 30000);
    }

    hideIncomingCallNotification() {
        const notification = document.querySelector('.incoming-call-notification');
        if (notification) {
            notification.remove();
        }
        
        // Останавливаем звук
        this.stopIncomingCallSound();
    }

    playIncomingCallSound() {
        // Создаем простой звук входящего звонка
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
        
        // Повторяем каждые 2 секунды
        this.incomingCallInterval = setInterval(() => {
            if (this.incomingCallFrom) {
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.5);
            }
        }, 2000);
    }

    stopIncomingCallSound() {
        if (this.incomingCallInterval) {
            clearInterval(this.incomingCallInterval);
            this.incomingCallInterval = null;
        }
    }

    // WebSocket методы для обмена сигналами
    sendCallOffer(userId, offer, callType) {
        // Отправляем через WebSocket
        if (window.chat && window.chat.websocket) {
            window.chat.websocket.send(JSON.stringify({
                type: 'call_offer',
                to: userId,
                offer: offer,
                callType: callType
            }));
        }
    }

    sendCallAnswer(userId, answer) {
        if (window.chat && window.chat.websocket) {
            window.chat.websocket.send(JSON.stringify({
                type: 'call_answer',
                to: userId,
                answer: answer
            }));
        }
    }

    sendCallRejection(userId) {
        if (window.chat && window.chat.websocket) {
            window.chat.websocket.send(JSON.stringify({
                type: 'call_reject',
                to: userId
            }));
        }
    }

    sendIceCandidate(userId, candidate) {
        if (window.chat && window.chat.websocket) {
            window.chat.websocket.send(JSON.stringify({
                type: 'ice_candidate',
                to: userId,
                candidate: candidate
            }));
        }
    }

    notifyCallEnded() {
        if (window.chat && window.chat.websocket) {
            window.chat.websocket.send(JSON.stringify({
                type: 'call_ended'
            }));
        }
    }

    // Обработка входящих сигналов
    handleCallOffer(fromUserId, offer, callType) {
        this.callType = callType;
        
        // Создаем PeerConnection
        const peerConnection = new RTCPeerConnection(this.rtcConfig);
        this.peerConnections.set(fromUserId, peerConnection);
        
        // Обработчики событий
        this.setupPeerConnectionHandlers(peerConnection, fromUserId);
        
        // Устанавливаем удаленное описание
        peerConnection.setRemoteDescription(offer);
        
        // Показываем уведомление о входящем звонке
        this.showIncomingCallNotification(fromUserId, callType);
    }

    async handleCallAnswer(fromUserId, answer) {
        const peerConnection = this.peerConnections.get(fromUserId);
        if (peerConnection) {
            await peerConnection.setRemoteDescription(answer);
            this.updateCallStatus('Звонок подключен');
        }
    }

    handleCallRejection(fromUserId) {
        this.updateCallStatus('Звонок отклонен');
        setTimeout(() => {
            this.endCall();
        }, 2000);
    }

    handleIceCandidate(fromUserId, candidate) {
        const peerConnection = this.peerConnections.get(fromUserId);
        if (peerConnection) {
            peerConnection.addIceCandidate(candidate);
        }
    }

    // Вспомогательные методы
    getUserName(userId) {
        // Получаем имя пользователя из чата
        if (window.chat && window.chat.users) {
            const user = window.chat.users.find(u => u.id === userId);
            return user ? user.name : `Пользователь ${userId}`;
        }
        return `Пользователь ${userId}`;
    }

    removeRemoteVideo(userId) {
        const videoWrapper = document.querySelector(`[data-user-id="${userId}"]`);
        if (videoWrapper) {
            videoWrapper.remove();
        }
        this.remoteStreams.delete(userId);
        this.remoteVideos.delete(userId);
    }

    addToCallHistory(status) {
        const callRecord = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            type: this.callType,
            status: status,
            duration: this.getCallDuration(),
            participants: Array.from(this.peerConnections.keys())
        };
        
        this.callHistory.unshift(callRecord);
        
        // Ограничиваем историю
        if (this.callHistory.length > this.maxCallHistory) {
            this.callHistory = this.callHistory.slice(0, this.maxCallHistory);
        }
        
        this.saveCallHistory();
    }

    getCallDuration() {
        if (this.callStartTime) {
            return Math.floor((Date.now() - this.callStartTime) / 1000);
        }
        return 0;
    }

    loadCallHistory() {
        const saved = localStorage.getItem('call_history');
        if (saved) {
            this.callHistory = JSON.parse(saved);
        }
    }

    saveCallHistory() {
        localStorage.setItem('call_history', JSON.stringify(this.callHistory));
    }

    getCallHistory() {
        return this.callHistory;
    }

    // Дополнительные функции
    showAddParticipantDialog() {
        // Показываем диалог добавления участника
        const dialog = document.createElement('div');
        dialog.className = 'add-participant-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Добавить участника</h3>
                <div class="participant-list">
                    ${this.getAvailableParticipants()}
                </div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" id="cancelAddBtn">Отмена</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Обработчики
        document.getElementById('cancelAddBtn').addEventListener('click', () => {
            dialog.remove();
        });
    }

    getAvailableParticipants() {
        if (window.chat && window.chat.users) {
            return window.chat.users
                .filter(user => !this.peerConnections.has(user.id))
                .map(user => `
                    <div class="participant-item" data-user-id="${user.id}">
                        <span class="participant-name">${user.name}</span>
                        <button class="add-participant-btn" onclick="window.webrtcCalls.addParticipant('${user.id}')">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                `).join('');
        }
        return '<p>Нет доступных пользователей</p>';
    }

    addParticipant(userId) {
        // Добавляем нового участника в групповой звонок
        this.initiateCall(userId, this.callType);
    }

    toggleRecording() {
        // Переключение записи звонка
        const recordBtn = document.getElementById('recordCallBtn');
        if (recordBtn.classList.contains('recording')) {
            this.stopRecording();
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<i class="fas fa-record-vinyl"></i> Записать';
        } else {
            this.startRecording();
            recordBtn.classList.add('recording');
            recordBtn.innerHTML = '<i class="fas fa-stop"></i> Остановить';
        }
    }

    startRecording() {
        // Начинаем запись звонка
        if (this.localStream) {
            const mediaRecorder = new MediaRecorder(this.localStream);
            const chunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                chunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                
                // Создаем ссылку для скачивания
                const a = document.createElement('a');
                a.href = url;
                a.download = `call_recording_${Date.now()}.webm`;
                a.click();
                
                URL.revokeObjectURL(url);
            };
            
            mediaRecorder.start();
            this.mediaRecorder = mediaRecorder;
        }
    }

    stopRecording() {
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.mediaRecorder = null;
        }
    }

    toggleCallChat() {
        // Показываем/скрываем чат во время звонка
        const chatContainer = document.querySelector('.call-chat-container');
        if (chatContainer) {
            chatContainer.classList.toggle('hidden');
        } else {
            this.createCallChat();
        }
    }

    createCallChat() {
        // Создаем чат для звонка
        const chatContainer = document.createElement('div');
        chatContainer.className = 'call-chat-container';
        chatContainer.innerHTML = `
            <div class="call-chat-header">
                <h4>Чат звонка</h4>
                <button class="close-chat-btn">&times;</button>
            </div>
            <div class="call-chat-messages"></div>
            <div class="call-chat-input">
                <input type="text" placeholder="Введите сообщение..." />
                <button class="send-chat-btn">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        
        document.querySelector('.call-interface').appendChild(chatContainer);
        
        // Обработчики
        chatContainer.querySelector('.close-chat-btn').addEventListener('click', () => {
            chatContainer.remove();
        });
        
        chatContainer.querySelector('.send-chat-btn').addEventListener('click', () => {
            const input = chatContainer.querySelector('input');
            if (input.value.trim()) {
                this.sendCallChatMessage(input.value.trim());
                input.value = '';
            }
        });
        
        chatContainer.querySelector('input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const input = chatContainer.querySelector('input');
                if (input.value.trim()) {
                    this.sendCallChatMessage(input.value.trim());
                    input.value = '';
                }
            }
        });
    }

    sendCallChatMessage(message) {
        // Отправляем сообщение в чат звонка
        const chatMessages = document.querySelector('.call-chat-messages');
        if (chatMessages) {
            const messageElement = document.createElement('div');
            messageElement.className = 'call-chat-message';
            messageElement.innerHTML = `
                <span class="message-sender">Вы:</span>
                <span class="message-text">${message}</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            `;
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Отправляем другим участникам
        if (window.chat && window.chat.websocket) {
            window.chat.websocket.send(JSON.stringify({
                type: 'call_chat',
                message: message
            }));
        }
    }

    // Публичные методы для интеграции
    isCallActive() {
        return this.isInCall;
    }

    getCallType() {
        return this.callType;
    }

    getParticipants() {
        return Array.from(this.peerConnections.keys());
    }

    // Статистика звонка
    getCallStats() {
        const stats = {
            duration: this.getCallDuration(),
            participants: this.getParticipants().length,
            type: this.callType,
            isMuted: this.isMuted,
            isVideoEnabled: this.isVideoEnabled,
            isScreenSharing: this.isScreenSharing
        };
        
        return stats;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.webrtcCalls = new WebRTCCalls();
});

// Экспорт для использования в других модулях
window.WebRTCCalls = WebRTCCalls;
