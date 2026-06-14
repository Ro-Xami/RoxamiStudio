var AiGenChat = (function () {
    'use strict';

    var _cfg = null;

    function init(opts) {
        _cfg = opts;
        var container = document.getElementById(opts.toolId);
        if (!container) return;

        var toolContainer = container.parentNode;
        if (toolContainer && toolContainer.classList.contains('tool-container')) {
            toolContainer.style.display = 'flex';
            toolContainer.style.flexDirection = 'column';
            toolContainer.style.overflow = 'hidden';
            toolContainer.style.padding = '0';
        }

        var chatLayout = container.querySelector('.chat-layout');
        var setupEl = container.querySelector('.chat-setup-prompt');
        var historyList = container.querySelector('.chat-history-list');
        var newBtn = container.querySelector('.chat-new-btn');
        var messagesArea = container.querySelector('.chat-messages');
        var scrollBtn = container.querySelector('.scroll-bottom-btn');
        var chatInput = container.querySelector('.chat-input');
        var sendBtn = container.querySelector('.chat-send-btn');
        var configBar = container.querySelector('.chat-config-bar');
        var configEls = {};

        var config = null;
        var activeProvider = null;
        var conversations = [];
        var currentConvId = null;
        var abortCtrl = null;
        var isBusy = false;
        var LS_KEY = 'aigen-' + opts.toolId + '-convs';
        var LS_CUR = 'aigen-' + opts.toolId + '-cur';

        function genId() { return 'g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }
        function escHtml(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
        function notify(m, t) { AiCore.showNotification(m, t || 'info'); }

        function loadConvs() {
            try {
                var r = localStorage.getItem(LS_KEY);
                conversations = r ? JSON.parse(r) : [];
                var cid = localStorage.getItem(LS_CUR);
                if (cid && conversations.some(function (c) { return c.id === cid; })) currentConvId = cid;
                else if (conversations.length > 0) currentConvId = conversations[0].id;
            } catch (e) { conversations = []; currentConvId = null; }
        }
        function saveConvs() {
            localStorage.setItem(LS_KEY, JSON.stringify(conversations));
            localStorage.setItem(LS_CUR, currentConvId || '');
        }
        function getCurrent() {
            for (var i = 0; i < conversations.length; i++) if (conversations[i].id === currentConvId) return conversations[i];
            return null;
        }
        function createConv() {
            var c = { id: genId(), title: '新对话', renamed: false, createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
            conversations.unshift(c);
            currentConvId = c.id;
            saveConvs();
            renderAll();
        }
        function deleteConv(id) {
            if (!confirm('确定删除此对话？')) return;
            conversations = conversations.filter(function (c) { return c.id !== id; });
            if (currentConvId === id) currentConvId = conversations.length > 0 ? conversations[0].id : null;
            saveConvs();
            renderAll();
        }
        function autoTitle(conv) {
            if (conv.renamed) return;
            for (var i = 0; i < conv.messages.length; i++) {
                if (conv.messages[i].role === 'user') { conv.title = conv.messages[i].content.substring(0, 30); return; }
            }
        }

        function renderHistory() {
            historyList.innerHTML = '';
            if (conversations.length === 0) {
                var e = document.createElement('div');
                e.className = 'chat-history-empty'; e.textContent = '暂无记录';
                historyList.appendChild(e); return;
            }
            for (var i = 0; i < conversations.length; i++) {
                (function (conv) {
                    var item = document.createElement('div');
                    item.className = 'chat-history-item';
                    if (conv.id === currentConvId) item.classList.add('active');

                    var title = document.createElement('span');
                    title.className = 'chat-history-title';
                    title.textContent = conv.title || '新对话';

                    var renameBtn = document.createElement('button');
                    renameBtn.className = 'chat-history-rename';
                    renameBtn.innerHTML = '<i class="fas fa-pen"></i>';
                    renameBtn.title = '重命名';
                    renameBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        var inp = document.createElement('input');
                        inp.type = 'text'; inp.value = conv.title || '新对话';
                        inp.style.cssText = 'flex:1;min-width:0;background:var(--color-bg-tertiary);border:1px solid var(--color-active);border-radius:var(--radius-sm);color:var(--color-text-primary);font-size:0.9rem;padding:2px 6px;font-family:inherit;outline:none;';
                        var done = function () { var v = inp.value.trim(); if (v) { conv.title = v; conv.renamed = true; saveConvs(); } renderHistory(); };
                        inp.addEventListener('blur', done);
                        inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape') { inp.value = conv.title; inp.blur(); } });
                        title.replaceWith(inp); inp.focus(); inp.select();
                    });

                    var date = document.createElement('span');
                    date.className = 'chat-history-date';
                    date.textContent = new Date(conv.updatedAt).toLocaleDateString();

                    var delBtn = document.createElement('button');
                    delBtn.className = 'chat-history-delete';
                    delBtn.innerHTML = '<i class="fas fa-times"></i>';
                    delBtn.addEventListener('click', function (e) { e.stopPropagation(); deleteConv(conv.id); });

                    item.appendChild(title);
                    item.appendChild(renameBtn);
                    item.appendChild(date);
                    item.appendChild(delBtn);
                    item.addEventListener('click', function () { currentConvId = conv.id; saveConvs(); renderAll(); });
                    historyList.appendChild(item);
                })(conversations[i]);
            }
        }

        function renderMessages() {
            messagesArea.innerHTML = '';
            if (scrollBtn) scrollBtn.classList.remove('visible');
            var conv = getCurrent();
            if (!conv) {
                var e = document.createElement('div'); e.className = 'chat-empty-state';
                e.innerHTML = '<div class="chat-empty-icon"><i class="fas fa-comments"></i></div><p>选择或创建对话</p>';
                messagesArea.appendChild(e); return;
            }
            if (conv.messages.length === 0) {
                var e = document.createElement('div'); e.className = 'chat-empty-state';
                e.innerHTML = '<div class="chat-empty-icon"><i class="fas fa-robot"></i></div><p>发送消息开始</p>';
                messagesArea.appendChild(e); return;
            }
            for (var i = 0; i < conv.messages.length; i++) {
                appendBubble(conv.messages[i]);
            }
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        function appendBubble(msg) {
            var bubble = document.createElement('div');
            bubble.className = 'chat-bubble chat-bubble-' + msg.role;
            var avatar = document.createElement('div'); avatar.className = 'chat-avatar';
            avatar.innerHTML = msg.role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
            var content = document.createElement('div'); content.className = 'chat-bubble-content';

            if (msg.role === 'user') {
                var p = document.createElement('p'); p.textContent = msg.content; content.appendChild(p);
            } else {
                content.innerHTML = msg._html || '<p>' + escHtml(msg.content || '') + '</p>';
                if (msg.type && msg.type !== 'text' && msg.resultUrl) {
                    var media = renderMedia(msg.type, msg.resultUrl, msg.meta);
                    if (media) { var wrap = document.createElement('div'); wrap.appendChild(media); content.appendChild(wrap); }
                }
                content.innerHTML = enhanceHtml(content.innerHTML);
            }

            bubble.appendChild(avatar);
            bubble.appendChild(content);
            messagesArea.appendChild(bubble);
        }

        function renderMedia(type, url, meta) {
            var el;
            if (type === 'image') {
                el = document.createElement('img');
                el.src = url; el.style.cssText = 'max-width:100%;max-height:400px;border-radius:var(--radius-md);cursor:pointer;margin-top:var(--spacing-sm);';
                el.addEventListener('click', function () { window.open(url, '_blank'); });
            } else if (type === 'video') {
                el = document.createElement('video');
                el.controls = true; el.style.cssText = 'max-width:100%;max-height:400px;border-radius:var(--radius-md);margin-top:var(--spacing-sm);';
                var s = document.createElement('source'); s.src = url; s.type = 'video/mp4'; el.appendChild(s);
            } else if (type === 'model') {
                el = document.createElement('img');
                el.src = url; el.style.cssText = 'max-width:100%;max-height:300px;border-radius:var(--radius-md);cursor:pointer;margin-top:var(--spacing-sm);';
            } else if (type === 'audio') {
                el = document.createElement('audio');
                el.controls = true; el.style.cssText = 'width:100%;margin-top:var(--spacing-sm);';
                var s = document.createElement('source'); s.src = url; s.type = 'audio/mpeg'; el.appendChild(s);
            }
            return el || null;
        }

        function enhanceHtml(html) {
            var d = document.createElement('div'); d.innerHTML = html;
            var links = d.querySelectorAll('a');
            for (var i = 0; i < links.length; i++) { links[i].setAttribute('target', '_blank'); links[i].setAttribute('rel', 'noopener noreferrer'); }
            var pres = d.querySelectorAll('pre');
            for (var j = 0; j < pres.length; j++) {
                pres[j].style.position = 'relative';
                var btn = document.createElement('button'); btn.className = 'code-copy-btn'; btn.textContent = '复制';
                pres[j].appendChild(btn);
            }
            return d.innerHTML;
        }

        function scrollBottom() { messagesArea.scrollTop = messagesArea.scrollHeight; }

        function renderConfigBar() {
            configBar.innerHTML = '';
            if (!config || !config.providers || config.providers.length === 0) return;

            // Provider select
            var psel = document.createElement('select');
            psel.id = 'aigen-provider'; psel.className = 'chat-config-select';
            for (var i = 0; i < config.providers.length; i++) {
                var o = document.createElement('option');
                o.value = i;
                o.textContent = config.providers[i].name || ('供应商 ' + (i + 1));
                psel.appendChild(o);
            }
            psel.addEventListener('change', function () {
                activeProvider = config.providers[parseInt(psel.value)] || null;
                renderModelSelect();
            });
            configBar.appendChild(psel);

            // Model select
            var msel = document.createElement('select');
            msel.id = 'aigen-model'; msel.className = 'chat-config-select';
            configBar.appendChild(msel);
            configEls.provider = psel;
            configEls.model = msel;

            activeProvider = config.providers[0];
            renderModelSelect();

            // Extra controls
            if (opts.extraControls) {
                for (var k = 0; k < opts.extraControls.length; k++) {
                    (function (ctrl) {
                        var label = document.createElement('span');
                        label.className = 'chat-config-label'; label.textContent = ctrl.label;
                        configBar.appendChild(label);
                        var el;
                        if (ctrl.type === 'select') {
                            el = document.createElement('select'); el.className = 'chat-config-select';
                            var options = ctrl.options || [];
                            for (var oi = 0; oi < options.length; oi++) {
                                var o = document.createElement('option'); o.value = options[oi]; o.textContent = options[oi]; el.appendChild(o);
                            }
                            if (ctrl.value) el.value = ctrl.value;
                        } else if (ctrl.type === 'number') {
                            el = document.createElement('input'); el.type = 'number'; el.className = 'chat-config-number';
                            el.value = ctrl.value || 1; el.min = ctrl.min || 1; el.max = ctrl.max || 10;
                        }
                        configBar.appendChild(el);
                        configEls[ctrl.id] = el;
                    })(opts.extraControls[k]);
                }
            }
        }

        function renderModelSelect() {
            var msel = configEls.model;
            if (!msel) return;
            msel.innerHTML = '';
            if (!activeProvider || !activeProvider.models || activeProvider.models.length === 0) {
                msel.innerHTML = '<option value="">无模型</option>';
                return;
            }
            for (var i = 0; i < activeProvider.models.length; i++) {
                var o = document.createElement('option');
                o.value = activeProvider.models[i].id;
                o.textContent = activeProvider.models[i].name || activeProvider.models[i].id;
                msel.appendChild(o);
            }
        }

        function collectControls() {
            var ctrl = {};
            if (opts.extraControls) {
                for (var k = 0; k < opts.extraControls.length; k++) {
                    var cid = opts.extraControls[k].id;
                    var el = configEls[cid];
                    if (el) ctrl[cid] = el.value;
                }
            }
            return ctrl;
        }

        function send() {
            if (isBusy) return;
            var text = chatInput.value.trim();
            if (!text) return;
            if (!activeProvider || !activeProvider.baseUrl || !activeProvider.apiKey) { notify('请先在设置中配置 API', 'error'); return; }
            var model = configEls.model ? configEls.model.value : '';
            if (!model) { notify('请选择模型', 'error'); return; }

            if (!currentConvId) createConv();
            var conv = getCurrent();
            if (!conv) { createConv(); conv = getCurrent(); }

            conv.messages.push({ role: 'user', content: text });
            autoTitle(conv);
            conv.updatedAt = Date.now();
            saveConvs();
            renderAll();
            chatInput.value = ''; chatInput.style.height = 'auto';

            var ctrlVals = collectControls();
            var body = opts.buildBody ? opts.buildBody(text, model, ctrlVals) : { model: model, prompt: text };
            var url = (activeProvider.baseUrl || '').replace(/\/+$/, '') + (opts.endpoint || '');

            addStreamingBubble();
            isBusy = true; sendBtn.disabled = true; chatInput.disabled = true;
            abortCtrl = new AbortController();

            AiCore.callApi(url, activeProvider.apiKey, body, { signal: abortCtrl.signal })
                .then(function (data) {
                    removeStreamingBubble();
                    var result = null;
                    if (typeof data === 'string' && (data.startsWith('blob:') || data.startsWith('http'))) {
                        result = { url: data };
                    } else if (data) {
                        if (data.data && data.data.length) result = { urls: data.data };
                        else if (data.url) result = { url: data.url };
                        else if (data.video_url) result = { url: data.video_url, async: true };
                        else if (data.audio_url) result = { url: data.audio_url };
                        else if (data.model_url || data.output_url) result = { url: data.model_url || data.output_url, async: true };
                    }

                    if (result && result.async && data.status_url) {
                        return AiCore.pollTask(data.status_url, activeProvider.apiKey, 3000, function () {}).then(function (final) {
                            result.url = final.video_url || final.url || final.output_url || final.model_url || '';
                            result.async = false;
                            return result;
                        });
                    }
                    return result || { error: '无结果' };
                })
                .then(function (result) {
                    var msg = { role: 'assistant', type: opts.resultType || 'text', content: '生成完成', _html: '' };
                    if (result.error) {
                        msg.content = '生成失败: ' + result.error;
                        msg._html = '<p style="color:var(--color-accent-red)">' + escHtml(msg.content) + '</p>';
                    } else {
                        var resUrl = result.url || (result.urls && result.urls.length ? result.urls[0].url || result.urls[0].b64_json || '' : '');
                        if (result.urls && result.urls.length > 1) {
                            msg._html = '<p>生成了 ' + result.urls.length + ' 张图片：</p>';
                            msg.resultUrls = result.urls;
                        } else {
                            msg.resultUrl = resUrl;
                            msg.meta = result;
                        }
                        if (resUrl && resUrl.startsWith('blob:')) msg.resultUrl = resUrl;
                    }
                    conv.messages.push(msg);
                    conv.updatedAt = Date.now();
                    saveConvs();
                    renderAll();
                    isBusy = false; sendBtn.disabled = false; chatInput.disabled = false;
                    abortCtrl = null;
                    chatInput.focus();
                })
                .catch(function (err) {
                    removeStreamingBubble();
                    if (err && err.name === 'AbortError') {
                        conv.messages.push({ role: 'assistant', content: '已取消', _html: '<p style="color:var(--color-text-tertiary)">已取消</p>' });
                    } else {
                        conv.messages.push({ role: 'assistant', content: '错误: ' + (err.message || err), _html: '<p style="color:var(--color-accent-red)">' + escHtml(err.message || err) + '</p>' });
                    }
                    conv.updatedAt = Date.now();
                    saveConvs();
                    renderAll();
                    isBusy = false; sendBtn.disabled = false; chatInput.disabled = false;
                    abortCtrl = null;
                });
        }

        function addStreamingBubble() {
            var b = document.createElement('div'); b.className = 'chat-bubble chat-bubble-assistant'; b.id = 'aigen-streaming';
            var a = document.createElement('div'); a.className = 'chat-avatar'; a.innerHTML = '<i class="fas fa-robot"></i>';
            var c = document.createElement('div'); c.className = 'chat-bubble-content';
            c.innerHTML = '<span style="color:var(--color-text-tertiary)"><i class="fas fa-spinner fa-spin"></i> 生成中...</span>';
            b.appendChild(a); b.appendChild(c);
            messagesArea.appendChild(b); scrollBottom();
        }
        function removeStreamingBubble() {
            var b = document.getElementById('aigen-streaming'); if (b) b.remove();
        }

        function renderAll() { renderHistory(); renderMessages(); }

        function setupUI() {
            sendBtn.addEventListener('click', send);
            chatInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
            chatInput.addEventListener('input', function () { chatInput.style.height = 'auto'; chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px'; });
            newBtn.addEventListener('click', function () { if (isBusy && !confirm('正在生成，确认新建？')) return; if (abortCtrl) abortCtrl.abort(); isBusy = false; sendBtn.disabled = false; chatInput.disabled = false; createConv(); });
            document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isBusy && abortCtrl) { abortCtrl.abort(); notify('已取消', 'warning'); } });

            if (scrollBtn) {
                scrollBtn.addEventListener('click', function () { messagesArea.scrollTop = messagesArea.scrollHeight; });
                messagesArea.addEventListener('scroll', function () {
                    var d = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight;
                    if (d > 100) scrollBtn.classList.add('visible'); else scrollBtn.classList.remove('visible');
                });
            }

            messagesArea.addEventListener('click', function (e) {
                var btn = e.target.closest('.code-copy-btn');
                if (btn) {
                    e.preventDefault();
                    var pre = btn.closest('pre'); var txt = pre ? (pre.querySelector('code') || pre).textContent : '';
                    navigator.clipboard.writeText(txt).then(function () { btn.textContent = '已复制'; btn.classList.add('copied'); setTimeout(function () { btn.textContent = '复制'; btn.classList.remove('copied'); }, 1500); });
                }
            });
        }

        function hideSetup() { if (chatLayout) chatLayout.style.display = ''; if (setupEl) setupEl.style.display = 'none'; }
        function showSetup() { if (chatLayout) chatLayout.style.display = 'none'; if (setupEl) setupEl.style.display = ''; }

        function hasAnyProvider(cfg) {
            return cfg && cfg.providers && cfg.providers.length > 0 &&
                   cfg.providers.some(function (p) { return p.baseUrl && p.apiKey; });
        }

        AiCore.loadConfig(opts.configKey).then(function (cfg) {
            if (!cfg) config = { providers: [] };
            else if (cfg.providers) config = cfg;
            else if (cfg.baseUrl !== undefined) config = { providers: cfg.baseUrl ? [{ name: cfg.baseUrl, baseUrl: cfg.baseUrl, apiKey: cfg.apiKey || '', models: cfg.models || [] }] : [] };
            else config = { providers: [] };
            loadConvs();
            renderConfigBar();
            renderAll();
            setupUI();
            if (hasAnyProvider(config)) hideSetup(); else showSetup();
            if (!currentConvId && conversations.length === 0) createConv();
        });

        window.addEventListener('ai-config-changed', function () {
            AiCore.loadConfig(opts.configKey).then(function (cfg) {
                if (!cfg) config = { providers: [] };
                else if (cfg.providers) config = cfg;
                else if (cfg.baseUrl !== undefined) config = { providers: cfg.baseUrl ? [{ name: cfg.baseUrl, baseUrl: cfg.baseUrl, apiKey: cfg.apiKey || '', models: cfg.models || [] }] : [] };
                else config = { providers: [] };
                if (hasAnyProvider(config)) hideSetup(); else showSetup();
                renderConfigBar();
            });
        });
    }

    return { init: init };
})();
