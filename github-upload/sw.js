const CACHE_NAME = 'xpchat-v1.0.0';
const STATIC_CACHE = 'xpchat-static-v1.0.0';
const DYNAMIC_CACHE = 'xpchat-dynamic-v1.0.0';

// Файлы для кэширования
const STATIC_FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/start.html',
  '/demo_calls.html',
  '/AI_POMOSHCHNIK.txt',
  '/ONLINE_MODE.txt',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('XPchat Service Worker: Установка...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('XPchat Service Worker: Кэширование статических файлов');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('XPchat Service Worker: Установка завершена');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('XPchat Service Worker: Ошибка установки:', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('XPchat Service Worker: Активация...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('XPchat Service Worker: Удаление старого кэша:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('XPchat Service Worker: Активация завершена');
        return self.clients.claim();
      })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Пропускаем WebSocket соединения
  if (request.url.startsWith('ws://') || request.url.startsWith('wss://')) {
    return;
  }
  
  // Стратегия кэширования для разных типов запросов
  if (request.method === 'GET') {
    // Статические файлы - Cache First
    if (STATIC_FILES.includes(request.url) || 
        request.url.includes('cdnjs.cloudflare.com') ||
        request.url.includes('webfonts')) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
    }
    // API запросы - Network First
    else if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    }
    // Остальные запросы - Network First
    else {
      event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    }
  }
});

// Стратегия Cache First
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('XPchat Service Worker: Ошибка Cache First:', error);
    return new Response('Ошибка загрузки', { status: 500 });
  }
}

// Стратегия Network First
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('XPchat Service Worker: Сеть недоступна, используем кэш');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Возвращаем офлайн страницу для HTML запросов
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/index.html');
    }
    
    return new Response('Офлайн режим', { status: 503 });
  }
}

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  console.log('XPchat Service Worker: Получено push уведомление');
  
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'Новое сообщение в XPchat',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
          url: data.url || '/',
          timestamp: Date.now()
        },
        actions: [
          {
            action: 'open',
            title: 'Открыть',
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
        self.registration.showNotification(data.title || 'XPchat', options)
      );
    } catch (error) {
      console.error('XPchat Service Worker: Ошибка обработки push уведомления:', error);
    }
  }
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  console.log('XPchat Service Worker: Клик по уведомлению:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || event.action === 'default') {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // Если есть открытое окно, фокусируемся на нем
          for (const client of clientList) {
            if (client.url.includes(event.notification.data.url) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Если нет открытого окна, открываем новое
          if (clients.openWindow) {
            return clients.openWindow(event.notification.data.url);
          }
        })
    );
  }
});

// Обработка фоновой синхронизации
self.addEventListener('sync', (event) => {
  console.log('XPchat Service Worker: Фоновая синхронизация:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(backgroundSync());
  }
});

// Фоновая синхронизация
async function backgroundSync() {
  try {
    // Здесь можно добавить логику синхронизации данных
    console.log('XPchat Service Worker: Выполняется фоновая синхронизация');
    
    // Проверяем подключение к серверу
    const response = await fetch('/api/status');
    if (response.ok) {
      console.log('XPchat Service Worker: Сервер доступен');
      // Можно отправить отложенные сообщения или обновить данные
    }
  } catch (error) {
    console.error('XPchat Service Worker: Ошибка фоновой синхронизации:', error);
  }
}

// Обработка сообщений от основного потока
self.addEventListener('message', (event) => {
  console.log('XPchat Service Worker: Получено сообщение:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Обработка ошибок
self.addEventListener('error', (event) => {
  console.error('XPchat Service Worker: Ошибка:', event.error);
});

// Обработка необработанных отклонений
self.addEventListener('unhandledrejection', (event) => {
  console.error('XPchat Service Worker: Необработанное отклонение:', event.reason);
});

console.log('XPchat Service Worker: Загружен и готов к работе');
