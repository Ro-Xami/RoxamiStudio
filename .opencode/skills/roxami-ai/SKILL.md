---
name: roxami-ai
description: Use when working on RoxamiStudio AI functionality - AI Chat, AI Image, AI Video, AI Model, AI Audio, ai-chat.js, ai-core.js, ai-gen-chat.js, ai-storage.js, OpenRouter API integration, chat layout, config bar, settings panel, multi-provider editing, @ mention file selector, file upload. Covers architecture, conventions, CSS design system, data flow, and common modification patterns for all 5 AI tools.
---

# RoxamiStudio AI 功能知识库

## 一、架构总览

### 文件清单

| 文件 | 行数 | 职责 |
|------|------|------|
| `wwwroot/js/tools/ai-chat.js` | ~900 | AI 对话核心：流式聊天、对话管理、供应商/模型切换 |
| `wwwroot/js/lib/ai-gen-chat.js` | ~600 | 4 个生成工具共享框架：对话 UI、API 调用、结果渲染、@ 选择器 |
| `wwwroot/js/lib/ai-core.js` | ~370 | 配置加载/保存、API 调用、异步轮询、设置面板 UI 构建 |
| `wwwroot/js/lib/ai-storage.js` | ~50 | 文件本地存储：saveFile/saveUrl/saveBlob |
| `wwwroot/js/tools/ai-image.js` | ~12 | AI 图片工具配置 |
| `wwwroot/js/tools/ai-video.js` | ~14 | AI 视频工具配置 |
| `wwwroot/js/tools/ai-model.js` | ~11 | AI 模型工具配置 |
| `wwwroot/js/tools/ai-audio.js` | ~14 | AI 音频工具配置 |
| `Program.cs` | ~1140 | .NET HTTP 服务器：静态文件服务、API 端点 |
| `index.html` | ~1420 | 所有 HTML 结构 |
| `wwwroot/css/style.css` | ~3380 | 全部样式 |
| `settings.json` | ~30 | 运行时配置 |
| `settings.example.json` | ~40 | 配置模板 |

### 依赖关系

```
ai-image.js ──┐
ai-video.js ──┤
ai-model.js ──┼──→ ai-gen-chat.js ──→ ai-core.js ──→ settings.json
ai-audio.js ──┘                              └──→ localStorage
                                             └──→ /api/save-file (Program.cs)
ai-chat.js ──────→ ai-core.js
              └──→ ai-storage.js ──→ /api/save-file (Program.cs)
```

### Script 加载顺序 (index.html)

```
ai-core.js → ai-storage.js → ai-gen-chat.js → ai-image.js → ai-video.js → ai-model.js → ai-audio.js → ai-chat.js → app.js
```

---

## 二、共享库 API

### ai-core.js

```javascript
// 配置加载（localStorage 优先，回退 settings.json）
AiCore.loadConfig(toolKey) → Promise<config|null>

// 配置保存到 localStorage
AiCore.saveConfig(toolKey, config)

// 生成式 API 调用（POST JSON，自动 Bearer Auth）
AiCore.callApi(url, apiKey, body, opts{signal}) → Promise<data|blobUrl>

// 异步任务轮询
AiCore.pollTask(statusUrl, apiKey, intervalMs, onUpdate) → Promise<finalData>

// 设置面板 UI 构建（多供应商编辑列表，和 AI 对话 UI 完全对齐）
AiCore.buildToolSettings(toolKey, listContainerId)

// 文件下载
AiCore.downloadFile(url, filename)

// 通知
AiCore.showNotification(msg, type)

// 字节格式化
AiCore.formatBytes(bytes)
```

