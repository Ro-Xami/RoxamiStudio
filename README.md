# Roxami Studio

Roxami Studio 是一个基于静态网站的网页工具集平台，提供 3D 模型转换、AI 去背景、视频帧提取、图片处理等实用工具。所有文件处理均在浏览器本地完成，数据不会发送到服务器。

## 工具列表

| 工具 | 图标 | 描述 |
|------|------|------|
| **蓝图节点** | <i class="fas fa-project-diagram"></i> | 可视化节点编辑器，用节点流程处理素材 |
| **3D 模型转换器** | <i class="fas fa-cube"></i> | 将 GLB 转换为 OBJ 格式，支持纹理提取和 3D 预览 |
| **视频帧提取器** | <i class="fas fa-video"></i> | 从视频提取序列帧，支持自定义 FPS 和透明通道 |
| **文件重命名工具** | <i class="fas fa-file-signature"></i> | 批量重命名文件，支持按名称/时间排序、自定义前缀和编号格式 |
| **序列图集工具** | <i class="fas fa-th"></i> | 合并多张序列图为图集，或拆分图集为序列图 |
| **图片翻转工具** | <i class="fas fa-arrows-alt-h"></i> | 水平/垂直翻转图片，支持旋转 |
| **完美像素** | <i class="fas fa-th"></i> | 像素图精炼与网格重采样 |
| **AI 去背景** | <i class="fas fa-user-slash"></i> | 基于 ONNX Runtime 的智能背景移除 |

## 功能特性

- **工具切换器**: 点击侧边栏在各工具间切换
- **深色/浅色主题**: 主题切换，状态通过 localStorage 持久化
- **中英双语**: 界面语言切换，支持中文和英文
- **侧边栏折叠**: 可折叠侧边栏以最大化工作区域
- **响应式设计**: 自适应桌面和移动设备
- **本地处理**: 所有文件处理在浏览器中完成，保障隐私安全
- **一键启动**: 提供 Windows 可执行文件（exe）和批处理脚本（bat）

## 快速开始

### Windows 一键启动（推荐）

双击项目根目录下的 **`RoxamiStudio.exe`**，程序将自动启动本地 HTTP 服务器并在默认浏览器中打开。

> 需要已安装 [Node.js](https://nodejs.org)（用于运行 http-server）。

### 批处理启动

双击 `start.bat`，效果同上。

### 手动启动

```bash
# 使用 npx（需要 Node.js）
npx http-server . -p 8080 -c-1

# 或使用 Python
python -m http.server 8080
```

然后访问 `http://localhost:8080`。

### 部署

纯静态网站，无需构建过程，可将项目根目录部署到任何静态托管服务：

- **GitHub Pages**: 推送到仓库并启用 Pages
- **Netlify**: 拖放项目文件夹
- **Vercel**: 导入 Git 仓库
- **其他**: 任何支持静态文件的 Web 服务器

## 项目结构

```
RoxamiStudio/
├── index.html                # 主页面
├── RoxamiStudio.exe          # Windows 启动器（双击运行）
├── start.bat                 # 批处理启动脚本
├── Program.cs                # 启动器源代码（C#）
├── RoxamiStudio.csproj       # .NET 项目文件
├── RoxamiStudio.sln          # Visual Studio 解决方案
├── ico/                      # 应用图标
│   ├── roxami_icon.jpeg      # 原始图标（2048x2048）
│   └── roxami_icon.ico       # ICO 格式（多尺寸）
├── BlueprintTemplate/        # 蓝图模板
│   └── AI视频转完美像素动画.json
├── wwwroot/                  # Web 前端资源
│   ├── css/
│   │   └── style.css         # 所有 CSS 样式
│   ├── js/
│   │   ├── app.js            # 核心应用逻辑（路由/主题/语言/i18n）
│   │   └── tools/            # 工具模块
│   │       ├── blueprint.js           # 蓝图节点编辑器
│   │       ├── 3d-converter.js        # 3D 模型转换器
│   │       ├── video-frame-extractor.js # 视频帧提取器
│   │       ├── file-renamer.js        # 文件重命名工具
│   │       ├── sprite-sheet-tool.js   # 序列图集工具
│   │       ├── image-flipper.js       # 图片翻转工具
│   │       ├── perfect-pixel.js       # 完美像素
│   │       └── bg-remover.js          # AI 去背景
│   ├── images/
│   │   └── favicon.ico       # 网站图标
│   └── lib/
│       └── bg-removal/       # AI 去背景模型文件
└── CLAUDE.md                 # AI 助手配置
```

## 技术栈

- **前端**: 纯 HTML5、CSS3、原生 JavaScript（ES6+），无框架
- **3D 渲染**: Three.js r128（GLTFLoader）
- **AI 推理**: ONNX Runtime Web（背景移除）
- **图标**: Font Awesome 6.4.0（CDN）
- **字体**: Google Fonts（Inter）
- **启动器**: .NET Framework（C#）
- **本地服务**: http-server（Node.js）

## 开发指南

### 添加新工具

1. 在 `index.html` 中添加工具入口：
   - 向 `.tool-list` 添加 `.tool-item`，设置 `data-tool="工具名称"`
   - 添加 `.tool-placeholder` div，设置 `id="工具名称"`

2. 在 `wwwroot/js/tools/` 创建工具模块：
   - 创建 `工具名称.js`
   - 实现初始化函数 `initXxx()`

3. 在 `index.html` 中引入模块（`app.js` 之前）

4. 在 `app.js` 的 `DOMContentLoaded` 中添加 `initXxx()` 调用

5. 在 `app.js` 的 `translations` 对象中添加中英文文本

### 样式规范

- 使用 `:root` 和 `.light-theme` 中的 CSS 变量
- 间距：`--spacing-xs` (0.25rem) → `--spacing-xxl` (3rem)
- 圆角：`--radius-sm` (4px) → `--radius-xl` (16px)
- 过渡：`--transition-fast` (150ms) / `--transition-normal` (250ms) / `--transition-slow` (350ms)

### 构建启动器

如需重新编译 `RoxamiStudio.exe`：

```powershell
# 使用 .NET SDK
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true
```

## 浏览器支持

Chrome 90+ / Firefox 88+ / Edge 90+（需支持 ES6+、WebGL、HTML5 Video/Canvas API）

## 许可证

MIT License
