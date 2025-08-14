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
        const backBtn = document.getElementById('backBtn');
        const sidebar = document.getElementById('sidebar');
        
        if (!mobileMenuBtn || !mobileMenu || !closeMenuBtn) return;
        
        // Открытие мобильного меню
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('show');
        });
        
        // Закрытие мобильного меню
        closeMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('show');
        });
        
        // Кнопка "Назад" для мобильных устройств
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.add('show');
                }
            });
        }
        
        // Обработчики пунктов меню
        this.setupMenuHandlers();
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

    // Настройка жестов
    setupTouchGestures() {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        
        // Свайп влево для открытия чата
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', () => {
            const diffX = startX - currentX;
            const diffY = startY - currentY;
            
            // Свайп влево (открыть чат)
            if (diffX > 50 && Math.abs(diffY) < 50) {
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) {
                        sidebar.classList.remove('show');
                    }
                }
            }
            
            // Свайп вправо (открыть контакты)
            if (diffX < -50 && Math.abs(diffY) < 50) {
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) {
                        sidebar.classList.add('show');
                    }
                }
            }
        });
    }

    // Настройка определения офлайн режима
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            console.log('XPchat PWA: Соединение восстановлено');
            this.showNotification('Соединение восстановлено', 'Интернет снова доступен');
            this.updateOnlineStatus(true);
        });
        
        window.addEventListener('offline', () => {
            console.log('XPchat PWA: Соединение потеряно');
            this.showNotification('Соединение потеряно', 'Работаем в офлайн режиме');
            this.updateOnlineStatus(false);
        });
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

    // Обновление статуса онлайн
    updateOnlineStatus(isOnline) {
        const statusElement = document.getElementById('onlineStatus');
        if (statusElement) {
            statusElement.textContent = isOnline ? '🟢 Онлайн' : '🔴 Офлайн';
            statusElement.className = isOnline ? 'online' : 'offline';
        }
    }

    // Показ уведомления
    showNotification(title, message) {
        // Создаем простое уведомление
        const notification = document.createElement('div');
        notification.className = 'pwa-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Показываем и скрываем
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
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
