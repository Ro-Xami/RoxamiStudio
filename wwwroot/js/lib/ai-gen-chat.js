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
        var uploadBtn = container.querySelector('.chat-upload-btn');
        var fileInput = container.querySelector('.chat-file-input');
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

        function b64ToBlobUrl(b64, mime) {
            try {
                var byteChars = atob(b64);
                var byteNums = new Array(byteChars.length);
                for (var j = 0; j < byteChars.length; j++) byteNums[j] = byteChars.charCodeAt(j);
                var byteArr = new Uint8Array(byteNums);
                var blob = new Blob([byteArr], { type: mime || 'image/png' });
                return URL.createObjectURL(blob);
            } catch (e) { return null; }
        }

        function extractRefPaths(text) {
            var conv = getCurrent();
            if (!conv || !conv.files || conv.files.length === 0) return [];
            var paths = [];
            var re = /@(\S+)/g;
            var match;
            while ((match = re.exec(text)) !== null) {
                var ref = match[1];
                for (var i = 0; i < conv.files.length; i++) {
                    var f = conv.files[i];
                    if (f.path === ref || f.path.endsWith('/' + ref) || f.path.indexOf(ref) !== -1) {
                        paths.push(f.path);
                        break;
                    }
                }
            }
            return paths;
        }

        function resolveRefImages(paths) {
            if (!paths || paths.length === 0) return Promise.resolve([]);
            var promises = paths.map(function (p) {
                return fetch(AiStorage.fileUrl(p))
                    .then(function (r) { return r.blob(); })
                    .then(function (blob) {
                        return new Promise(function (resolve, reject) {
                            var reader = new FileReader();
                            reader.onload = function () { resolve(reader.result); };
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    })
                    .catch(function () { return null; });
            });
            return Promise.all(promises).then(function (results) {
                return results.filter(function (r) { return r !== null; });
            });
        }

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
            var c = { id: genId(), title: '新对话', renamed: false, createdAt: Date.now(), updatedAt: Date.now(), messages: [], files: [] };
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
                if (msg.resultUrls) {
                    for (var mi = 0; mi < msg.resultUrls.length; mi++) {
                        var media = renderMedia(msg.type || 'image', msg.resultUrls[mi].url, msg.meta);
                        if (media) { var wrap = document.createElement('div'); wrap.appendChild(media); content.appendChild(wrap); }
                    }
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

        function getControlsForProvider(provider) {
            if (typeof opts.getExtraControls === 'function') return opts.getExtraControls(provider) || [];
            return opts.extraControls || [];
        }

        function renderExtraControls() {
            var container = document.getElementById('aigen-extra-controls');
            if (!container) return;
            container.innerHTML = '';
            // Clear old configEls for extra controls
            var controls = getControlsForProvider(activeProvider);
            for (var k = 0; k < controls.length; k++) {
                delete configEls[controls[k].id];
            }
            for (var k = 0; k < controls.length; k++) {
                (function (ctrl) {
                    var label = document.createElement('span');
                    label.className = 'chat-config-label'; label.textContent = ctrl.label;
                    container.appendChild(label);
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
                    container.appendChild(el);
                    configEls[ctrl.id] = el;
                })(controls[k]);
            }
        }

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
                renderExtraControls();
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

            // Extra controls container (dynamically rendered)
            var extraContainer = document.createElement('div');
            extraContainer.id = 'aigen-extra-controls';
            extraContainer.style.cssText = 'display:flex;align-items:center;gap:var(--spacing-sm);';
            configBar.appendChild(extraContainer);
            renderExtraControls();
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
            var controls = getControlsForProvider(activeProvider);
            for (var k = 0; k < controls.length; k++) {
                var cid = controls[k].id;
                var el = configEls[cid];
                if (el) ctrl[cid] = el.value;
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
            var refPaths = extractRefPaths(text);

            addStreamingBubble();
            isBusy = true; sendBtn.disabled = true; chatInput.disabled = true;
            abortCtrl = new AbortController();

            resolveRefImages(refPaths).then(function (refImageUris) {
                var body = opts.buildBody ? opts.buildBody(text, model, ctrlVals, activeProvider, refImageUris) : { model: model, prompt: text };
                var url = (activeProvider.baseUrl || '').replace(/\/+$/, '') + (opts.endpoint || '');

                return AiCore.callApi(url, activeProvider.apiKey, body, { signal: abortCtrl.signal });
            })
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
                        conv.messages.push(msg);
                        conv.updatedAt = Date.now();
                        saveConvs();
                        renderAll();
                        isBusy = false; sendBtn.disabled = false; chatInput.disabled = false;
                        abortCtrl = null;
                        chatInput.focus();
                        return;
                    }

                    var resUrl = result.url || (result.urls && result.urls.length ? result.urls[0].url || result.urls[0].b64_json || '' : '');
                    if (resUrl && !resUrl.startsWith('http') && !resUrl.startsWith('blob:') && !resUrl.startsWith('/') && resUrl.length > 50) {
                        resUrl = b64ToBlobUrl(resUrl, 'image/png') || resUrl;
                    }
                    if (result.urls && result.urls.length > 1) {
                        msg._html = '<p>生成了 ' + result.urls.length + ' 张图片：</p>';
                        msg.resultUrls = result.urls.map(function (u) {
                            var uUrl = u.url || u.b64_json || '';
                            if (u.b64_json && !u.url) uUrl = b64ToBlobUrl(u.b64_json, 'image/png') || uUrl;
                            return { url: uUrl };
                        });
                    } else {
                        msg.resultUrl = resUrl;
                        msg.meta = result;
                    }
                    if (resUrl && resUrl.startsWith('blob:')) msg.resultUrl = resUrl;

                    // Save to local storage
                    var saveDir = 'img/ai-image';
                    if (opts.resultType === 'video') saveDir = 'video/ai-video';
                    else if (opts.resultType === 'model') saveDir = 'models/ai-model';
                    else if (opts.resultType === 'audio') saveDir = 'audio/ai-audio';

                    var ext = opts.resultType === 'video' ? 'mp4' : (opts.resultType === 'audio' ? 'mp3' : (opts.resultType === 'model' ? 'glb' : 'png'));
                    var saveUrl = resUrl && !resUrl.startsWith('blob:') && !resUrl.startsWith('data:') ? resUrl : null;

                    function finalizeMsg(localPath) {
                        if (localPath) {
                            msg.localPath = localPath;
                            msg.resultUrl = AiStorage.fileUrl(localPath);
                            conv.files = conv.files || [];
                            conv.files.push({ path: localPath, name: localPath.split('/').pop(), type: opts.resultType || 'image' });
                        }
                        conv.messages.push(msg);
                        conv.updatedAt = Date.now();
                        saveConvs();
                        renderAll();
                        isBusy = false; sendBtn.disabled = false; chatInput.disabled = false;
                        abortCtrl = null;
                        chatInput.focus();
                    }

                    if (saveUrl) {
                        AiStorage.saveUrl(saveDir, 'generated.' + ext, saveUrl)
                            .then(function (localPath) { finalizeMsg(localPath); })
                            .catch(function () { finalizeMsg(null); });
                    } else {
                        finalizeMsg(null);
                    }
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
            chatInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && mentionDrop.style.display !== 'block') { e.preventDefault(); send(); } });

            // @ mention dropdown
            var mentionDrop = document.createElement('div');
            mentionDrop.className = 'chat-mention-dropdown';
            mentionDrop.style.display = 'none';
            container.querySelector('.chat-main').appendChild(mentionDrop);

            function getMentionRange(textarea) {
                var val = textarea.value;
                var pos = textarea.selectionStart;
                var start = val.lastIndexOf('@', pos - 1);
                if (start === -1) return null;
                var end = pos;
                // check: after @ there should be no spaces until cursor
                var afterAt = val.substring(start + 1, end);
                if (afterAt.indexOf(' ') !== -1) return null;
                return { start: start, end: end, filter: afterAt };
            }

            function renderMentionDrop(filter) {
                var conv = getCurrent();
                var files = conv ? (conv.files || []) : [];
                mentionDrop.innerHTML = '';
                var shown = 0;
                for (var i = 0; i < files.length; i++) {
                    var f = files[i];
                    var text = f.path || f.name || '';
                    if (filter && text.indexOf(filter) === -1) continue;
                    var item = document.createElement('div');
                    item.className = 'chat-mention-item';
                    var icon = document.createElement('span');
                    icon.style.cssText = 'margin-right:6px;opacity:0.5;';
                    icon.textContent = f.type === 'image' ? '🖼' : f.type === 'video' ? '🎬' : '📁';
                    item.appendChild(icon);
                    item.appendChild(document.createTextNode(text));
                    item.addEventListener('mousedown', function (ev) { ev.preventDefault(); selectMention(f); });
                    mentionDrop.appendChild(item);
                    shown++;
                }
                if (shown === 0) { mentionDrop.style.display = 'none'; return; }
                mentionDrop.style.display = 'block';
                var rect = chatInput.getBoundingClientRect();
                mentionDrop.style.top = (rect.top - 8) + 'px';
                mentionDrop.style.left = (rect.left + 40) + 'px';
            }

            function selectMention(file) {
                var range = getMentionRange(chatInput);
                if (!range) return;
                var val = chatInput.value;
                chatInput.value = val.substring(0, range.start) + file.path + ' ' + val.substring(range.end);
                chatInput.selectionEnd = range.start + file.path.length + 1;
                mentionDrop.style.display = 'none';
                chatInput.focus();
            }

            chatInput.addEventListener('input', function () {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
                var range = getMentionRange(chatInput);
                if (range) renderMentionDrop(range.filter);
                else mentionDrop.style.display = 'none';
            });

            chatInput.addEventListener('keydown', function (e) {
                if (mentionDrop.style.display === 'block') {
                    if (e.key === 'Escape') { mentionDrop.style.display = 'none'; e.preventDefault(); return; }
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        var items = mentionDrop.querySelectorAll('.chat-mention-item');
                        if (items.length === 0) return;
                        var active = mentionDrop.querySelector('.chat-mention-item.active');
                        var idx = -1;
                        for (var k = 0; k < items.length; k++) { if (items[k] === active) { idx = k; break; } }
                        if (e.key === 'ArrowDown') idx = (idx + 1) % items.length;
                        else idx = idx <= 0 ? items.length - 1 : idx - 1;
                        if (active) active.classList.remove('active');
                        items[idx].classList.add('active');
                        return;
                    }
                    if (e.key === 'Enter') {
                        var sel = mentionDrop.querySelector('.chat-mention-item.active');
                        if (sel) { e.preventDefault(); sel.click(); return; }
                    }
                }
            });

            document.addEventListener('click', function (e) {
                if (!mentionDrop.contains(e.target) && e.target !== chatInput) {
                    mentionDrop.style.display = 'none';
                }
            });
            newBtn.addEventListener('click', function () { if (isBusy && !confirm('正在生成，确认新建？')) return; if (abortCtrl) abortCtrl.abort(); isBusy = false; sendBtn.disabled = false; chatInput.disabled = false; createConv(); });
            document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isBusy && abortCtrl) { abortCtrl.abort(); notify('已取消', 'warning'); } });

            if (uploadBtn && fileInput) {
                uploadBtn.addEventListener('click', function () { fileInput.click(); });
                fileInput.addEventListener('change', function () {
                    var files = fileInput.files;
                    if (!files || files.length === 0) return;
                    for (var fi = 0; fi < files.length; fi++) {
                        (function (file) {
                            var reader = new FileReader();
                            reader.onload = function () {
                                var base64 = reader.result.split(',')[1];
                                var dir = opts.resultType === 'video' ? 'img/ai-video' : (opts.resultType === 'model' ? 'img/ai-model' : (opts.resultType === 'audio' ? 'img/ai-audio' : 'img/ai-image'));
                                AiStorage.saveFile(dir, AiStorage.sanitizeFilename(file.name), base64)
                                    .then(function (path) {
                                        chatInput.value = chatInput.value + ' @' + path + ' ';
                                        var conv = getCurrent();
                                        if (conv) {
                                            conv.files = conv.files || [];
                                            conv.files.push({ path: path, name: file.name, type: file.type.startsWith('image') ? 'image' : 'file' });
                                            saveConvs();
                                        }
                                        notify('已上传: ' + file.name, 'success');
                                    })
                                    .catch(function (err) {
                                        notify('上传失败: ' + (err.message || 'unknown'), 'error');
                                    });
                            };
                            reader.readAsDataURL(file);
                        })(files[fi]);
                    }
                    fileInput.value = '';
                });
            }

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
