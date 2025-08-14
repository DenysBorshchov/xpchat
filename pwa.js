// XPchat PWA функциональность
class XPchatPWA {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isStandalone = this.checkStandalone();
        
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.setupInstallBanner();
        this.setupMobileNavigation();
        this.setupTouchGestures();
        this.setupOfflineDetection();
        this.setupPushNotifications();
    }

    // Регистрация Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('XPchat PWA: Service Worker зарегистрирован:', registration);
                
                // Проверяем обновления
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
                
                // Обработка сообщений от Service Worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event.data);
                });
                
            } catch (error) {
                console.error('XPchat PWA: Ошибка регистрации Service Worker:', error);
            }
        }
    }

    // Настройка баннера установки
    setupInstallBanner() {
        const installBanner = document.getElementById('installBanner');
        const installBtn = document.getElementById('installBtn');
        const closeBannerBtn = document.getElementById('closeBannerBtn');
        
        if (!installBanner || !installBtn || !closeBannerBtn) return;
        
        // Скрываем баннер если уже установлено
        if (this.isInstalled || this.isStandalone) {
            installBanner.style.display = 'none';
            return;
        }
        
        // Автоматически показываем баннер на мобильных устройствах через 3 секунды
        if (this.isMobileDevice()) {
            setTimeout(() => {
                if (!this.isInstalled && !this.isStandalone) {
                    installBanner.style.display = 'flex';
                    installBanner.classList.add('show');
                    
                    // Автоматически скрываем через 10 секунд
                    setTimeout(() => {
                        if (installBanner.style.display === 'flex') {
                            installBanner.classList.remove('show');
                            setTimeout(() => {
                                installBanner.style.display = 'none';
                            }, 300);
                        }
                    }, 10000);
                }
            }, 3000);
        }
        
        // Обработчик события beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Показываем баннер установки
            installBanner.style.display = 'flex';
            installBanner.classList.add('show');
            
            // Обработчик кнопки установки
            installBtn.addEventListener('click', async () => {
                if (this.deferredPrompt) {
                    this.deferredPrompt.prompt();
                    const { outcome } = await this.deferredPrompt.userChoice;
                    
                    if (outcome === 'accepted') {
                        console.log('XPchat PWA: Приложение установлено');
                        this.isInstalled = true;
                        installBanner.classList.remove('show');
                        setTimeout(() => {
                            installBanner.style.display = 'none';
                        }, 300);
                    }
                    
                    this.deferredPrompt = null;
                }
            });
        });
        
        // Обработчик закрытия баннера
        closeBannerBtn.addEventListener('click', () => {
            installBanner.classList.remove('show');
            setTimeout(() => {
                installBanner.style.display = 'none';
            }, 300);
        });
        
        // Скрываем баннер при успешной установке
        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            installBanner.classList.remove('show');
            setTimeout(() => {
                installBanner.style.display = 'none';
            }, 300);
            console.log('XPchat PWA: Приложение установлено через событие appinstalled');
        });
    }

    // Настройка мобильной навигации
    setupMobileNavigation() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        const closeMenuBtn = document.getElementById('closeMenuBtn');
        const sidebar = document.getElementById('sidebar');
        const chatArea = document.querySelector('.chat-area');
        const backBtn = document.getElementById('backBtn');
        
        if (!mobileMenuBtn || !mobileMenu || !closeMenuBtn || !sidebar || !chatArea) return;
        
        // Открытие мобильного меню
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('show');
            document.body.style.overflow = 'hidden'; // Блокируем прокрутку
        });
        
        // Закрытие мобильного меню
        closeMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('show');
            document.body.style.overflow = ''; // Восстанавливаем прокрутку
        });
        
        // Закрытие по клику вне меню
        mobileMenu.addEventListener('click', (e) => {
            if (e.target === mobileMenu) {
                mobileMenu.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
        
        // Показать/скрыть боковую панель
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('show');
            chatArea.classList.remove('show');
        });
        
        // Кнопка назад
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                sidebar.classList.remove('show');
                chatArea.classList.add('show');
            });
        }
        
        // Touch-жесты для мобильных устройств
        this.setupTouchGestures();
        
        // Автоматическое скрытие меню при изменении размера экрана
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('show');
                chatArea.classList.remove('show');
                mobileMenu.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    }

    // Настройка touch-жестов
    setupTouchGestures() {
        const sidebar = document.getElementById('sidebar');
        const chatArea = document.querySelector('.chat-area');
        
        if (!sidebar || !chatArea) return;
        
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;
        let startTime = 0;
        
        // Touch start
        const handleTouchStart = (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
            isDragging = true;
            
            // Добавляем класс для плавности
            sidebar.style.transition = 'none';
            chatArea.style.transition = 'none';
        };
        
        // Touch move
        const handleTouchMove = (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
            
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            
            // Определяем направление свайпа
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Горизонтальный свайп
                if (deltaX > 0) {
                    // Свайп вправо - показать боковую панель
                    const translateX = Math.min(deltaX, sidebar.offsetWidth);
                    sidebar.style.transform = `translateX(${translateX - sidebar.offsetWidth}px)`;
                    chatArea.style.transform = `translateX(${translateX}px)`;
                } else {
                    // Свайп влево - скрыть боковую панель
                    const translateX = Math.max(deltaX, -sidebar.offsetWidth);
                    sidebar.style.transform = `translateX(${translateX}px)`;
                    chatArea.style.transform = `translateX(${translateX + sidebar.offsetWidth}px)`;
                }
            }
        };
        
        // Touch end
        const handleTouchEnd = () => {
            if (!isDragging) return;
            
            isDragging = false;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            const deltaTime = Date.now() - startTime;
            
            // Восстанавливаем плавность
            sidebar.style.transition = '';
            chatArea.style.transition = '';
            
            // Определяем действие на основе свайпа
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    // Свайп вправо - показать боковую панель
                    sidebar.classList.add('show');
                    chatArea.classList.remove('show');
                } else {
                    // Свайп влево - скрыть боковую панель
                    sidebar.classList.remove('show');
                    chatArea.classList.add('show');
                }
            } else {
                // Возвращаем в исходное положение
                sidebar.style.transform = '';
                chatArea.style.transform = '';
            }
        };
        
        // Добавляем обработчики touch событий
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Двойной тап для быстрого переключения
        let lastTap = 0;
        const handleDoubleTap = (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                // Двойной тап - переключить панели
                if (sidebar.classList.contains('show')) {
                    sidebar.classList.remove('show');
                    chatArea.classList.add('show');
                } else {
                    sidebar.classList.add('show');
                    chatArea.classList.remove('show');
                }
                e.preventDefault();
            }
            lastTap = currentTime;
        };
        
        document.addEventListener('touchend', handleDoubleTap);
        
        // Жесты для мобильного меню
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) {
            let menuStartY = 0;
            let menuCurrentY = 0;
            
            mobileMenu.addEventListener('touchstart', (e) => {
                menuStartY = e.touches[0].clientY;
            });
            
            mobileMenu.addEventListener('touchmove', (e) => {
                menuCurrentY = e.touches[0].clientY;
                const deltaY = menuCurrentY - menuStartY;
                
                if (deltaY > 0) {
                    // Свайп вниз - закрыть меню
                    mobileMenu.style.transform = `translateY(${deltaY}px)`;
                    mobileMenu.style.opacity = Math.max(0, 1 - deltaY / 200);
                }
            });
            
            mobileMenu.addEventListener('touchend', () => {
                const deltaY = menuCurrentY - menuStartY;
                
                if (deltaY > 100) {
                    // Закрыть меню
                    mobileMenu.classList.remove('show');
                    document.body.style.overflow = '';
                } else {
                    // Вернуть в исходное положение
                    mobileMenu.style.transform = '';
                    mobileMenu.style.opacity = '';
                }
            });
        }
    }

    // Настройка обработчиков меню
    setupMenuHandlers() {
        const menuItems = {
            'menuProfile': () => this.showProfile(),
            'menuSettings': () => this.showSettings(),
            'menuHelp': () => this.showHelp(),
            'menuAbout': () => this.showAbout(),
            'menuInstall': () => this.showInstallInstructions()
        };
        
        Object.entries(menuItems).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    handler();
                });
            }
        });
    }

    // Настройка офлайн детекции
    setupOfflineDetection() {
        // Индикатор офлайн статуса
        const onlineStatus = document.getElementById('onlineStatus');
        if (onlineStatus) {
            const updateOnlineStatus = () => {
                if (navigator.onLine) {
                    onlineStatus.innerHTML = '🟢 Онлайн';
                    onlineStatus.className = 'online-status online';
                    this.showOnlineNotification();
                } else {
                    onlineStatus.innerHTML = '🔴 Офлайн';
                    onlineStatus.className = 'online-status offline';
                    this.showOfflineNotification();
                }
            };

            // Обновляем статус при изменении соединения
            window.addEventListener('online', updateOnlineStatus);
            window.addEventListener('offline', updateOnlineStatus);
            
            // Устанавливаем начальный статус
            updateOnlineStatus();
        }

        // Периодическая проверка соединения
        setInterval(() => {
            this.checkConnection();
        }, 30000); // Проверяем каждые 30 секунд
    }

    // Проверка соединения с сервером
    async checkConnection() {
        try {
            const response = await fetch('/api/status', { 
                method: 'HEAD',
                cache: 'no-cache',
                timeout: 5000
            });
            
            if (response.ok) {
                this.updateConnectionStatus(true);
            } else {
                this.updateConnectionStatus(false);
            }
        } catch (error) {
            this.updateConnectionStatus(false);
        }
    }

    // Обновление статуса соединения
    updateConnectionStatus(isOnline) {
        const onlineStatus = document.getElementById('onlineStatus');
        if (onlineStatus) {
            if (isOnline) {
                onlineStatus.innerHTML = '🟢 Онлайн';
                onlineStatus.className = 'online-status online';
            } else {
                onlineStatus.innerHTML = '🟡 Проверка...';
                onlineStatus.className = 'online-status checking';
            }
        }
    }

    // Уведомление о восстановлении соединения
    showOnlineNotification() {
        this.showNotification('🌐 Интернет восстановлен!', 'XPchat снова работает в онлайн режиме', 'success');
        
        // Автоматическая синхронизация данных
        this.syncOfflineData();
    }

    // Уведомление об офлайн режиме
    showOfflineNotification() {
        this.showNotification('📱 Офлайн режим', 'XPchat работает без интернета. Данные сохраняются локально.', 'info');
    }

    // Синхронизация офлайн данных
    async syncOfflineData() {
        try {
            // Получаем сохраненные сообщения из localStorage
            const offlineMessages = this.getOfflineMessages();
            
            if (offlineMessages.length > 0) {
                this.showNotification('🔄 Синхронизация...', `Отправляем ${offlineMessages.length} сообщений`, 'info');
                
                // Здесь можно добавить логику отправки сообщений на сервер
                // await this.sendOfflineMessages(offlineMessages);
                
                // Очищаем офлайн сообщения
                this.clearOfflineMessages();
                
                this.showNotification('✅ Синхронизация завершена', 'Все данные успешно синхронизированы', 'success');
            }
        } catch (error) {
            console.error('XPchat PWA: Ошибка синхронизации:', error);
            this.showNotification('❌ Ошибка синхронизации', 'Попробуйте позже', 'error');
        }
    }

    // Получение офлайн сообщений
    getOfflineMessages() {
        try {
            const offlineData = localStorage.getItem('xpchat_offline_messages');
            return offlineData ? JSON.parse(offlineData) : [];
        } catch (error) {
            console.error('XPchat PWA: Ошибка получения офлайн сообщений:', error);
            return [];
        }
    }

    // Очистка офлайн сообщений
    clearOfflineMessages() {
        try {
            localStorage.removeItem('xpchat_offline_messages');
        } catch (error) {
            console.error('XPchat PWA: Ошибка очистки офлайн сообщений:', error);
        }
    }

    // Настройка push уведомлений
    async setupPushNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            if (Notification.permission === 'default') {
                // Запрашиваем разрешение при первом посещении
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    this.subscribeToPushNotifications();
                }
            } else if (Notification.permission === 'granted') {
                this.subscribeToPushNotifications();
            }
        }
    }

    // Подписка на push уведомления
    async subscribeToPushNotifications() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
            });
            
            console.log('XPchat PWA: Подписка на push уведомления:', subscription);
            
            // Отправляем подписку на сервер
            this.sendSubscriptionToServer(subscription);
            
        } catch (error) {
            console.error('XPchat PWA: Ошибка подписки на push уведомления:', error);
        }
    }

    // Отправка подписки на сервер
    async sendSubscriptionToServer(subscription) {
        try {
            await fetch('/api/push-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription)
            });
        } catch (error) {
            console.error('XPchat PWA: Ошибка отправки подписки на сервер:', error);
        }
    }

    // Конвертация VAPID ключа
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Обработка сообщений от Service Worker
    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'UPDATE_AVAILABLE':
                this.showUpdateNotification();
                break;
            case 'PUSH_NOTIFICATION':
                this.showPushNotification(data.title, data.body);
                break;
            default:
                console.log('XPchat PWA: Неизвестное сообщение от Service Worker:', data);
        }
    }

    // Показ уведомления об обновлении
    showUpdateNotification() {
        if (confirm('Доступна новая версия XPchat. Обновить сейчас?')) {
            window.location.reload();
        }
    }

    // Показ push уведомления
    showPushNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png'
            });
        }
    }

    // Проверка standalone режима
    checkStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    // Методы меню
    showProfile() {
        this.showNotification('Профиль', 'Функция в разработке');
    }

    showSettings() {
        this.showNotification('Настройки', 'Функция в разработке');
    }

    showHelp() {
        this.showNotification('Помощь', 'Функция в разработке');
    }

    showAbout() {
        this.showNotification('О приложении', 'XPchat v1.0.0 - Мобильный мессенджер');
    }

    showInstallInstructions() {
        const instructions = `
            Для установки XPchat как приложения:
            
            Android (Chrome):
            • Нажмите меню (⋮)
            • Выберите "Установить приложение"
            
            iOS (Safari):
            • Нажмите кнопку "Поделиться" (□↑)
            • Выберите "На экран «Домой»"
        `;
        
        alert(instructions);
    }

    // Проверка мобильного устройства
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (window.innerWidth <= 768);
    }

    // Показ уведомлений
    showNotification(title, message, type = 'info') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `pwa-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">✕</button>
        `;

        // Добавляем стили для уведомления
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#667eea'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;

        // Добавляем в DOM
        document.body.appendChild(notification);

        // Показываем уведомление
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }
}

// Инициализация PWA при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new XPchatPWA();
});

// Обработка событий жизненного цикла приложения
window.addEventListener('load', () => {
    // Регистрируем события жизненного цикла
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
            // Фоновая синхронизация
            if ('sync' in registration) {
                registration.sync.register('background-sync');
            }
        });
    }
});

// Обработка видимости страницы
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('XPchat PWA: Приложение скрыто');
    } else {
        console.log('XPchat PWA: Приложение активно');
    }
});

console.log('XPchat PWA: Модуль загружен');
