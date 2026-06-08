<div align="center">

![QR Code Generator](icons/icon128.png)

# QR Code Generator

Chrome 浏览器扩展 — 一键生成与识别二维码

[![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest_V3-green?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.1.0-brightgreen.svg)](manifest.json)

### 👉 [立即安装到 Chrome](https://chromewebstore.google.com/detail/qr-code-generator/gphnfpfmpfkgnpmhpgojhaojmlebojcn)

[English](README_EN.md) · **中文**

</div>

---

## 功能特性

- 📱 **一键生成二维码** — 自动将当前标签页 URL 转为二维码
- ✏️ **自定义文本** — 输入任意文本或 URL，实时预览二维码
- 📋 **右键菜单** — 选中文本右键即可生成二维码；右键图片即可识别其中的二维码
- 📥 **高清下载** — 导出 4 倍分辨率 PNG 图片
- 📌 **历史收藏** — 自动保存生成记录，支持置顶管理，7 天自动过期
- 🌙 **深色模式** — 支持浅色 / 深色 / 跟随系统三种主题
- 🎨 **Apple 风格 UI** — 简洁现代的界面设计
- ⚡ **零构建** — 纯 HTML / CSS / JS，无需打包工具

## 安装

### 开发者模式安装

1. 克隆本仓库
   ```bash
   git clone https://github.com/nil-pointer-panic/qrcode-dev.git
   ```
2. 在 Chrome 中打开 `chrome://extensions`
3. 开启右上角的 **开发者模式**
4. 点击 **加载已解压的扩展程序** → 选择项目文件夹

## 使用方式

### 生成二维码

- 点击浏览器工具栏图标，自动将当前页面 URL 转为二维码
- 在输入框中修改文本，二维码实时更新
- 点击下载按钮保存高清 PNG

### 右键菜单

- **选中文本 → 右键 → "为选中文本生成二维码"**：在新标签页中显示二维码，可下载或复制
- **图片上右键 → "识别图片中的二维码"**：在新标签页中识别并显示二维码内容

### 历史管理

- 生成的二维码自动保存到历史记录
- 点击历史记录可快速恢复
- 置顶常用记录，7 天后未置顶记录自动过期

## 项目结构

```
├── manifest.json        扩展清单 (Manifest V3)
├── background.js        Service Worker — 右键菜单注册
├── popup.html           主弹窗页面
├── result.html          右键菜单结果页
├── css/
│   ├── popup.css        弹窗样式（CSS 自定义属性主题系统）
│   └── result.css       结果页样式
├── js/
│   ├── popup.js         弹窗主逻辑（模块化 IIFE）
│   └── result.js        结果页逻辑（编码/解码）
├── lib/
│   ├── qrcode.min.js    二维码生成库
│   └── jsqr.js          二维码识别库
└── icons/               扩展图标（16 / 48 / 128px）
```

## 技术栈

| 技术 | 说明 |
|------|------|
| Chrome Extension MV3 | 使用 Service Worker 替代后台页面 |
| [qrcode-generator](https://github.com/nicennnnnnnlee/qrcode-generator) | 二维码编码 |
| [jsQR](https://github.com/cozmo/jsQR) | 二维码识别 |
| Vanilla HTML / CSS / JS | 无框架，无构建步骤 |

## 权限说明

| 权限 | 用途 |
|------|------|
| `activeTab` | 读取当前标签页 URL 以生成二维码 |
| `storage` | 持久化历史记录和主题偏好 |
| `contextMenus` | 注册右键菜单项 |

## 贡献

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/your-feature`)
3. 提交更改 (`git commit -m 'feat: add some feature'`)
4. 推送分支 (`git push origin feature/your-feature`)
5. 创建 Pull Request

## 许可证

[MIT](LICENSE) © 2026
