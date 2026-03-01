# Roxami Studio

Roxami Studio 是一个基于静态网站的网页工具平台，提供 3D 模型转换工具。应用采用模块化设计，支持轻松扩展新工具。

## 功能特性

- **工具切换器**: 点击侧边栏项目在不同工具间切换
- **3D 模型转换器**: 将 GLB 格式模型文件转换为 OBJ/glTF 格式，支持纹理提取和 3D 预览
- **主题切换**: 深色/浅色主题，支持状态持久化
- **响应式设计**: 支持桌面和移动设备
- **本地处理**: 所有文件处理均在浏览器中完成，数据不发送到服务器

## 技术栈

- **前端**: 纯 HTML5、CSS3 和原生 JavaScript（无框架）
- **样式**: 自定义 CSS 使用 CSS 变量实现主题化
- **图标**: Font Awesome 6.4.0（通过 CDN）
- **字体**: Google Fonts（Inter）
- **构建**: 无需构建 - 纯静态文件
- **部署**: 可部署到任何静态托管服务（GitHub Pages、Netlify 等）

## 项目结构

```
RoxamiStudio/
├── index.html          # 主 HTML 页面
├── wwwroot/                 # 主要网页内容
│   ├── css/
│   │   └── style.css       # 所有 CSS 样式
│   ├── js/
│   │   └── app.js          # 主 JavaScript 应用程序
│   └── images/
│       └── favicon.ico     # 网站图标
├── RoxamiStudio.sln        # Visual Studio 解决方案文件（空）
└── CLAUDE.md               # Claude Code Assistant 指令
```

## 快速开始

### 本地开发

1. 直接在浏览器中打开 `index.html`，或
2. 在项目根目录中使用本地 HTTP 服务器（例如 `python -m http.server`）

### 部署

这是一个静态网站 - 无需构建过程。只需将项目根目录部署到任何静态托管服务（需包含 index.html 和 wwwroot 目录）：

- **GitHub Pages**: 推送到 `gh-pages` 分支或在主分支启用 Pages
- **Netlify**: 拖放 `wwwroot` 文件夹
- **Vercel**: 导入 Git 仓库
- **Azure Static Web Apps**: 通过 Azure 门户部署

## 开发指南

### 添加新工具

1. 在 `index.html` 中添加工具条目：
   - 向 `.tool-list` 添加 `.tool-item` 元素，设置 `data-tool="工具名称"`
   - 添加 `.tool-placeholder` div，设置对应的 `id="工具名称"`

2. 在 `app.js` 中实现工具功能：
   - 创建初始化函数 `initToolName()`
   - 在 DOMContentLoaded 事件处理器中添加函数调用
   - 对于较大的工具，考虑使用 `loadToolModule()` 模式

### 样式指南

- 使用 `:root` 和 `.light-theme` 中定义的 CSS 自定义属性（变量）
- 遵循间距比例：`--spacing-xs` (0.25rem) 到 `--spacing-xxl` (3rem)
- 使用圆角比例：`--radius-sm` (4px) 到 `--radius-xl` (16px)
- 使用过渡时长：`--transition-fast` (150ms), `--transition-normal` (250ms), `--transition-slow` (350ms)

### JavaScript 架构

- 模块化方法，使用独立的初始化函数
- 通过 `showNotification(message, type)` 集中通知系统
- 使用 localStorage 实现主题和侧边栏状态持久化
- 使用事件委托处理工具切换

## 代码风格

- 使用语义化 HTML5，适当使用 ARIA 标签
- CSS 类名使用 BEM 风格（`.组件__元素--修饰符`）
- JavaScript 使用 ES6+ 语法，函数名具有描述性
- 公共函数使用 JSDoc 风格注释

## 浏览器支持

支持现代浏览器（Chrome 90+、Firefox 88+、Edge 90+）。需要支持 ES6+ 和 WebGL。

## 安全考虑

- 所有文件处理均在客户端完成，数据不发送到服务器
- 对用户输入进行验证，谨慎使用 `innerHTML`

## 性能优化

- 依赖最小化（Font Awesome 通过 CDN 加载）
- CSS 和 JavaScript 文件经过优化
- 大文件处理时显示进度提示

## 未来计划

- 添加更多 3D 相关工具（模型查看器、格式转换器）
- 支持更多 3D 文件格式（FBX、STL、PLY）
- 添加快捷键和工具设置
- 实现 PWA 功能（离线支持）

## 许可证

本项目采用 MIT 许可证 - 查看 LICENSE 文件获取详细信息