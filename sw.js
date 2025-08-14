// XPchat Service Worker - Улучшенный офлайн режим
const CACHE_NAME = 'xpchat-v2.0';
const STATIC_CACHE = 'xpchat-static-v2.0';
const DYNAMIC_CACHE = 'xpchat-dynamic-v2.0';

// Файлы для кэширования
const STATIC_FILES = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/pwa.js',
    '/manifest.json',
    '/sw.js',
    '/start.html',
    '/demo_calls.html',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2'
];

// Офлайн страница
const OFFLINE_PAGE = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XPchat - Офлайн режим</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .offline-container {
            text-align: center;
            max-width: 500px;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .offline-icon {
            font-size: 80px;
            margin-bottom: 20px;
            color: #ffd700;
        }
        h1 {
            margin-bottom: 20px;
            font-size: 28px;
        }
        p {
            margin-bottom: 30px;
            font-size: 16px;
            line-height: 1.6;
            opacity: 0.9;
        }
        .features {
            text-align: left;
            margin: 30px 0;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
        }
        .features h3 {
            margin-bottom: 15px;
            color: #ffd700;
        }
        .features ul {
            list-style: none;
            padding: 0;
        }
        .features li {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .features li:before {
            content: "✅ ";
            margin-right: 10px;
        }
        .retry-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
            margin: 10px;
        }
        .retry-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }
        .status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.1);
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📱</div>
        <h1>XPchat работает офлайн!</h1>
        <p>У вас нет интернет-соединения, но XPchat продолжает работать в офлайн режиме.</p>
        
        <div class="features">
            <h3>🌐 Что доступно офлайн:</h3>
            <ul>
                <li>Просмотр контактов и сообщений</li>
                <li>Создание новых чатов</li>
                <li>Написание сообщений (сохранятся при подключении)</li>
                <li>Настройки приложения</li>
                <li>AI помощник (базовые функции)</li>
            </ul>
        </div>
        
        <button class="retry-btn" onclick="window.location.reload()">🔄 Попробовать снова</button>
        <button class="retry-btn" onclick="checkConnection()">📡 Проверить соединение</button>
        
        <div class="status" id="status">
            Статус: Офлайн режим активен
        </div>
    </div>
    
    <script>
        function checkConnection() {
            const status = document.getElementById('status');
            if (navigator.onLine) {
                status.innerHTML = 'Статус: Интернет восстановлен! Перезагружаем...';
                status.style.background = 'rgba(40, 167, 69, 0.3)';
                setTimeout(() => window.location.reload(), 2000);
            } else {
                status.innerHTML = 'Статус: Интернет недоступен';
                status.style.background = 'rgba(220, 53, 69, 0.3)';
            }
        }
        
        // Автоматическая проверка соединения
        setInterval(checkConnection, 5000);
        
        // Слушаем события подключения/отключения
        window.addEventListener('online', () => {
            document.getElementById('status').innerHTML = 'Статус: Интернет восстановлен! Перезагружаем...';
            setTimeout(() => window.location.reload(), 2000);
        });
        
        window.addEventListener('offline', () => {
            document.getElementById('status').innerHTML = 'Статус: Офлайн режим активен';
        });
    </script>
</body>
</html>
`;

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('XPchat SW: Установка...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('XPchat SW: Кэширование статических файлов...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('XPchat SW: Статические файлы закэшированы');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('XPchat SW: Ошибка кэширования:', error);
            })
    );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('XPchat SW: Активация...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('XPchat SW: Удаление старого кэша:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('XPchat SW: Активирован');
                return self.clients.claim();
            })
    );
});

// Перехват сетевых запросов
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Стратегия кэширования для разных типов запросов
    if (request.method === 'GET') {
        // Для HTML страниц - Network First, затем кэш
        if (request.destination === 'document') {
            event.respondWith(
                fetch(request)
                    .then((response) => {
                        // Клонируем ответ для кэширования
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then((cache) => cache.put(request, responseClone));
                        return response;
                    })
                    .catch(() => {
                        // Если нет интернета, показываем офлайн страницу
                        return new Response(OFFLINE_PAGE, {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    })
            );
        }
        // Для CSS, JS, изображений - Cache First, затем сеть
        else if (request.destination === 'style' || 
                 request.destination === 'script' || 
                 request.destination === 'image') {
            event.respondWith(
                caches.match(request)
                    .then((response) => {
                        return response || fetch(request)
                            .then((fetchResponse) => {
                                // Кэшируем новый ресурс
                                const responseClone = fetchResponse.clone();
                                caches.open(DYNAMIC_CACHE)
                                    .then((cache) => cache.put(request, responseClone));
                                return fetchResponse;
                            });
                    })
            );
        }
        // Для остальных запросов - Network First
        else {
            event.respondWith(
                fetch(request)
                    .then((response) => {
                        // Кэшируем успешные ответы
                        if (response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(DYNAMIC_CACHE)
                                .then((cache) => cache.put(request, responseClone));
                        }
                        return response;
                    })
                    .catch(() => {
                        // Пытаемся найти в кэше
                        return caches.match(request);
                    })
            );
        }
    }
});

// Фоновая синхронизация
self.addEventListener('sync', (event) => {
    console.log('XPchat SW: Фоновая синхронизация:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Здесь можно добавить логику синхронизации данных
            console.log('XPchat SW: Синхронизация данных...')
        );
    }
});

// Обработка push уведомлений
self.addEventListener('push', (event) => {
    console.log('XPchat SW: Push уведомление получено');
    
    const options = {
        body: event.data ? event.data.text() : 'Новое сообщение в XPchat!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'Открыть чат',
                icon: '/icons/icon-72x72.png'
            },
            {
                action: 'close',
                title: 'Закрыть',
                icon: '/icons/icon-72x72.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('XPchat', options)
    );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
    console.log('XPchat SW: Клик по уведомлению:', event.action);
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Обработка сообщений от основного приложения
self.addEventListener('message', (event) => {
    console.log('XPchat SW: Получено сообщение:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

console.log('XPchat Service Worker загружен!');
