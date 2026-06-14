var AiCore = (function () {
    'use strict';

    function loadConfig(toolKey) {
        var lsKey = 'ai-' + toolKey + '-config';
        try {
            var raw = localStorage.getItem(lsKey);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && (parsed.baseUrl || (parsed.providers && parsed.providers.length > 0))) return Promise.resolve(parsed);
            }
        } catch (e) {}

        return fetch('/settings.json', { cache: 'no-cache' })
            .then(function (r) {
                if (!r.ok) throw new Error('Not found');
                return r.json();
            })
            .then(function (cfg) {
                return cfg && cfg[toolKey] ? cfg[toolKey] : null;
            })
            .catch(function () {
                return null;
            });
    }

    function saveConfig(toolKey, config) {
        localStorage.setItem('ai-' + toolKey + '-config', JSON.stringify(config));
        try { window.dispatchEvent(new CustomEvent('ai-config-changed')); } catch (e) {}
    }

    function callApi(url, apiKey, body, opts) {
        opts = opts || {};
        var headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
        };
        return fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            signal: opts.signal || null
        }).then(function (r) {
            if (!r.ok) {
                return r.text().then(function (t) {
                    throw new Error('API error ' + r.status + ': ' + t.substring(0, 300));
                });
            }
            var ct = r.headers.get('Content-Type') || '';
            if (ct.indexOf('application/json') !== -1) return r.json();
            return r.blob().then(function (blob) {
                return URL.createObjectURL(blob);
            });
        });
    }

    function pollTask(statusUrl, apiKey, interval, onUpdate) {
        return new Promise(function (resolve, reject) {
            function check() {
                fetch(statusUrl, {
                    headers: { 'Authorization': 'Bearer ' + apiKey }
                }).then(function (r) {
                    if (!r.ok) throw new Error('Poll error ' + r.status);
                    return r.json();
                }).then(function (data) {
                    onUpdate(data);
                    if (data.status === 'completed' || data.status === 'succeeded' || data.status === 'done') {
                        resolve(data);
                    } else if (data.status === 'failed' || data.status === 'error') {
                        reject(new Error(data.error || 'Generation failed'));
                    } else {
                        setTimeout(check, interval || 3000);
                    }
                }).catch(reject);
            }
            check();
        });
    }

    function showNotification(msg, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(msg, type || 'info');
        }
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        var k = 1024;
        var sizes = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function downloadFile(url, filename) {
        var a = document.createElement('a');
        a.href = url;
        a.download = filename || '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function buildToolSettings(toolKey, listId) {
        var listEl = document.getElementById(listId);
        if (!listEl) return;

        var _config = null;
        var _editingIndex = -1;

        function save() {
            saveConfig(toolKey, _config);
            try { window.dispatchEvent(new CustomEvent('ai-config-changed')); } catch (e) {}
        }

        function render() {
            listEl.innerHTML = '';
            if (!_config || !_config.providers || _config.providers.length === 0) {
                var empty = document.createElement('div');
                empty.style.cssText = 'text-align:center;padding:var(--spacing-md);color:var(--color-text-tertiary);font-size:0.8rem;';
                empty.textContent = '暂无供应商配置';
                listEl.appendChild(empty);
                return;
            }

            for (var i = 0; i < _config.providers.length; i++) {
                (function (index) {
                    var p = _config.providers[index];
                    var isEditing = (_editingIndex === index);

                    var row = document.createElement('div');
                    row.className = 'settings-ai-provider-row';
                    if (isEditing) row.classList.add('editing');

                    var info = document.createElement('div');
                    info.className = 'settings-ai-provider-info';

                    var nameDiv = document.createElement('div');
                    nameDiv.className = 'settings-ai-provider-name';
                    nameDiv.textContent = p.name || ('供应商 ' + (index + 1));

                    info.appendChild(nameDiv);

                    var actions = document.createElement('div');
                    actions.className = 'settings-ai-provider-actions';

                    var delBtn = document.createElement('button');
                    delBtn.className = 'small-btn';
                    delBtn.style.cssText = 'font-size:0.75rem;padding:3px 8px;color:var(--color-accent-red);';
                    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    delBtn.title = '删除';
                    delBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        if (!confirm('确定删除供应商 "' + (p.name || '未命名') + '" 吗？')) return;
                        if (_editingIndex === index) _editingIndex = -1;
                        _config.providers.splice(index, 1);
                        save();
                        render();
                    });

                    actions.appendChild(delBtn);
                    row.appendChild(info);
                    row.appendChild(actions);

                    row.addEventListener('click', function () {
                        _editingIndex = (_editingIndex === index) ? -1 : index;
                        render();
                    });

                    listEl.appendChild(row);

                    if (isEditing) {
                        var panel = buildEditPanel(index);
                        listEl.appendChild(panel);
                    }
                })(i);
            }
        }

        function buildEditPanel(index) {
            var p = _config.providers[index];
            var panel = document.createElement('div');
            panel.className = 'settings-ai-edit-panel';

            // Name
            var nameRow = document.createElement('div');
            nameRow.className = 'settings-ai-edit-row';
            var nameLabel = document.createElement('span');
            nameLabel.textContent = '名称';
            var nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'settings-text-input';
            nameInput.value = p.name || '';
            nameRow.appendChild(nameLabel);
            nameRow.appendChild(nameInput);

            // Base URL
            var urlRow = document.createElement('div');
            urlRow.className = 'settings-ai-edit-row';
            var urlLabel = document.createElement('span');
            urlLabel.textContent = 'Base URL';
            var urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.className = 'settings-text-input';
            urlInput.value = p.baseUrl || '';
            urlRow.appendChild(urlLabel);
            urlRow.appendChild(urlInput);

            // API Key
            var keyRow = document.createElement('div');
            keyRow.className = 'settings-ai-edit-row';
            var keyLabel = document.createElement('span');
            keyLabel.textContent = 'API Key';
            var keyInput = document.createElement('input');
            keyInput.type = 'password';
            keyInput.className = 'settings-text-input';
            keyInput.value = p.apiKey || '';
            keyRow.appendChild(keyLabel);
            keyRow.appendChild(keyInput);

            // Models
            var modelsRow = document.createElement('div');
            modelsRow.className = 'settings-ai-edit-row';
            modelsRow.style.alignItems = 'flex-start';
            var modelsLabel = document.createElement('span');
            modelsLabel.textContent = '模型';

            var modelsBox = document.createElement('div');
            modelsBox.className = 'settings-ai-models-box';

            var modelsList = document.createElement('div');
            modelsList.className = 'settings-ai-edit-models';

            function renderModels() {
                modelsList.innerHTML = '';
                if (!p.models || p.models.length === 0) return;
                for (var mi = 0; mi < p.models.length; mi++) {
                    (function (m, modelIndex) {
                        var item = document.createElement('div');
                        item.className = 'settings-ai-model-item';

                        var idSpan = document.createElement('span');
                        idSpan.className = 'model-id';
                        idSpan.textContent = m.id;
                        idSpan.title = m.id;

                        var delBtn = document.createElement('button');
                        delBtn.className = 'settings-ai-model-del';
                        delBtn.innerHTML = '<i class="fas fa-times"></i>';
                        delBtn.addEventListener('click', function () {
                            p.models.splice(modelIndex, 1);
                            renderModels();
                        });

                        item.appendChild(idSpan);
                        item.appendChild(delBtn);
                        modelsList.appendChild(item);
                    })(p.models[mi], mi);
                }
            }
            renderModels();

            // Add model row
            var addWrap = document.createElement('div');
            addWrap.className = 'settings-ai-add-model';

            var idInput = document.createElement('input');
            idInput.type = 'text';
            idInput.className = 'settings-text-input';
            idInput.placeholder = '模型 ID';
            idInput.style.cssText = 'flex:1;min-width:0;font-size:0.8125rem;';

            var addBtn = document.createElement('button');
            addBtn.className = 'small-btn';
            addBtn.textContent = '+';
            addBtn.style.cssText = 'flex-shrink:0;font-size:0.8rem;padding:4px 10px;';
            addBtn.addEventListener('click', function () {
                var v = idInput.value.trim();
                if (!v) return;
                if (!p.models) p.models = [];
                p.models.push({ id: v, name: v });
                idInput.value = '';
                renderModels();
            });

            addWrap.appendChild(idInput);
            addWrap.appendChild(addBtn);

            modelsBox.appendChild(modelsList);
            modelsBox.appendChild(addWrap);
            modelsRow.appendChild(modelsLabel);
            modelsRow.appendChild(modelsBox);

            // Actions
            var actionRow = document.createElement('div');
            actionRow.className = 'settings-ai-edit-actions';
            actionRow.style.cssText = 'border-top:none;';

            var saveBtn = document.createElement('button');
            saveBtn.className = 'small-btn';
            saveBtn.textContent = '保存';
            saveBtn.style.cssText = 'background:var(--color-accent-blue);color:#fff;border-color:var(--color-accent-blue);';
            saveBtn.addEventListener('click', function () {
                p.name = nameInput.value.trim();
                p.baseUrl = urlInput.value.trim();
                p.apiKey = keyInput.value.trim();
                save();
                _editingIndex = -1;
                render();
                showNotification('配置已保存', 'success');
            });

            var cancelBtn = document.createElement('button');
            cancelBtn.className = 'small-btn';
            cancelBtn.textContent = '取消';
            cancelBtn.addEventListener('click', function () {
                _editingIndex = -1;
                render();
            });

            actionRow.appendChild(saveBtn);
            actionRow.appendChild(cancelBtn);

            panel.appendChild(nameRow);
            panel.appendChild(urlRow);
            panel.appendChild(keyRow);
            panel.appendChild(modelsRow);
            panel.appendChild(actionRow);
            return panel;
        }

        // Load: support both new {providers:[]} and legacy {baseUrl,apiKey,models}
        loadConfig(toolKey).then(function (cfg) {
            if (!cfg) {
                _config = { providers: [] };
            } else if (cfg.providers) {
                _config = cfg;
            } else if (cfg.baseUrl !== undefined) {
                // migrate legacy single-config to providers array
                _config = { providers: cfg.baseUrl ? [{ name: cfg.baseUrl, baseUrl: cfg.baseUrl, apiKey: cfg.apiKey || '', models: cfg.models || [] }] : [] };
            } else {
                _config = { providers: [] };
            }
            render();
        });

        // Add new provider button (appended after list by app.js)
        var addNewBtn = document.getElementById(listId + '-add-btn');
        if (addNewBtn) {
            addNewBtn.addEventListener('click', function () {
                _editingIndex = -1;
                _config.providers.push({ name: '新供应商', baseUrl: '', apiKey: '', models: [] });
                save();
                _editingIndex = _config.providers.length - 1;
                render();
            });
        }
    }

    return {
        loadConfig: loadConfig,
        saveConfig: saveConfig,
        callApi: callApi,
        pollTask: pollTask,
        showNotification: showNotification,
        formatBytes: formatBytes,
        downloadFile: downloadFile,
        buildToolSettings: buildToolSettings
    };
})();
