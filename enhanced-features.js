// XPchat Pro - Улучшенные функции
class XPchatEnhanced {
    constructor() {
        this.theme = localStorage.getItem('xpchat_theme') || 'auto';
        this.fontSize = localStorage.getItem('xpchat_font_size') || 'medium';
        this.soundEnabled = localStorage.getItem('xpchat_sound') !== 'false';
        this.pushEnabled = localStorage.getItem('xpchat_push') === 'true';
        
        this.emojiData = this.initializeEmojiData();
        this.currentEmojiCategory = 'recent';
        this.recentEmojis = JSON.parse(localStorage.getItem('xpchat_recent_emojis') || '[]');
        
        this.init();
    }

    init() {
        this.setupTheme();
        this.setupFontSize();
        this.setupEmojiPanel();
        this.setupEnhancedFeatures();
        this.setupKeyboardShortcuts();
        this.setupPerformanceOptimizations();
        this.setupAnalytics();
    }

    // Настройка темы
    setupTheme() {
        const themeToggle = document.getElementById('themeToggleBtn');
        const themeSelect = document.getElementById('themeSelect');
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        if (themeSelect) {
            themeSelect.value = this.theme;
            themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }
        
        this.applyTheme();
    }

    setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('xpchat_theme', theme);
        this.applyTheme();
        
        // Обновляем иконку кнопки
        const themeToggle = document.getElementById('themeToggleBtn');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
        
