# WebRTC Звонки - XPchat Pro

## Обзор

Модуль WebRTC звонков для XPchat Pro предоставляет полнофункциональную систему голосовых и видеозвонков с поддержкой групповых звонков, демонстрации экрана и записи.

## Основные возможности

### 🎯 Типы звонков
- **Голосовые звонки** - только аудио
- **Видеозвонки** - аудио + видео
- **Демонстрация экрана** - показ экрана другим участникам

### 🔧 Функции управления
- Отключение/включение микрофона
- Отключение/включение видео
- Демонстрация экрана
- Добавление участников в групповой звонок
- Запись звонка
- Чат во время звонка

### 📱 Интерфейс
- Полноэкранный интерфейс звонка
- Адаптивный дизайн для мобильных устройств
- Уведомления о входящих звонках
- Индикаторы состояния соединения

## Технические требования

### Браузеры
- Chrome 66+
- Firefox 60+
- Safari 11+
- Edge 79+

### API
- WebRTC (RTCPeerConnection)
- MediaDevices API
- Screen Capture API
- MediaRecorder API

### Сеть
- STUN серверы для NAT traversal
- TURN серверы (опционально) для сложных сетевых конфигураций

## Архитектура

### Основные компоненты

#### 1. WebRTCCalls (Основной класс)
```javascript
class WebRTCCalls {
    constructor() {
        this.localStream = null;           // Локальный медиапоток
        this.remoteStreams = new Map();    // Удаленные потоки
        this.peerConnections = new Map();  // WebRTC соединения
        this.isInCall = false;            // Статус звонка
        this.callType = null;             // Тип звонка
    }
}
```

#### 2. Управление медиапотоками
- Получение локального аудио/видео
- Переключение между камерой и экраном
- Обработка разрешений устройств

#### 3. WebRTC соединения
- Создание и управление PeerConnection
- Обмен ICE кандидатами
- Обработка входящих потоков

#### 4. Сигналинг
- Отправка предложений/ответов через WebSocket
- Обработка входящих звонков
- Уведомления о состоянии

## Использование

### Инициация звонка

```javascript
// Голосовой звонок
window.webrtcCalls.initiateCall(userId, 'audio');

// Видеозвонок
window.webrtcCalls.initiateCall(userId, 'video');

// Демонстрация экрана
window.webrtcCalls.initiateCall(userId, 'screen');
```

### Обработка входящих звонков

```javascript
// Принять звонок
window.webrtcCalls.acceptCall();

// Отклонить звонок
window.webrtcCalls.rejectCall();
```

### Управление во время звонка

```javascript
// Отключить/включить микрофон
window.webrtcCalls.toggleMute();

// Отключить/включить видео
window.webrtcCalls.toggleVideo();

// Демонстрация экрана
window.webrtcCalls.toggleScreenSharing();

// Завершить звонок
window.webrtcCalls.endCall();
```

## Интеграция с чатом

### Кнопки звонков
Модуль автоматически добавляет кнопки звонков в интерфейс чата:

```html
<button class="action-btn" id="voiceCallBtn" title="Голосовой звонок">
    <i class="fas fa-phone"></i>
</button>
<button class="action-btn" id="videoCallBtn" title="Видеозвонок">
    <i class="fas fa-video"></i>
</button>
```

### WebSocket интеграция
Для работы звонков требуется WebSocket соединение для обмена сигналами:

```javascript
// Отправка предложения звонка
{
    type: 'call_offer',
    to: userId,
    offer: RTCSessionDescription,
    callType: 'audio' | 'video' | 'screen'
}

// Ответ на звонок
{
    type: 'call_answer',
    to: userId,
    answer: RTCSessionDescription
}

// ICE кандидат
{
    type: 'ice_candidate',
    to: userId,
    candidate: RTCIceCandidate
}
```

## Конфигурация

### STUN серверы
По умолчанию используются Google STUN серверы:

```javascript
this.rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
    ]
};
```

