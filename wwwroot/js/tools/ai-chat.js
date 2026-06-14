function initAiChat() {
    console.log('Initializing AI Chat Tool');

    var chatContainer = document.getElementById('ai-chat');
    if (!chatContainer) return;

    var toolContainer = chatContainer.parentNode;
    if (toolContainer && toolContainer.classList.contains('tool-container')) {
        toolContainer.style.display = 'flex';
        toolContainer.style.flexDirection = 'column';
        toolContainer.style.overflow = 'hidden';
        toolContainer.style.padding = '0';
    }

    var historyList = document.getElementById('ai-chat-history-list');
    var messagesArea = document.getElementById('ai-chat-messages');
    var chatInput = document.getElementById('ai-chat-input');
    var sendBtn = document.getElementById('ai-chat-send-btn');
    var newBtn = document.getElementById('ai-chat-new-btn');
    var providerSelect = document.getElementById('ai-chat-provider-select');
    var modelSelect = document.getElementById('ai-chat-model-select');
    var toolUi = chatContainer.querySelector('.chat-tool-ui');

    var settings = null;
    var conversations = [];
    var currentConvId = null;
    var abortController = null;
    var isStreaming = false;
    var streamingContent = '';

    var LS_KEY = 'ai-chat-conversations';
    var LS_CURRENT_KEY = 'ai-chat-current';

    function generateId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showNotification(msg, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(msg, type || 'info');
        }
    }

    function getActiveProvider() {
        var idx = providerSelect.selectedIndex;
        if (settings && settings.providers && idx >= 0 && idx < settings.providers.length) {
            return settings.providers[idx];
        }
        return null;
    }

    function getActiveModel() {
        var provider = getActiveProvider();
        if (provider && provider.models && modelSelect.selectedIndex >= 0) {
            return provider.models[modelSelect.selectedIndex];
        }
        return null;
    }

    function loadSettings() {
        var localRaw = localStorage.getItem('ai-chat-settings');
        if (localRaw) {
            try {
                var local = JSON.parse(localRaw);
                if (local && local.providers && local.providers.length > 0) {
                    settings = local;
                    return Promise.resolve(local);
                }
            } catch (e) { }
        }

        return fetch('/api/settings/load', { cache: 'no-cache' })
            .then(function (res) {
                if (!res.ok) throw new Error('settings load failed (HTTP ' + res.status + ')');
                return res.json();
            })
            .then(function (config) {
                settings = config;
                return config;
            })
            .catch(function (err) {
                console.error('Failed to load settings:', err);
                settings = null;
                return null;
            });
    }

    function loadConversations() {
        try {
            var raw = localStorage.getItem(LS_KEY);
            if (raw) {
                conversations = JSON.parse(raw);
            } else {
                fetch('/api/conversations/load')
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (Array.isArray(data) && data.length > 0) {
                            conversations = data;
                            currentConvId = conversations[0].id;
                            localStorage.setItem(LS_KEY, JSON.stringify(conversations));
                            localStorage.setItem(LS_CURRENT_KEY, currentConvId);
                            renderConversationList();
                            renderMessages();
                            renderModelBar();
                        }
                    })
                    .catch(function() {});
                conversations = [];
            }
            var savedId = localStorage.getItem(LS_CURRENT_KEY);
            if (savedId && conversations.some(function (c) { return c.id === savedId; })) {
                currentConvId = savedId;
            } else if (conversations.length > 0) {
                currentConvId = conversations[0].id;
            }
        } catch (e) {
            conversations = [];
            currentConvId = null;
        }
    }

    function saveConversations() {
        localStorage.setItem(LS_KEY, JSON.stringify(conversations));
        localStorage.setItem(LS_CURRENT_KEY, currentConvId || '');
        fetch('/api/conversations/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(conversations)
        }).catch(function() {});
    }

    function getCurrentConversation() {
        if (!currentConvId) return null;
        for (var i = 0; i < conversations.length; i++) {
            if (conversations[i].id === currentConvId) return conversations[i];
        }
        return null;
    }

    function createConversation() {
        var conv = {
            id: generateId(),
            title: '新对话',
            model: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: []
        };
        conversations.unshift(conv);
        currentConvId = conv.id;
        saveConversations();
        renderConversationList();
        renderMessages();
        renderModelBar();
    }

    function deleteConversation(id) {
        if (!confirm('确定要删除这个对话吗？')) return;
        conversations = conversations.filter(function (c) { return c.id !== id; });
        if (currentConvId === id) {
            currentConvId = conversations.length > 0 ? conversations[0].id : null;
        }
        saveConversations();
        renderConversationList();
        renderMessages();
    }

    function autoTitleConversation(conv) {
        if (conv.renamed) return;
        if (conv.messages.length > 0) {
            var firstMsg = '';
            for (var i = 0; i < conv.messages.length; i++) {
                if (conv.messages[i].role === 'user') {
                    firstMsg = conv.messages[i].content;
                    break;
                }
            }
            if (firstMsg) {
                conv.title = firstMsg.length > 30 ? firstMsg.substring(0, 30) + '...' : firstMsg;
            }
        }
    }

    function renderProviderSelect() {
        providerSelect.innerHTML = '';
        if (!settings || !settings.providers || settings.providers.length === 0) {
            var opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '无可用供应商';
            providerSelect.appendChild(opt);
            providerSelect.disabled = true;
            return;
        }
        providerSelect.disabled = false;
        for (var i = 0; i < settings.providers.length; i++) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.textContent = settings.providers[i].name;
            providerSelect.appendChild(opt);
        }
        providerSelect.selectedIndex = 0;
        renderModelSelect();
    }

    function renderModelSelect() {
        modelSelect.innerHTML = '';
        var provider = getActiveProvider();
        if (!provider || !provider.models || provider.models.length === 0) {
            var opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '无可用模型';
            modelSelect.appendChild(opt);
            modelSelect.disabled = true;
            return;
        }
        modelSelect.disabled = false;
        for (var i = 0; i < provider.models.length; i++) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.textContent = provider.models[i].name || provider.models[i].id;
            modelSelect.appendChild(opt);
        }
        modelSelect.selectedIndex = 0;
    }

    function renderModelBar() {
        // Model bar removed, no longer needed
    }

    function renderConversationList() {
        historyList.innerHTML = '';
        if (conversations.length === 0) {
            var emptyDiv = document.createElement('div');
            emptyDiv.className = 'chat-history-empty';
            emptyDiv.textContent = '暂无对话记录';
            historyList.appendChild(emptyDiv);
            return;
        }
        for (var i = 0; i < conversations.length; i++) {
            (function (conv) {
                var item = document.createElement('div');
                item.className = 'chat-history-item';
                if (conv.id === currentConvId) {
                    item.classList.add('active');
                }

                var titleSpan = document.createElement('span');
                titleSpan.className = 'chat-history-title';
                titleSpan.textContent = conv.title || '新对话';

                var renameBtn = document.createElement('button');
                renameBtn.className = 'chat-history-rename';
                renameBtn.innerHTML = '<i class="fas fa-pen"></i>';
                renameBtn.title = '重命名';
                renameBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var input = document.createElement('input');
                    input.type = 'text';
                    input.value = conv.title || '新对话';
                    input.style.cssText = 'flex:1;min-width:0;background:var(--color-bg-tertiary);border:1px solid var(--color-active);border-radius:var(--radius-sm);color:var(--color-text-primary);font-size:0.9rem;padding:2px 6px;font-family:inherit;outline:none;';
                    var done = function () {
                        var v = input.value.trim();
                        if (v) {
                            conv.title = v;
                            conv.renamed = true;
                            saveConversations();
                            renderConversationList();
                        } else {
                            renderConversationList();
                        }
                    };
                    input.addEventListener('blur', done);
                    input.addEventListener('keydown', function (ev) {
                        if (ev.key === 'Enter') { input.blur(); }
                        if (ev.key === 'Escape') {
                            input.value = conv.title || '新对话';
                            input.blur();
                        }
                    });
                    titleSpan.replaceWith(input);
                    input.focus();
                    input.select();
                });

                var dateSpan = document.createElement('span');
                dateSpan.className = 'chat-history-date';
                var d = new Date(conv.updatedAt);
                dateSpan.textContent = d.toLocaleDateString();

                var delBtn = document.createElement('button');
                delBtn.className = 'chat-history-delete';
                delBtn.innerHTML = '<i class="fas fa-times"></i>';
                delBtn.title = '删除对话';
                delBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                });

                item.appendChild(titleSpan);
                item.appendChild(renameBtn);
                item.appendChild(dateSpan);
                item.appendChild(delBtn);

                item.addEventListener('click', function () {
                    currentConvId = conv.id;
                    saveConversations();
                    renderConversationList();
                    renderMessages();
                    renderModelBar();
                });

                historyList.appendChild(item);
            })(conversations[i]);
        }
    }

    function renderMessages() {
        messagesArea.innerHTML = '';
        var conv = getCurrentConversation();
        if (!conv) {
            var emptyDiv = document.createElement('div');
            emptyDiv.className = 'chat-empty-state';
            emptyDiv.innerHTML = '<div class="chat-empty-icon"><i class="fas fa-comments"></i></div><p>选择或创建一个对话开始聊天</p>';
            messagesArea.appendChild(emptyDiv);
            return;
        }

        if (conv.messages.length === 0) {
            var emptyDiv = document.createElement('div');
            emptyDiv.className = 'chat-empty-state';
            emptyDiv.innerHTML = '<div class="chat-empty-icon"><i class="fas fa-robot"></i></div><p>发送消息开始对话</p>';
            messagesArea.appendChild(emptyDiv);
            return;
        }

        for (var i = 0; i < conv.messages.length; i++) {
            appendMessageBubble(conv.messages[i]);
        }
        scrollToBottom();
    }

    function appendMessageBubble(msg) {
        var bubble = document.createElement('div');
        bubble.className = 'chat-bubble chat-bubble-' + msg.role;

        var avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        if (msg.role === 'user') {
            avatar.innerHTML = '<i class="fas fa-user"></i>';
        } else if (msg.role === 'assistant') {
            avatar.innerHTML = '<i class="fas fa-robot"></i>';
        } else {
            avatar.innerHTML = '<i class="fas fa-cog"></i>';
        }

        var content = document.createElement('div');
        content.className = 'chat-bubble-content';

        if (msg.role === 'assistant') {
            content.innerHTML = msg._rendered || renderFinalMarkdown(msg.content);
        } else {
            var p = document.createElement('p');
            p.textContent = msg.content;
            content.appendChild(p);
        }

        bubble.appendChild(avatar);
        bubble.appendChild(content);
        messagesArea.appendChild(bubble);
    }

    function renderMarkdown(text) {
        if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
            try {
                return marked.parse(text);
            } catch (e) {
                return '<p>' + escapeHtml(text) + '</p>';
            }
        }
        var result = '';
        var lines = text.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var esc = escapeHtml(lines[i]);
            if (esc.trim() === '') {
                result += '<br>';
            } else {
                result += '<p>' + esc + '</p>';
            }
        }
        return result;
    }

    function enhanceMarkdown(html) {
        var div = document.createElement('div');
        div.innerHTML = html;
        var links = div.querySelectorAll('a');
        for (var i = 0; i < links.length; i++) {
            links[i].setAttribute('target', '_blank');
            links[i].setAttribute('rel', 'noopener noreferrer');
        }
        var pres = div.querySelectorAll('pre');
        for (var j = 0; j < pres.length; j++) {
            var pre = pres[j];
            pre.style.position = 'relative';
            var btn = document.createElement('button');
            btn.className = 'code-copy-btn';
            btn.textContent = '复制';
            pre.appendChild(btn);
        }
        return div.innerHTML;
    }

    function renderFinalMarkdown(text) {
        return enhanceMarkdown(renderMarkdown(text));
    }

    function scrollToBottom() {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function sendMessage() {
        if (isStreaming) return;
        var text = chatInput.value.trim();
        if (!text) return;

        var provider = getActiveProvider();
        var model = getActiveModel();
        if (!provider) {
            showNotification('未配置 AI 供应商，请在 settings.json 中添加 providers 配置', 'error');
            return;
        }
        if (!provider.apiKey || provider.apiKey.indexOf('your-key') !== -1) {
            showNotification('请在 settings.json 中填写有效的 apiKey', 'error');
            return;
        }
        if (!model) {
            showNotification('未选择模型', 'error');
            return;
        }

        if (!currentConvId) {
            createConversation();
        }

        var conv = getCurrentConversation();
        if (!conv) {
            createConversation();
            conv = getCurrentConversation();
        }

        var modelLabel = model.name || model.id;
        conv.model = modelLabel;

        conv.messages.push({ role: 'user', content: text });
        autoTitleConversation(conv);
        conv.updatedAt = Date.now();
        saveConversations();
        renderConversationList();
        renderMessages();
        renderModelBar();
        chatInput.value = '';
        chatInput.style.height = 'auto';

        addStreamingBubble();

        isStreaming = true;
        sendBtn.disabled = true;
        chatInput.disabled = true;

        var messages = [];
        for (var i = 0; i < conv.messages.length; i++) {
            messages.push({ role: conv.messages[i].role, content: conv.messages[i].content });
        }

        streamResponse(messages, provider, model, conv);
    }

    function addStreamingBubble() {
        var bubble = document.createElement('div');
        bubble.className = 'chat-bubble chat-bubble-assistant';
        bubble.id = 'ai-chat-streaming-bubble';

        var avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';

        var content = document.createElement('div');
        content.className = 'chat-bubble-content';
        content.innerHTML = '<span class="streaming-cursor">▌</span>';

        bubble.appendChild(avatar);
        bubble.appendChild(content);
        messagesArea.appendChild(bubble);
        scrollToBottom();
    }

    function streamResponse(messages, provider, model, conv) {
        abortController = new AbortController();
        streamingContent = '';

        var url = (provider.baseUrl || '').replace(/\/+$/, '') + '/chat/completions';

        var body = {
            model: model.id,
            messages: messages,
            stream: true
        };

        var headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + provider.apiKey,
            'HTTP-Referer': window.location.origin || 'http://localhost:8080',
            'X-Title': 'Roxami Studio'
        };

        fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            signal: abortController.signal
        })
            .then(function (response) {
                if (!response.ok) {
                    return response.text().then(function (errText) {
                        throw new Error('API 请求失败 (HTTP ' + response.status + '): ' + errText.substring(0, 200));
                    });
                }
                return response.body.getReader();
            })
            .then(function (reader) {
                return readStream(reader, conv);
            })
            .catch(function (err) {
                if (err.name === 'AbortError') {
                    handleStreamEnd(conv, true);
                } else {
                    handleStreamError(err.message);
                }
            });
    }

    function readStream(reader, conv) {
        var decoder = new TextDecoder();
        var buffer = '';

        function pump() {
            return reader.read().then(function (result) {
                if (result.done) {
                    handleStreamEnd(conv, false);
                    return;
                }

                buffer += decoder.decode(result.value, { stream: true });
                var lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (!line || !line.startsWith('data: ')) continue;
                    var data = line.substring(6);
                    if (data === '[DONE]') {
                        handleStreamEnd(conv, false);
                        return;
                    }
                    try {
                        var json = JSON.parse(data);
                        var delta = json.choices && json.choices[0] && json.choices[0].delta;
                        if (delta && delta.content) {
                            streamingContent += delta.content;
                            updateStreamingBubble();
                        }
                    } catch (e) { }
                }

                return pump();
            });
        }

        return pump();
    }

    function updateStreamingBubble() {
        var bubble = document.getElementById('ai-chat-streaming-bubble');
        if (!bubble) return;
        var content = bubble.querySelector('.chat-bubble-content');
        if (!content) return;

        var rendered = renderMarkdown(streamingContent);
        content.innerHTML = rendered + '<span class="streaming-cursor">▌</span>';
        scrollToBottom();
    }

    function handleStreamEnd(conv, wasAborted) {
        var bubble = document.getElementById('ai-chat-streaming-bubble');
        if (!bubble) {
            finishStreaming(conv, wasAborted);
            return;
        }

        if (wasAborted && streamingContent) {
            streamingContent += '\n\n*(已停止生成)*';
        }

        var content = bubble.querySelector('.chat-bubble-content');
        if (content) {
            content.innerHTML = streamingContent ? renderFinalMarkdown(streamingContent) : '*(无回复内容)*';
            var cursor = content.querySelector('.streaming-cursor');
            if (cursor) cursor.remove();
        }

        var finalContent = wasAborted && !streamingContent ? '*(已停止生成)*' : streamingContent;
        finishStreaming(conv, wasAborted, finalContent);
    }

    function handleStreamError(errorMsg) {
        var bubble = document.getElementById('ai-chat-streaming-bubble');
        if (bubble) {
            var content = bubble.querySelector('.chat-bubble-content');
            if (content) {
                content.innerHTML = '<span style="color:var(--color-accent-red)"><i class="fas fa-exclamation-triangle"></i> ' + escapeHtml(errorMsg) + '</span>';
            }
        }
        finishStreaming(null, false);
        showNotification('AI 请求失败: ' + errorMsg, 'error');
    }

    function finishStreaming(conv, wasAborted, finalContent) {
        if (conv && finalContent) {
            var msg = { role: 'assistant', content: finalContent };
            if (!wasAborted) {
                msg._rendered = renderFinalMarkdown(finalContent);
            }
            conv.messages.push(msg);
        }
        if (conv) {
            conv.updatedAt = Date.now();
        }
        saveConversations();
        renderConversationList();

        isStreaming = false;
        sendBtn.disabled = false;
        chatInput.disabled = false;
        abortController = null;
        streamingContent = '';
        chatInput.focus();
    }

    function setupEventListeners() {
        sendBtn.addEventListener('click', sendMessage);

        chatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        chatInput.addEventListener('input', function () {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
        });

        newBtn.addEventListener('click', function () {
            if (isStreaming) {
                if (!confirm('当前正在生成回复，确定要开始新对话吗？')) return;
                if (abortController) abortController.abort();
                isStreaming = false;
                sendBtn.disabled = false;
                chatInput.disabled = false;
            }
            createConversation();
        });

        providerSelect.addEventListener('change', function () {
            renderModelSelect();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isStreaming && abortController) {
                abortController.abort();
                showNotification('已停止生成', 'warning');
            }
        });

        var scrollBtn = document.getElementById('ai-chat-scroll-bottom');
        if (scrollBtn) {
            scrollBtn.addEventListener('click', function () {
                scrollToBottom();
            });
        }

        messagesArea.addEventListener('scroll', function () {
            if (scrollBtn) {
                var dist = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight;
                if (dist > 100) {
                    scrollBtn.classList.add('visible');
                } else {
                    scrollBtn.classList.remove('visible');
                }
            }
        });

        messagesArea.addEventListener('click', function (e) {
            var btn = e.target.closest('.code-copy-btn');
            if (!btn) return;
            e.preventDefault();
            var pre = btn.closest('pre');
            if (!pre) return;
            var code = pre.querySelector('code');
            var text = code ? code.textContent : pre.textContent;
            navigator.clipboard.writeText(text).then(function () {
                btn.textContent = '已复制';
                btn.classList.add('copied');
                setTimeout(function () {
                    btn.textContent = '复制';
                    btn.classList.remove('copied');
                }, 1500);
            }).catch(function () {
                btn.textContent = '失败';
                setTimeout(function () { btn.textContent = '复制'; }, 1200);
            });
        });
    }

    function showSetupPrompt() {
        var chatLayout = document.getElementById('ai-chat-layout');
        var setupEl = document.getElementById('ai-chat-setup');
        if (chatLayout) chatLayout.style.display = 'none';
        if (setupEl) setupEl.style.display = '';
        toolUi.style.display = '';
    }

    function hideSetupPrompt() {
        var chatLayout = document.getElementById('ai-chat-layout');
        var setupEl = document.getElementById('ai-chat-setup');
        if (chatLayout) chatLayout.style.display = '';
        if (setupEl) setupEl.style.display = 'none';
    }

    function init() {
        if (!chatContainer) return;

        loadSettings().then(function () {
            if (settings && settings.providers && settings.providers.length > 0) {
                hideSetupPrompt();
                renderProviderSelect();
                loadConversations();
                renderConversationList();
                renderMessages();
                renderModelBar();
                setupEventListeners();

                if (!currentConvId && conversations.length === 0) {
                    createConversation();
                }
            } else {
                showSetupPrompt();
            }
        });

        window.addEventListener('ai-config-changed', function () {
            loadSettings().then(function () {
                if (settings && settings.providers && settings.providers.length > 0) {
                    hideSetupPrompt();
                    renderProviderSelect();
                    renderModelSelect();
                } else {
                    showSetupPrompt();
                }
            });
        });
    }

    init();
}