**配置格式**（settings.json / localStorage）：
```json
{
  "aiImage": {
    "providers": [
      {
        "name": "OpenAI",
        "baseUrl": "https://api.openai.com/v1",
        "apiKey": "sk-xxx",
        "models": [
          { "id": "dall-e-3", "name": "DALL-E 3" }
        ]
      }
    ]
  }
}
```
- loadConfig 兼容旧单配置格式 `{ baseUrl, apiKey, models }`，自动迁移为 `{ providers: [...] }`
- loadConfig 的 localStorage key 为 `ai-{toolKey}-config`

### ai-gen-chat.js

```javascript
AiGenChat.init(opts)
```

opts 结构：
```javascript
{
  toolId: 'ai-image',          // HTML 中的 id
  configKey: 'aiImage',        // settings.json 中的 key
  resultType: 'image',         // image|video|model|audio
  endpoint: '/images/generations',  // API 路径
  placeholder: '描述...',      // 输入框占位文字
  extraControls: [             // 配置栏额外控件
    { id: 'size', label: '尺寸', type: 'select', options: ['1024x1024', ...] },
    { id: 'count', label: '数量', type: 'number', value: 1, min: 1, max: 4 }
  ],
  buildBody: function(prompt, model, ctrlVals) { ... }  // 构造 API body
}
```

init() 内部自动：
- 设置 `.tool-container` 为 flex 列布局（display:flex; flex-direction:column; overflow:hidden; padding:0）
- 加载配置 → 渲染供应商/模型选择器 → 渲染对话历史 → 设置事件监听
- 生成完成后自动保存到本地 output/ 目录

### ai-storage.js

```javascript
// 保存 base64 文件到本地
AiStorage.saveFile(dir, filename, base64data) → Promise<localPath>

// 保存 blob 到本地
AiStorage.saveBlob(dir, filename, blob) → Promise<localPath>

// 下载远程 URL 并保存到本地
AiStorage.saveUrl(dir, filename, remoteUrl) → Promise<localPath>

// 本地路径转 URL（/output/img/xxx.png）
AiStorage.fileUrl(localPath) → urlString

// 清理文件名
AiStorage.sanitizeFilename(name) → safeName
```

后端 API：`POST /api/save-file` → `{ path, data: base64 }` → 存入 `{BaseDir}/output/{path}`

---

## 三、HTML 结构规范

### AI 对话工具

```html
<div class="tool-placeholder active" id="ai-chat" data-core="true">
  <div class="chat-tool-ui" style="padding:4px">
    <div class="chat-layout" id="ai-chat-layout">
      <!-- 左侧历史列表 -->
      <div class="chat-sidebar">
        <div class="chat-sidebar-header">
          <button class="small-btn" id="ai-chat-new-btn">新对话</button>
        </div>
        <div class="chat-history-list" id="ai-chat-history-list"></div>
      </div>
      <!-- 右侧主区域 -->
      <div class="chat-main">
        <div class="chat-messages" id="ai-chat-messages">
          <button class="scroll-bottom-btn">回到底部</button>
        </div>
        <div class="chat-input-area">
          <button class="small-btn chat-upload-btn">📎</button>
          <input type="file" style="display:none" multiple>
          <textarea id="ai-chat-input"></textarea>
          <button class="small-btn" id="ai-chat-send-btn">➤</button>
        </div>
        <!-- 配置栏（模型+供应商选择器） -->
        <div class="chat-config-bar">
          <select class="chat-config-select" id="ai-chat-provider-select"></select>
          <select class="chat-config-select" id="ai-chat-model-select"></select>
        </div>
      </div>
    </div>
    <!-- 未配置时的引导提示 -->
    <div class="chat-setup-prompt" id="ai-chat-setup" style="display:none">...</div>
  </div>
</div>
```

### 生成工具

与 AI 对话结构相同，差异：
- 无独立 ID（用 class 选择器：`.chat-input`、`.chat-send-btn`、`.chat-new-btn`）
- 配置栏动态生成（供应商 + 模型 + 额外控件）
- chat-layout 的 id 格式为 `{toolId}-layout`

### CSS 关键类

