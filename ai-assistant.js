// XPchat Pro - Расширенный AI Помощник
class AIAssistant {
    constructor() {
        this.providers = {
            openai: {
                name: 'OpenAI GPT',
                apiKey: localStorage.getItem('ai_openai_key') || '',
                endpoint: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000
            },
            gemini: {
                name: 'Google Gemini',
                apiKey: localStorage.getItem('ai_gemini_key') || '',
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
                model: 'gemini-pro',
                maxTokens: 1000
            },
            huggingface: {
                name: 'Hugging Face',
                apiKey: localStorage.getItem('ai_huggingface_key') || '',
                endpoint: 'https://api-inference.huggingface.co/models/',
                model: 'gpt2',
                maxTokens: 500
            },
            local: {
                name: 'Локальный AI',
                apiKey: '',
                endpoint: 'http://localhost:8000/chat',
                model: 'local-model',
                maxTokens: 1000
            }
        };
        
        this.currentProvider = localStorage.getItem('ai_current_provider') || 'openai';
        this.conversationHistory = JSON.parse(localStorage.getItem('ai_conversation_history') || '[]');
        this.maxHistoryLength = 50;
        this.isTyping = false;
        this.typingSpeed = 50; // ms per character
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadConversationHistory();
        this.updateProviderStatus();
    }
    
    setupEventListeners() {
        // Обработчики для AI интерфейса
        document.addEventListener('DOMContentLoaded', () => {
            this.setupAIInterface();
        });
    }
    
    setupAIInterface() {
        // Создаем AI интерфейс если его нет
        if (!document.getElementById('aiInterface')) {
            this.createAIInterface();
        }
        
        // Обработчики для AI кнопок
        const aiBtn = document.getElementById('aiAssistantBtn');
        if (aiBtn) {
            aiBtn.addEventListener('click', () => this.toggleAIInterface());
        }
        
        // Обработчики для настроек AI
        const providerSelect = document.getElementById('aiProviderSelect');
        if (providerSelect) {
            providerSelect.addEventListener('change', (e) => this.changeProvider(e.target.value));
        }
        
        // Обработчики для API ключей
        const saveKeysBtn = document.getElementById('saveAIKeysBtn');
        if (saveKeysBtn) {
            saveKeysBtn.addEventListener('click', () => this.saveAPIKeys());
        }
    }
    
    createAIInterface() {
        const aiInterface = document.createElement('div');
        aiInterface.id = 'aiInterface';
        aiInterface.className = 'ai-interface';
        aiInterface.innerHTML = `
            <div class="ai-header">
                <div class="ai-title">
                    <i class="fas fa-robot"></i>
                    <span>AI Помощник</span>
                </div>
                <div class="ai-actions">
                    <button class="ai-settings-btn" id="aiSettingsBtn" title="Настройки AI">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="ai-close-btn" id="aiCloseBtn" title="Закрыть">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="ai-content">
                <div class="ai-conversation" id="aiConversation">
                    <div class="ai-welcome">
                        <i class="fas fa-robot"></i>
                        <h3>Привет! Я ваш AI помощник</h3>
                        <p>Задайте мне любой вопрос или попросите о помощи</p>
                        <div class="ai-suggestions">
                            <button class="suggestion-btn" data-suggestion="Расскажи анекдот">😄 Расскажи анекдот</button>
                            <button class="suggestion-btn" data-suggestion="Помоги с программированием">💻 Помоги с программированием</button>
                            <button class="suggestion-btn" data-suggestion="Переведи текст">🌍 Переведи текст</button>
                            <button class="suggestion-btn" data-suggestion="Напиши стихотворение">✍️ Напиши стихотворение</button>
                        </div>
                    </div>
                </div>
                <div class="ai-input-container">
                    <div class="ai-input-wrapper">
                        <textarea id="aiInput" placeholder="Введите ваш вопрос..." rows="3"></textarea>
                        <button class="ai-send-btn" id="aiSendBtn" title="Отправить">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    <div class="ai-input-actions">
                        <button class="ai-voice-btn" id="aiVoiceBtn" title="Голосовой ввод">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <button class="ai-clear-btn" id="aiClearBtn" title="Очистить историю">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="ai-settings" id="aiSettings" style="display: none;">
                <div class="settings-header">
                    <h4>Настройки AI</h4>
                    <button class="close-settings-btn" id="closeAISettingsBtn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="settings-content">
                    <div class="setting-group">
                        <label for="aiProviderSelect">AI Провайдер:</label>
                        <select id="aiProviderSelect">
                            <option value="openai">OpenAI GPT</option>
                            <option value="gemini">Google Gemini</option>
                            <option value="huggingface">Hugging Face</option>
                            <option value="local">Локальный AI</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label for="openaiKey">OpenAI API Ключ:</label>
                        <input type="password" id="openaiKey" placeholder="sk-..." value="${this.providers.openai.apiKey}">
                    </div>
                    <div class="setting-group">
                        <label for="geminiKey">Gemini API Ключ:</label>
                        <input type="password" id="geminiKey" placeholder="AIza..." value="${this.providers.gemini.apiKey}">
                    </div>
                    <div class="setting-group">
                        <label for="huggingfaceKey">Hugging Face API Ключ:</label>
                        <input type="password" id="huggingfaceKey" placeholder="hf_..." value="${this.providers.huggingface.apiKey}">
                    </div>
                    <div class="setting-group">
                        <label for="aiModel">Модель:</label>
                        <select id="aiModel">
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            <option value="gpt-4">GPT-4</option>
                            <option value="gemini-pro">Gemini Pro</option>
                            <option value="custom">Пользовательская</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label for="maxTokens">Макс. токенов:</label>
                        <input type="number" id="maxTokens" min="100" max="4000" value="1000">
                    </div>
                    <div class="setting-group">
                        <label for="temperature">Температура:</label>
                        <input type="range" id="temperature" min="0" max="2" step="0.1" value="0.7">
                        <span id="temperatureValue">0.7</span>
                    </div>
                    <button class="save-keys-btn" id="saveAIKeysBtn">Сохранить настройки</button>
                </div>
            </div>
        `;
        
        // Добавляем интерфейс в DOM
        const chatArea = document.querySelector('.chat-area');
        if (chatArea) {
            chatArea.appendChild(aiInterface);
        }
        
        // Добавляем обработчики событий
        this.addAIEventListeners();
    }
    