### Настройки медиа
```javascript
// Аудио настройки
audio: {
    echoCancellation: true,    // Подавление эха
    noiseSuppression: true,    // Подавление шума
    autoGainControl: true      // Автоматическая регулировка громкости
}

// Видео настройки
video: {
    width: { ideal: 1280 },    // Идеальная ширина
    height: { ideal: 720 },    // Идеальная высота
    facingMode: 'user'         // Фронтальная камера
}
```

## Безопасность

### Разрешения устройств
- Запрос разрешений на микрофон/камеру
- Проверка доступности устройств
- Обработка ошибок доступа

### Защита конфиденциальности
- Локальная обработка медиа
- Шифрование WebRTC соединений
- Контроль доступа к устройствам

## Производительность

### Оптимизации
- Автоматическое управление качеством видео
- Адаптивная настройка битрейта
- Эффективное управление памятью

### Мониторинг
- Отслеживание состояния соединения
- Индикаторы качества
- Статистика звонков

## Обработка ошибок

### Типичные ошибки
```javascript
try {
    await this.getLocalStream(callType);
} catch (error) {
    if (error.name === 'NotAllowedError') {
        this.showCallError('Необходимо разрешить доступ к микрофону/камере');
    } else if (error.name === 'NotFoundError') {
        this.showCallError('Микрофон или камера не найдены');
    } else {
        this.showCallError('Ошибка доступа к медиаустройствам');
    }
}
```

### Восстановление соединения
- Автоматическое переподключение
- Обработка сетевых сбоев
- Уведомления о проблемах

## Мобильная поддержка

### Адаптивность
- Оптимизированный интерфейс для мобильных устройств
- Поддержка жестов
- Адаптивные размеры кнопок

### Особенности мобильных устройств
- Обработка переключения приложений
- Управление фоновыми процессами
- Оптимизация батареи

## Тестирование

### Локальное тестирование
```bash
# Запуск локального сервера
python -m http.server 8000

# Открытие в браузере
http://localhost:8000
```

### Тестирование звонков
- Использование двух вкладок браузера
- Тестирование на разных устройствах
- Проверка различных сетевых условий

## Развертывание

### Требования сервера
- WebSocket поддержка
- HTTPS (для production)
- STUN/TURN серверы

### Конфигурация
```javascript
// Настройка WebSocket соединения
const ws = new WebSocket('wss://your-domain.com/webrtc');

// Обработка сообщений
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    window.webrtcCalls.handleWebSocketMessage(data);
};
```

## Будущие улучшения

### Планируемые функции
- [ ] Групповые видеозвонки
- [ ] Запись звонков на сервер
- [ ] Интеграция с календарем
- [ ] Автоматические ответы
- [ ] Переадресация звонков

### Технические улучшения
- [ ] WebRTC DataChannel для чата
- [ ] Адаптивное качество видео
- [ ] Машинное обучение для улучшения качества
- [ ] Поддержка WebRTC 2.0

## Устранение неполадок

### Частые проблемы

#### 1. Не работает микрофон/камера
- Проверьте разрешения браузера
- Убедитесь, что устройства не используются другими приложениями
- Проверьте настройки браузера

#### 2. Проблемы с соединением
- Проверьте настройки файрвола
- Убедитесь, что STUN серверы доступны
- Проверьте сетевую конфигурацию

#### 3. Плохое качество видео
- Проверьте скорость интернета
- Уменьшите разрешение видео
- Проверьте настройки камеры

### Логи и отладка
```javascript
// Включение подробного логирования
localStorage.setItem('webrtc_debug', 'true');

// Просмотр логов в консоли
console.log('WebRTC Debug:', window.webrtcCalls.getCallStats());
```

## Поддержка

### Документация
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [MediaDevices API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices)
- [Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API)

### Сообщество
- GitHub Issues
- WebRTC форумы
- Stack Overflow

---

**Версия:** 1.0.0  
**Дата:** Декабрь 2024  
**Автор:** XPchat Pro Team
