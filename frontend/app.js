document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const clearChatBtn = document.getElementById('clear-chat');
    const typingIndicator = document.getElementById('typing-indicator');
    const welcomeTime = document.getElementById('welcome-time');

    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Set Welcome Message Time to current local time
    welcomeTime.textContent = formatTime(new Date());

    // Theme Management
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        if (!themeIcon || !window.lucide) return;
        
        // Remove current icon content and render new icon
        if (theme === 'dark') {
            themeIcon.setAttribute('data-lucide', 'sun');
            themeToggle.setAttribute('title', 'Switch to Light Mode');
        } else {
            themeIcon.setAttribute('data-lucide', 'moon');
            themeToggle.setAttribute('title', 'Switch to Dark Mode');
        }
        window.lucide.createIcons();
    }

    // Clear Chat Logic
    clearChatBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your chat history?')) {
            // Keep only the first message (welcome message)
            const welcomeMsg = chatMessages.firstElementChild;
            chatMessages.innerHTML = '';
            if (welcomeMsg) {
                chatMessages.appendChild(welcomeMsg);
            }
            scrollToBottom();
        }
    });

    // Form Submit Event Handler
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const messageText = chatInput.value.trim();
        if (!messageText) return;

        // 1. Add User Message
        appendMessage('user', messageText);
        chatInput.value = '';
        scrollToBottom();

        // 2. Show Typing Indicator
        showTypingIndicator();
        scrollToBottom();

        // 3. Send Message to Backend API
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: messageText })
            });

            const data = await response.json();
            
            // Hide typing indicator before adding reply
            hideTypingIndicator();

            if (response.ok) {
                appendMessage('bot', data.reply);
            } else {
                appendMessage('bot', `⚠️ Error: ${data.detail || 'Failed to get response.'}`, true);
            }
        } catch (error) {
            hideTypingIndicator();
            appendMessage('bot', `⚠️ Error connecting to server. Please check your network connection.`, true);
            console.error('Fetch error:', error);
        }
        
        scrollToBottom();
    });

    // Helpers
    function appendMessage(sender, text, isError = false) {
        const messageGroup = document.createElement('div');
        messageGroup.classList.add('message-group', sender);

        const avatar = document.createElement('div');
        avatar.classList.add('message-avatar');
        
        const avatarIconName = sender === 'user' ? 'user' : 'shopping-bag';
        avatar.innerHTML = `<i data-lucide="${avatarIconName}"></i>`;

        const content = document.createElement('div');
        content.classList.add('message-content');
        if (isError) {
            content.style.color = '#ef4444'; // Red error text
        }

        // Handle paragraphs and line breaks cleanly from markdown / newlines
        const paragraphs = text.split('\n\n');
        paragraphs.forEach(p => {
            if (p.trim()) {
                const pEl = document.createElement('p');
                // Replace formatting like bold **text** or lists, or simply set textContent
                pEl.innerHTML = formatMarkdown(p);
                content.appendChild(pEl);
            }
        });

        const time = document.createElement('span');
        time.classList.add('message-time');
        time.textContent = formatTime(new Date());
        content.appendChild(time);

        messageGroup.appendChild(avatar);
        messageGroup.appendChild(content);
        
        chatMessages.appendChild(messageGroup);

        // Render Lucide icons for the newly added message
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function showTypingIndicator() {
        typingIndicator.classList.remove('hidden');
    }

    function hideTypingIndicator() {
        typingIndicator.classList.add('hidden');
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function formatTime(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    }

    // Simple parser for basic markdown like bold text (**bold**), list items (- item), and line breaks
    function formatMarkdown(text) {
        // Escape HTML to prevent XSS
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // Convert markdown bold (**text**) to HTML <strong>text</strong>
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert single line breaks to <br>
        escaped = escaped.replace(/\n/g, '<br>');

        return escaped;
    }
});