    addAIEventListeners() {
        // Кнопка отправки
        const sendBtn = document.getElementById('aiSendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        // Enter для отправки
        const aiInput = document.getElementById('aiInput');
        if (aiInput) {
            aiInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        // Кнопка голосового ввода
        const voiceBtn = document.getElementById('aiVoiceBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => this.startVoiceInput());
        }
        
        // Кнопка очистки истории
        const clearBtn = document.getElementById('aiClearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearConversationHistory());
        }
        
        // Кнопка настроек
        const settingsBtn = document.getElementById('aiSettingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.toggleAISettings());
        }
        
        // Кнопка закрытия настроек
        const closeSettingsBtn = document.getElementById('closeAISettingsBtn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => this.toggleAISettings());
        }
        
        // Кнопка закрытия AI интерфейса
        const closeBtn = document.getElementById('aiCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.toggleAIInterface());
        }
        
        // Предложения
        const suggestionBtns = document.querySelectorAll('.suggestion-btn');
        suggestionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const suggestion = e.target.dataset.suggestion;
                this.handleSuggestion(suggestion);
            });
        });
        
        // Температура
        const temperatureSlider = document.getElementById('temperature');
        const temperatureValue = document.getElementById('temperatureValue');
        if (temperatureSlider && temperatureValue) {
            temperatureSlider.addEventListener('input', (e) => {
                temperatureValue.textContent = e.target.value;
            });
        }
    }
    
    async sendMessage() {
        const input = document.getElementById('aiInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Добавляем сообщение пользователя
        this.addMessageToConversation('user', message);
        input.value = '';
        
        // Показываем индикатор печати
        this.showTypingIndicator();
        
        try {
            // Отправляем запрос к AI
            const response = await this.getAIResponse(message);
            
            // Скрываем индикатор печати
            this.hideTypingIndicator();
            
            // Добавляем ответ AI
            this.addMessageToConversation('assistant', response);
            
            // Сохраняем в историю
            this.saveConversationHistory();
            
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessageToConversation('error', `Ошибка: ${error.message}`);
        }
    }
    
    async getAIResponse(message) {
        const provider = this.providers[this.currentProvider];
        
        if (!provider.apiKey && this.currentProvider !== 'local') {
            throw new Error(`API ключ для ${provider.name} не настроен`);
        }
        
        switch (this.currentProvider) {
            case 'openai':
                return await this.callOpenAI(message, provider);
            case 'gemini':
                return await this.callGemini(message, provider);
            case 'huggingface':
                return await this.callHuggingFace(message, provider);
            case 'local':
                return await this.callLocalAI(message, provider);
            default:
                throw new Error('Неизвестный провайдер AI');
        }
    }
    
    async callOpenAI(message, provider) {
        const response = await fetch(provider.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`
            },
            body: JSON.stringify({
                model: provider.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Ты полезный AI помощник. Отвечай кратко и по делу.'
                    },
                    ...this.conversationHistory.map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'assistant',
                        content: msg.content
                    })),
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: provider.maxTokens,
                temperature: parseFloat(document.getElementById('temperature')?.value || 0.7)
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI API ошибка: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
    
    async callGemini(message, provider) {
        const response = await fetch(`${provider.endpoint}?key=${provider.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `Ты полезный AI помощник. Отвечай кратко и по делу.\n\nИстория разговора:\n${this.conversationHistory.map(msg => `${msg.role === 'user' ? 'Пользователь' : 'AI'}: ${msg.content}`).join('\n')}\n\nВопрос: ${message}`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: provider.maxTokens,
                    temperature: parseFloat(document.getElementById('temperature')?.value || 0.7)
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Gemini API ошибка: ${response.status}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
    
    async callHuggingFace(message, provider) {
        const response = await fetch(`${provider.endpoint}${provider.model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${provider.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: message,
                parameters: {
                    max_length: provider.maxTokens,
                    temperature: parseFloat(document.getElementById('temperature')?.value || 0.7)
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Hugging Face API ошибка: ${response.status}`);
        }
        
        const data = await response.json();
        return data[0].generated_text;
    }
    
    async callLocalAI(message, provider) {
        const response = await fetch(provider.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                history: this.conversationHistory,
                max_tokens: provider.maxTokens,
                temperature: parseFloat(document.getElementById('temperature')?.value || 0.7)
            })
        });
        
        if (!response.ok) {
            throw new Error(`Локальный AI ошибка: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response;
    }
    
    addMessageToConversation(role, content) {
        const conversation = document.getElementById('aiConversation');
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-message-${role}`;
        
        const timestamp = new Date().toLocaleTimeString();
        
        messageDiv.innerHTML = `
            <div class="ai-message-header">
                <span class="ai-message-role">
                    ${role === 'user' ? '<i class="fas fa-user"></i> Вы' : 
                      role === 'assistant' ? '<i class="fas fa-robot"></i> AI' : 
                      '<i class="fas fa-exclamation-triangle"></i> Ошибка'}
                </span>
                <span class="ai-message-time">${timestamp}</span>
            </div>
            <div class="ai-message-content">${this.formatMessage(content)}</div>
        `;
        
        // Убираем приветственное сообщение
        const welcome = conversation.querySelector('.ai-welcome');
        if (welcome) {
            welcome.remove();
        }
        
        conversation.appendChild(messageDiv);
        conversation.scrollTop = conversation.scrollHeight;
        
        // Добавляем в историю
        this.conversationHistory.push({
            role,
            content,
            timestamp: new Date().toISOString()
        });
        
        // Ограничиваем длину истории
        if (this.conversationHistory.length > this.maxHistoryLength) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
        }
    }
    
    formatMessage(content) {
        // Форматируем код
        content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang || 'text'}">${code}</code></pre>`;
        });
        
        // Форматируем inline код
        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Форматируем ссылки
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        
        // Форматируем переносы строк
        content = content.replace(/\n/g, '<br>');
        
        return content;
    }
    
    showTypingIndicator() {
        this.isTyping = true;
        const conversation = document.getElementById('aiConversation');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message ai-message-assistant ai-typing';
        typingDiv.id = 'aiTypingIndicator';
        
        typingDiv.innerHTML = `
            <div class="ai-message-header">
                <span class="ai-message-role">
                    <i class="fas fa-robot"></i> AI
                </span>
                <span class="ai-message-time">Сейчас</span>
            </div>
            <div class="ai-message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        conversation.appendChild(typingDiv);
        conversation.scrollTop = conversation.scrollHeight;
    }
    
    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('aiTypingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    handleSuggestion(suggestion) {
        const input = document.getElementById('aiInput');
        input.value = suggestion;
        input.focus();
    }
    
    startVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.addMessageToConversation('error', 'Голосовой ввод не поддерживается в вашем браузере');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'ru-RU';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => {
            const voiceBtn = document.getElementById('aiVoiceBtn');
            voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
            voiceBtn.classList.add('recording');
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const input = document.getElementById('aiInput');
            input.value = transcript;
        };
        
        recognition.onend = () => {
            const voiceBtn = document.getElementById('aiVoiceBtn');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            voiceBtn.classList.remove('recording');
        };
        
        recognition.onerror = (event) => {
            this.addMessageToConversation('error', `Ошибка голосового ввода: ${event.error}`);
        };
        
        recognition.start();
    }
    
    clearConversationHistory() {
        if (confirm('Вы уверены, что хотите очистить историю разговора?')) {
            this.conversationHistory = [];
            const conversation = document.getElementById('aiConversation');
            conversation.innerHTML = `
                <div class="ai-welcome">
                    <i class="fas fa-robot"></i>
                    <h3>Привет! Я ваш AI помощник</h3>
                    <p>Задайте мне любой вопрос или попросите о помощи</p>
                    <div class="ai-suggestions">
                        <button class="suggestion-btn" data-suggestion="Расскажи анекдот">😄 Расскажи анекдот</button>
                        <button class="suggestion-btn" data-suggestion="Помоги с программированием">💻 Помоги с программированием</button>
                        <button class="suggestion-btn" data-suggestion="Переведи текст">🌍 Переведи текст</button>
                        <button class="suggestion-btn" data-suggestion="Напиши стихотворение">✍️ Напиши стихотворение</button>
                    </div>
                </div>
            `;
            
            // Передобавляем обработчики для предложений
            this.addAIEventListeners();
            
            localStorage.removeItem('ai_conversation_history');
        }
    }
    
    toggleAIInterface() {
        const aiInterface = document.getElementById('aiInterface');
        if (aiInterface) {
            const isVisible = aiInterface.style.display !== 'none';
            aiInterface.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                // Фокусируемся на поле ввода
                const input = document.getElementById('aiInput');
                if (input) {
                    input.focus();
                }
            }
        }
    }
    
    toggleAISettings() {
        const settings = document.getElementById('aiSettings');
        if (settings) {
            const isVisible = settings.style.display !== 'none';
            settings.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    changeProvider(provider) {
        this.currentProvider = provider;
        localStorage.setItem('ai_current_provider', provider);
        this.updateProviderStatus();
        
        // Обновляем модель
        const modelSelect = document.getElementById('aiModel');
        if (modelSelect) {
            switch (provider) {
                case 'openai':
                    modelSelect.innerHTML = `
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="gpt-4">GPT-4</option>
                    `;
                    break;
                case 'gemini':
                    modelSelect.innerHTML = `
                        <option value="gemini-pro">Gemini Pro</option>
                        <option value="gemini-pro-vision">Gemini Pro Vision</option>
                    `;
                    break;
                case 'huggingface':
                    modelSelect.innerHTML = `
                        <option value="gpt2">GPT-2</option>
                        <option value="custom">Пользовательская</option>
                    `;
                    break;
                case 'local':
                    modelSelect.innerHTML = `
                        <option value="local-model">Локальная модель</option>
                    `;
                    break;
            }
        }
    }
    
    updateProviderStatus() {
        const provider = this.providers[this.currentProvider];
        const status = provider.apiKey ? 'Настроен' : 'Требует API ключ';
        
        // Обновляем статус в интерфейсе если он есть
        const statusElement = document.querySelector('.ai-provider-status');
        if (statusElement) {
            statusElement.textContent = `${provider.name}: ${status}`;
        }
    }
    
    saveAPIKeys() {
        const openaiKey = document.getElementById('openaiKey').value;
        const geminiKey = document.getElementById('geminiKey').value;
        const huggingfaceKey = document.getElementById('huggingfaceKey').value;
        
        this.providers.openai.apiKey = openaiKey;
        this.providers.gemini.apiKey = geminiKey;
        this.providers.huggingface.apiKey = huggingfaceKey;
        
        localStorage.setItem('ai_openai_key', openaiKey);
        localStorage.setItem('ai_gemini_key', geminiKey);
        localStorage.setItem('ai_huggingface_key', huggingfaceKey);
        
        this.updateProviderStatus();
        
        // Показываем уведомление
        if (window.xpchatEnhanced && window.xpchatEnhanced.showNotification) {
            window.xpchatEnhanced.showNotification('API ключи сохранены', 'success');
        }
    }
    
    loadConversationHistory() {
        const saved = localStorage.getItem('ai_conversation_history');
        if (saved) {
            this.conversationHistory = JSON.parse(saved);
        }
    }
    
    saveConversationHistory() {
        localStorage.setItem('ai_conversation_history', JSON.stringify(this.conversationHistory));
    }
    
    // Методы для интеграции с основным приложением
    getConversationHistory() {
        return this.conversationHistory;
    }
    
    getCurrentProvider() {
        return this.currentProvider;
    }
    
    isConfigured() {
        const provider = this.providers[this.currentProvider];
        return provider.apiKey || this.currentProvider === 'local';
    }
}

// Экспортируем класс
window.AIAssistant = AIAssistant;