| 类 | 作用 | 关键属性 |
|------|------|---------|
| `.tool-placeholder` | 工具面板外壳 | `display:none` → `.active` 时 `display:flex !important; flex:1; min-height:0; overflow:hidden` |
| `.tool-container` | 所有工具容器 | `flex:1; min-height:0; padding:var(--spacing-xl); overflow-y:auto` → AI 工具激活时 JS 覆盖为 `display:flex; flex-direction:column; overflow:hidden; padding:0` |
| `.chat-tool-ui` | 对话 UI 包装 | `flex:1; min-height:0; padding:4px` |
| `.chat-layout` | 侧边栏+主区 | `display:flex; flex:1; min-height:0; border-radius:var(--radius-lg); overflow:hidden; background:var(--color-bg-card)` |
| `.chat-sidebar` | 对话列表 | `width:240px; flex-shrink:0; background:var(--color-bg-secondary)` |
| `.chat-main` | 右侧主区 | `flex:1; min-height:0; flex-direction:column` |
| `.chat-messages` | 消息滚动区 | `flex:1; min-height:0; overflow-y:auto; padding:var(--spacing-lg)` |
| `.chat-input-area` | 输入框行 | `flex-shrink:0; border-top; background:var(--color-bg-secondary)` |
| `.chat-config-bar` | 配置栏 | `flex-shrink:0; border-top; min-height:34px; gap:var(--spacing-sm)` |
| `.chat-config-select` | 下拉框 | `bg-tertiary; radius-sm; font:0.75rem; focus: box-shadow 0 0 0 2px` |
| `.chat-config-number` | 数字输入 | `width:52px; text-align:center` |
| `.chat-config-label` | 控件标签 | `font-size:0.72rem; color:var(--color-text-tertiary)` |

---

## 四、CSS 设计系统

### 变量体系

```css
/* 颜色 */
--color-bg-primary: #0f172a    /* 页面背景 */
--color-bg-secondary: #1e293b   /* 面板/侧边栏/头部 */
--color-bg-tertiary: #334155    /* 输入框/下拉框背景 */
--color-bg-card: #1e293b        /* 卡片背景 */
--color-text-primary: #f1f5f9   /* 标题 */
--color-text-secondary: #cbd5e1 /* 正文 */
--color-text-tertiary: #94a3b8  /* 次要文字 */
--color-border: #475569         /* 边框 */
--color-hover: #334155          /* 悬浮 */
--color-active: #3b82f6         /* 激活/焦点 */

/* 间距 */
--spacing-xs: 0.25rem (4px)
--spacing-sm: 0.5rem  (8px)
--spacing-md: 1rem    (16px)
--spacing-lg: 1.5rem  (24px)
--spacing-xl: 2rem    (32px)

/* 圆角 */
--radius-sm: 4px   /* 按钮/输入框 */
--radius-md: 8px   /* 卡片/列表项 */
--radius-lg: 12px  /* 面板/上传区 */

/* 过渡 */
--transition-fast: 150ms ease
--transition-normal: 250ms ease
```

### 标准 Hover 模式

```css
element {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
  transition: all var(--transition-fast);
}
element:hover {
  background: var(--color-hover);
  color: var(--color-text-primary);
  border-color: var(--color-active);
}
```

### 标准 Focus 环

```css
element:focus {
  outline: none;
  border-color: var(--color-active);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
```

### 关键字号

| 用途 | 值 |
|------|-----|
| 工具标题 h2 | 1.75rem |
| 面板标题 h3 | 1.125rem |
| 设置组 h4 (ALL CAPS) | 0.8rem |
| 正文/输入框 | 0.875rem |
| 小按钮 .small-btn | 0.8125rem |
| 侧边栏名称 | 0.9375rem |
| 侧边栏描述 | 0.8125rem |
| 设置行标签 | 0.9rem |

### 按钮体系