        this.showNotification('Тема изменена', `Переключена на ${theme === 'auto' ? 'автоматическую' : theme === 'dark' ? 'темную' : 'светлую'} тему`, 'success');
    }

    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    applyTheme() {
        let finalTheme = this.theme;
        
        if (this.theme === 'auto') {
            finalTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', finalTheme);
        
        // Обновляем мета-теги для PWA
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = finalTheme === 'dark' ? '#1a1a1a' : '#667eea';
        }
    }

    // Настройка размера шрифта
    setupFontSize() {
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        
        if (fontSizeSelect) {
            fontSizeSelect.value = this.fontSize;
            fontSizeSelect.addEventListener('change', (e) => {
                this.setFontSize(e.target.value);
            });
        }
        
        this.applyFontSize();
    }

    setFontSize(size) {
        this.fontSize = size;
        localStorage.setItem('xpchat_font_size', size);
        this.applyFontSize();
        
        this.showNotification('Размер шрифта изменен', `Установлен ${size === 'small' ? 'маленький' : size === 'large' ? 'большой' : 'средний'} размер`, 'success');
    }

    applyFontSize() {
        const sizes = {
            small: '14px',
            medium: '16px',
            large: '18px'
        };
        
        document.documentElement.style.fontSize = sizes[this.fontSize];
    }

    // Настройка панели эмодзи
    setupEmojiPanel() {
        const emojiBtn = document.getElementById('emojiBtn');
        const emojiPanel = document.getElementById('emojiPanel');
        const emojiGrid = document.getElementById('emojiGrid');
        
        if (emojiBtn && emojiPanel) {
            emojiBtn.addEventListener('click', () => {
                this.toggleEmojiPanel();
            });
            
            // Закрытие панели при клике вне её
            document.addEventListener('click', (e) => {
                if (!emojiPanel.contains(e.target) && !emojiBtn.contains(e.target)) {
                    this.hideEmojiPanel();
                }
            });
        }
        
        // Настройка категорий эмодзи
        this.setupEmojiCategories();
        
        // Заполнение сетки эмодзи
        this.populateEmojiGrid();
    }

    setupEmojiCategories() {
        const categoryButtons = document.querySelectorAll('.emoji-category');
        
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.switchEmojiCategory(category);
            });
        });
    }

    switchEmojiCategory(category) {
        this.currentEmojiCategory = category;
        
        // Обновляем активную категорию
        document.querySelectorAll('.emoji-category').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            }
        });
        
        this.populateEmojiGrid();
    }

    populateEmojiGrid() {
        const emojiGrid = document.getElementById('emojiGrid');
        if (!emojiGrid) return;
        
        emojiGrid.innerHTML = '';
        
        let emojis = [];
        
        if (this.currentEmojiCategory === 'recent') {
            emojis = this.recentEmojis.length > 0 ? this.recentEmojis : this.emojiData.smileys.slice(0, 32);
        } else {
            emojis = this.emojiData[this.currentEmojiCategory] || [];
        }
        
        emojis.forEach(emoji => {
            const emojiBtn = document.createElement('button');
            emojiBtn.className = 'emoji-item';
            emojiBtn.textContent = emoji;
            emojiBtn.addEventListener('click', () => {
                this.insertEmoji(emoji);
            });
            emojiGrid.appendChild(emojiBtn);
        });
    }

    insertEmoji(emoji) {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            const cursorPos = messageInput.selectionStart;
            const textBefore = messageInput.value.substring(0, cursorPos);
            const textAfter = messageInput.value.substring(cursorPos);
            
            messageInput.value = textBefore + emoji + textAfter;
            messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
            messageInput.focus();
            
            // Добавляем в недавние
            this.addToRecentEmojis(emoji);
        }
        
        this.hideEmojiPanel();
    }

    addToRecentEmojis(emoji) {
        if (!this.recentEmojis.includes(emoji)) {
            this.recentEmojis.unshift(emoji);
            this.recentEmojis = this.recentEmojis.slice(0, 20); // Максимум 20
            localStorage.setItem('xpchat_recent_emojis', JSON.stringify(this.recentEmojis));
        }
    }

    toggleEmojiPanel() {
        const emojiPanel = document.getElementById('emojiPanel');
        if (emojiPanel) {
            if (emojiPanel.style.display === 'none') {
                this.showEmojiPanel();
            } else {
                this.hideEmojiPanel();
            }
        }
    }

    showEmojiPanel() {
        const emojiPanel = document.getElementById('emojiPanel');
        if (emojiPanel) {
            emojiPanel.style.display = 'block';
            emojiPanel.classList.add('show');
        }
    }

    hideEmojiPanel() {
        const emojiPanel = document.getElementById('emojiPanel');
        if (emojiPanel) {
            emojiPanel.classList.remove('show');
            setTimeout(() => {
                emojiPanel.style.display = 'none';
            }, 300);
        }
    }

    // Инициализация данных эмодзи
    initializeEmojiData() {
        return {
            recent: [],
            smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒'],
            animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜'],
            food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳'],
            activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️'],
            travel: ['✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️'],
            objects: ['💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🦯', '🦽', '🦼', '🩼', '🩻', '🩺', '🩹', '🩺', '🩻', '🩼', '🦽', '🦼', '🦯', '🪜', '⚖️', '💎'],
            symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉']
        };
    }

    // Настройка улучшенных функций
    setupEnhancedFeatures() {
        this.setupSearchEnhancements();
        this.setupFileUpload();
        this.setupVoiceMessages();
        this.setupMessageReactions();
        this.setupTypingIndicators();
        this.setupCallIntegration();
    }

    // Улучшенный поиск
    setupSearchEnhancements() {
        const searchInput = document.getElementById('searchInput');
        const searchClearBtn = document.getElementById('searchClearBtn');
        
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                
                // Показываем/скрываем кнопку очистки
                if (searchClearBtn) {
                    searchClearBtn.style.display = query ? 'block' : 'none';
                }
                
                // Дебаунсинг поиска
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch(query);
                }, 300);
            });
            
            // Очистка поиска
            if (searchClearBtn) {
                searchClearBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    searchInput.focus();
                    this.clearSearch();
                });
            }
        }
    }

    performSearch(query) {
        if (!query) {
            this.clearSearch();
            return;
        }
        
        // Поиск по контактам и сообщениям
        const contacts = document.querySelectorAll('.contact-item');
        let foundCount = 0;
        
        contacts.forEach(contact => {
            const name = contact.querySelector('.contact-name')?.textContent || '';
            const message = contact.querySelector('.contact-last-message')?.textContent || '';
            
            if (name.toLowerCase().includes(query.toLowerCase()) || 
                message.toLowerCase().includes(query.toLowerCase())) {
                contact.style.display = 'flex';
                contact.style.background = 'rgba(102, 126, 234, 0.1)';
                foundCount++;
            } else {
                contact.style.display = 'none';
            }
        });
        
        // Показываем результат поиска
        if (foundCount > 0) {
            this.showNotification('Поиск завершен', `Найдено ${foundCount} результатов`, 'success');
        } else {
            this.showNotification('Поиск завершен', 'Ничего не найдено', 'warning');
        }
    }

    clearSearch() {
        const contacts = document.querySelectorAll('.contact-item');
        contacts.forEach(contact => {
            contact.style.display = 'flex';
            contact.style.background = '';
        });
        
        if (document.getElementById('searchClearBtn')) {
            document.getElementById('searchClearBtn').style.display = 'none';
        }
    }

    // Загрузка файлов
    setupFileUpload() {
        const attachBtn = document.getElementById('attachBtn');
        
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                this.openFileSelector();
            });
        }
    }

    openFileSelector() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt';
        
        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                this.handleFileUpload(file);
            });
        });
        
        input.click();
    }

    handleFileUpload(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (file.size > maxSize) {
            this.showNotification('Ошибка загрузки', 'Файл слишком большой (максимум 10MB)', 'error');
            return;
        }
        
        // Создаем предварительный просмотр
        const preview = this.createFilePreview(file);
        
        // Добавляем в чат
        this.addFileToChat(file, preview);
        
        this.showNotification('Файл загружен', `${file.name} успешно добавлен`, 'success');
    }

    createFilePreview(file) {
        if (file.type.startsWith('image/')) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }
        return null;
    }

    addFileToChat(file, preview) {
        // Здесь будет логика добавления файла в чат
        console.log('Файл добавлен в чат:', file.name);
    }

    // Голосовые сообщения
    setupVoiceMessages() {
        // Добавляем кнопку голосового сообщения
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.shiftKey) {
                    e.preventDefault();
                    this.startVoiceRecording();
                }
            });
        }
    }

    startVoiceRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showNotification('Ошибка', 'Голосовые сообщения не поддерживаются', 'error');
            return;
        }
        
        this.showNotification('Запись', 'Начинаем запись голосового сообщения...', 'info');
        
        // Здесь будет логика записи голоса
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                console.log('Запись начата');
                // Логика записи
            })
            .catch(error => {
                this.showNotification('Ошибка', 'Не удалось получить доступ к микрофону', 'error');
            });
    }

    // Реакции на сообщения
    setupMessageReactions() {
        // Добавляем поддержку реакций
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('message-reaction')) {
                this.handleReaction(e.target);
            }
        });
    }

    handleReaction(reactionElement) {
        const reaction = reactionElement.textContent;
        const messageId = reactionElement.closest('.message-item')?.dataset.messageId;
        
        if (messageId) {
            this.addReactionToMessage(messageId, reaction);
        }
    }

    addReactionToMessage(messageId, reaction) {
        // Здесь будет логика добавления реакции
        console.log(`Реакция ${reaction} добавлена к сообщению ${messageId}`);
    }

    // Индикаторы печати
    setupTypingIndicators() {
        const messageInput = document.getElementById('messageInput');
        
        if (messageInput) {
            let typingTimeout;
            
            messageInput.addEventListener('input', () => {
                this.sendTypingIndicator(true);
                
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    this.sendTypingIndicator(false);
                }, 1000);
            });
        }
    }

    sendTypingIndicator(isTyping) {
        // Отправляем индикатор печати через WebSocket
        if (window.xpchat && window.xpchat.websocket) {
            window.xpchat.websocket.send(JSON.stringify({
                type: 'typing_indicator',
                isTyping: isTyping
            }));
        }
    }

    // Горячие клавиши
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K - Поиск
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchInput')?.focus();
            }
            
            // Ctrl/Cmd + N - Новый чат
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                document.getElementById('newChatBtn')?.click();
            }
            
            // Ctrl/Cmd + T - Смена темы
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
            
            // Escape - Закрыть модальные окна
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
            }
        });
        
        this.hideEmojiPanel();
    }

    // Оптимизация производительности
    setupPerformanceOptimizations() {
        // Ленивая загрузка изображений
        this.setupLazyLoading();
        
        // Виртуализация списка сообщений
        this.setupVirtualization();
        
        // Дебаунсинг событий
        this.setupDebouncing();
    }

    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }

    setupVirtualization() {
        // Виртуализация для больших списков
        const contactsList = document.getElementById('contactsList');
        if (contactsList) {
            let visibleItems = 20;
            let currentIndex = 0;
            
            const loadMoreItems = () => {
                // Логика загрузки дополнительных элементов
            };
            
            contactsList.addEventListener('scroll', () => {
                if (contactsList.scrollTop + contactsList.clientHeight >= contactsList.scrollHeight - 100) {
                    loadMoreItems();
                }
            });
        }
    }

    setupDebouncing() {
        // Дебаунсинг для частых событий
        this.debounce = (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        };
    }

    // Аналитика и мониторинг
    setupAnalytics() {
        // Отслеживание событий
        this.trackEvent('app_loaded', {
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            screenSize: `${screen.width}x${screen.height}`,
            theme: this.theme,
            fontSize: this.fontSize
        });
        
        // Отслеживание производительности
        this.trackPerformance();
        
        // Отслеживание ошибок
        this.setupErrorTracking();
    }

    trackEvent(eventName, data = {}) {
        // Отправка данных аналитики
        console.log('Analytics Event:', eventName, data);
        
        // Здесь можно интегрировать с Google Analytics, Mixpanel и т.д.
        if (window.gtag) {
            window.gtag('event', eventName, data);
        }
    }

    trackPerformance() {
        // Отслеживание метрик производительности
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData) {
                        this.trackEvent('page_performance', {
                            loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
                        });
                    }
                }, 0);
            });
        }
    }

    setupErrorTracking() {
        window.addEventListener('error', (e) => {
            this.trackEvent('error', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                error: e.error?.stack
            });
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.trackEvent('unhandled_promise_rejection', {
                reason: e.reason
            });
        });
    }

    // Система уведомлений
    showNotification(title, message, type = 'info', duration = 5000) {
        const notificationsContainer = document.getElementById('notificationsContainer');
        if (!notificationsContainer) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Обработчик закрытия
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        notificationsContainer.appendChild(notification);
        
        // Автоматическое удаление
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
        
        // Анимация появления
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });
    }

    removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // Утилиты
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Интеграция со звонками
    setupCallIntegration() {
        // Ждем инициализации модуля WebRTC
        const checkWebRTC = () => {
            if (window.webrtcCalls) {
                this.initializeCallButtons();
            } else {
                setTimeout(checkWebRTC, 100);
            }
        };
        
        checkWebRTC();
    }

    initializeCallButtons() {
        // Кнопка голосового звонка
        const voiceCallBtn = document.getElementById('voiceCallBtn');
        if (voiceCallBtn) {
            voiceCallBtn.addEventListener('click', () => {
                this.handleCallButtonClick('audio');
            });
        }

        // Кнопка видеозвонка
        const videoCallBtn = document.getElementById('videoCallBtn');
        if (videoCallBtn) {
            videoCallBtn.addEventListener('click', () => {
                this.handleCallButtonClick('video');
            });
        }

        // Добавляем кнопки звонков в список пользователей
        this.addCallButtonsToUserList();
    }

    handleCallButtonClick(callType) {
        // Получаем текущий контакт
        const currentContactName = document.getElementById('currentContactName');
        if (!currentContactName || currentContactName.textContent === 'Выберите чат') {
            this.showNotification('Ошибка', 'Сначала выберите контакт для звонка', 'warning');
            return;
        }

        // Проверяем доступность WebRTC
        if (!window.webrtcCalls) {
            this.showNotification('Ошибка', 'Модуль звонков не загружен', 'error');
            return;
        }

        // Проверяем разрешения на микрофон/камеру
        this.checkMediaPermissions(callType).then(() => {
            // Инициируем звонок (в реальном приложении здесь будет ID пользователя)
            const userId = this.getCurrentUserId();
            if (userId) {
                window.webrtcCalls.initiateCall(userId, callType);
            } else {
                this.showNotification('Ошибка', 'Не удалось определить пользователя', 'error');
            }
        }).catch(error => {
            this.showNotification('Ошибка', error.message, 'error');
        });
    }

    async checkMediaPermissions(callType) {
        try {
            let constraints = {};
            
            if (callType === 'audio') {
                constraints = { audio: true };
            } else if (callType === 'video') {
                constraints = { audio: true, video: true };
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            stream.getTracks().forEach(track => track.stop());
            
            return true;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Необходимо разрешить доступ к микрофону/камере');
            } else if (error.name === 'NotFoundError') {
                throw new Error('Микрофон или камера не найдены');
            } else {
                throw new Error('Ошибка доступа к медиаустройствам');
            }
        }
    }

    getCurrentUserId() {
        // В реальном приложении здесь будет логика получения ID текущего пользователя
        // Пока возвращаем тестовый ID
        return 'test_user_' + Date.now();
    }

    addCallButtonsToUserList() {
        // Добавляем кнопки звонков в список пользователей
        // Этот метод будет вызываться при обновлении списка пользователей
        const userList = document.querySelector('.users-list');
        if (userList) {
            const userItems = userList.querySelectorAll('.user-item');
            userItems.forEach(userItem => {
                if (!userItem.querySelector('.call-buttons')) {
                    const callButtons = document.createElement('div');
                    callButtons.className = 'call-buttons';
                    callButtons.innerHTML = `
                        <button class="call-btn" data-call-type="audio" title="Голосовой звонок">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="call-btn" data-call-type="video" title="Видеозвонок">
                            <i class="fas fa-video"></i>
                        </button>
                        <button class="call-btn" data-call-type="screen" title="Демонстрация экрана">
                            <i class="fas fa-desktop"></i>
                        </button>
                    `;
                    
                    userItem.appendChild(callButtons);
                }
            });
        }
    }

    // Экспорт для глобального использования
    static getInstance() {
        if (!XPchatEnhanced.instance) {
            XPchatEnhanced.instance = new XPchatEnhanced();
        }
        return XPchatEnhanced.instance;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Скрываем экран загрузки
    const loadingScreen = document.getElementById('loadingScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (loadingScreen && appContainer) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            appContainer.style.display = 'flex';
            
            // Инициализируем улучшенные функции
            window.xpchatEnhanced = XPchatEnhanced.getInstance();
            
            // Отслеживаем событие загрузки
            window.xpchatEnhanced.trackEvent('app_fully_loaded');
        }, 1500);
    }
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = XPchatEnhanced;
}