- **`.small-btn`**：通用小按钮。`padding:--spacing-sm --spacing-md; radius-sm; font:0.8125rem; bg-secondary`，hover 时 `bg-hover; color-primary; border-active`
- **`.action-btn`**：工具栏方形按钮。`36×36; radius-md; bg-tertiary`
- **保存按钮**：蓝色填充。`background:var(--color-accent-blue); color:#fff; border-color:var(--color-accent-blue)`

---

## 五、设置面板规范

### AI 对话设置（app.js initSettingsPanel）

- 使用 `renderProviderList()` 渲染供应商列表
- 每行：供应商名称 + 垃圾桶删除按钮（`.small-btn`）
- 点击行 → 切换编辑面板（`.settings-ai-edit-panel`）
- 编辑面板：名称 / Base URL / API Key / 模型列表 + 添加模型 + 保存/取消
- 「+ 添加供应商」按钮在列表下方

### 生成工具设置（ai-core.js buildToolSettings）

- 完全复用 AI 对话的设置面板逻辑
- 在 app.js 中调用：`AiCore.buildToolSettings('aiImage', 'settings-aiimage-list')`
- HTML 需要：`<div class="settings-ai-list" id="settings-aiimage-list"></div>` + 添加按钮 `id="settings-aiimage-list-add-btn"`
- 自动处理 "添加供应商" 按钮的 click 事件

### 设置区 HTML 模板

```html
<div class="settings-group" id="settings-group-ai-image">
  <h4>AI 图片</h4>
  <div class="settings-ai-list" id="settings-aiimage-list"></div>
  <div class="settings-row" style="padding:0;">
    <button class="small-btn" id="settings-aiimage-list-add-btn" style="font-size:0.75rem;">
      <i class="fas fa-plus"></i> 添加供应商
    </button>
  </div>
</div>
```

---

## 六、数据流

### 配置加载流程

```
工具 init()
  → AiCore.loadConfig(toolKey)
    → localStorage('ai-{toolKey}-config') 优先
    → 无 → fetch('/settings.json') → cfg[toolKey]
    → 兼容旧格式自动迁移
  → 渲染供应商/模型选择器
  → 渲染对话列表
  → 设置事件监听
```

### 设置面板保存流程

```
用户编辑 → 点击保存
  → buildToolSettings 内部 save()
    → AiCore.saveConfig(toolKey, config)
      → localStorage.setItem('ai-{toolKey}-config', JSON)
      → dispatchEvent(new CustomEvent('ai-config-changed'))
  → ai-gen-chat.js / ai-chat.js 监听事件
    → 重新 loadConfig → 刷新配置栏
```

### 对话存储

- AI 对话：localStorage key `ai-chat-conversations`
- 生成工具：localStorage key `aigen-{toolId}-convs`

### 文件存储流程

```
上传文件：
  FileReader.readAsDataURL → AiStorage.saveFile(dir, name, base64)
    → POST /api/save-file { path, data }
    → Program.cs HandleSaveFile → File.WriteAllBytes
    → 返回本地路径 → 更新 conv.files[]

生成结果：
  fetch(remoteUrl) → response.blob → AiStorage.saveUrl(dir, name, url)
    → POST /api/save-file
    → msg.localPath = localPath → msg.resultUrl = AiStorage.fileUrl(localPath)

文件引用：
  conv.files = [{ path, name, type }]
  @ 选择器从 conv.files 读取
```

---

## 七、后端 API 端点（Program.cs）

| 端点 | 方法 | 用途 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/restart` | GET | 重启服务 |
| `/api/version` | GET | 版本号 |
| `/api/settings/load` | GET | 加载 settings.json |
| `/api/settings/save` | POST | 保存 settings.json |
| `/api/conversations/load` | GET | 加载对话 |
| `/api/conversations/save` | POST | 保存对话 |
| `/api/update/check` | GET | 检查更新 |
| `/api/update/download` | GET | 下载更新（SSE） |
| `/api/update/install` | POST | 安装更新 |
| `/api/save-file` | POST | 保存文件到 output/ |

### `/api/save-file` 请求格式

```json
{ "path": "img/ai-image/20260614_cat.png", "data": "base64..." }
```

响应：
```json
{ "ok": true, "path": "img/ai-image/20260614_cat.png", "size": 12345 }
```

### 编译器注意事项
- `System.Text.Json.JsonSerializer` with `PropertyNameCaseInsensitive = true`
- `ImplicitUsings` = disable，需要显式 using
- 使用 `System.Text.Json.Serialization` 命名空间

---

## 八、常见修改模式

### 添加新 AI 工具

1. **创建工具 JS**：`wwwroot/js/tools/ai-xxx.js`（~12行，调用 `AiGenChat.init(opts)`）
2. **settings.json**：加 `"aiXxx": { "providers": [] }` 配置段
3. **settings.example.json**：加模板配置
4. **index.html**：
   - 侧边栏：`<div class="tool-item" data-tool="ai-xxx">` 
   - 工具面板：复制 AI Image 的 chat-layout 结构，改 id 和 placeholder
   - 设置区：`<div class="settings-ai-list" id="settings-aixxx-list">` + 添加按钮
   - 脚本标签：`<script src="wwwroot/js/tools/ai-xxx.js">`
5. **app.js**：
   - `initAiXxx()` 调用
   - 翻译条目（zh 对象 + applyTranslations + updateCurrentToolName）
   - `AiCore.buildToolSettings('aiXxx', 'settings-aixxx-list')` 调用
6. **style.css**：`#ai-xxx.tool-placeholder` 和 `#ai-xxx.tool-placeholder.active` 的 flex 规则

### 修改工具样式

- 全局工具布局：`#ai-xxx.tool-placeholder` + `#ai-xxx.tool-placeholder.active`（flex 列布局）
- 对话界面：`.chat-layout`、`.chat-sidebar`、`.chat-main`、`.chat-messages`
- 输入区：`.chat-input-area`、`.chat-input-area textarea`
- 配置栏：`.chat-config-bar`、`.chat-config-select`、`.chat-config-number`、`.chat-config-label`
- 消息气泡：`.chat-bubble`、`.chat-bubble-user`、`.chat-bubble-assistant`、`.chat-bubble-content`
- 滚动按钮：`.scroll-bottom-btn` → `.visible`
- @ 选择器：`.chat-mention-dropdown`、`.chat-mention-item`

### 修改设置面板

- 供应商行：`.settings-ai-provider-row`（grid: 1fr auto）
- 编辑面板：`.settings-ai-edit-panel`
- 编辑行：`.settings-ai-edit-row`（label 70px + input flex:1）
- 模型条目：`.settings-ai-model-item`
- 模型框：`.settings-ai-models-box`
- 代码在 `ai-core.js buildToolSettings()` 和 `app.js` 中
- AI 对话专用的在 `app.js renderProviderList()` / `buildEditPanel()`

### 添加新 API 端点（Program.cs）

1. 在 `HandleClient` 中添加路由判断
2. 添加处理方法 `static void HandleXxx(NetworkStream stream, string body)`
3. 使用 `Send(stream, code, json, contentType)` 返回响应
4. POST 请求的 body 在 `HandleClient` 中已解析

---

## 九、调试技巧

- 查看 AI 工具布局：在控制台运行 `wwwroot/js/debug-gen-layout.js`
- 查看 chat 布局：参考之前的 debug-chat-layout.js 模式
- 检查 CSS 是否生效：`window.getComputedStyle(element)`
- 检查 flex 链：逐层查看 `display`, `flex`, `height`, `min-height`, `overflow`
- 常见问题：`.tool-container` 不在 flex 链中 → 检查 HTML div 闭合
- 常见问题：`height:100%` 不生效 → 使用 `flex:1; min-height:0` 替代
