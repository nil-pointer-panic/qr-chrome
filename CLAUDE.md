# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Chrome 浏览器扩展（Manifest V3），将当前标签页 URL 或自定义文本生成二维码，支持历史收藏、置顶和下载。同时支持通过右键菜单选中文本生成二维码、识别图片中的二维码。无构建步骤，纯 HTML/CSS/JS 直接由浏览器加载。

## 开发方式

**安装：** 在 `chrome://extensions` 开启开发者模式，将项目文件夹作为"已解压的扩展程序"加载。

**无构建/打包步骤。** 编辑文件后在 Chrome 中重新加载扩展即可测试。

**无测试框架。** 通过扩展弹窗和新标签页手动测试。

## 架构

扩展有两个入口页面和一个后台 Service Worker：

### popup.html — 主弹窗

`js/popup.js` 中的单一 IIFE 包含所有弹窗逻辑，按模块对象组织：

| 模块      | 职责 |
|-----------|------|
| `Config`  | 冻结的常量对象（存储键名、二维码参数、颜色、时间配置） |
| `Toast`   | 轻量通知提示 |
| `Theme`   | 浅色/深色/自动主题切换，持久化到 `chrome.storage.local` |
| `Storage` | `chrome.storage.local` 的 Promise 封装 |
| `QR`      | 二维码 Canvas 渲染与高清 PNG 下载 |
| `History` | 记录增删查改，7 天自动过期，置顶/取消置顶，排序（置顶优先） |
| `UI`      | DOM 引用、历史列表渲染、HTML 转义、日期格式化 |
| `App`     | 入口：初始化顺序、事件绑定、初始数据加载 |

模块间通过直接引用协作（如 `Theme._apply()` 内直接调用 `QR.updateColors` + `QR.generate()`），这是刻意设计而非耦合——模块都在同一 IIFE 闭包内，通过变量名互相访问。

### result.html — 右键菜单结果页

在新标签页中打开。与 `popup.js` 的模块化风格不同，`js/result.js` 是扁平的过程式 IIFE——没有模块对象，用顶层函数组织代码（`showEncode`、`showDecode`、`createQR`、`renderModules` 等）。

`background.js` 通过 `chrome.storage.local` 的 `_ctx_action` 键传递一次性数据，`js/result.js` 读取后立即删除该键。两种模式：

- **编码模式**（`mode: 'encode'`）：将选中文本渲染为二维码，可下载和复制
- **解码模式**（`mode: 'decode'`）：加载图片 → Canvas 绘制 → `jsQR` 识别，显示结果和原图预览

### background.js — 右键菜单注册

注册两个上下文菜单项：
- 选中文本 → `qr-encode` → 生成二维码
- 图片右键 → `qr-decode` → 识别二维码

包含安全校验：仅允许 http/https/data 协议的图片源，data URL 限制 10MB。

### 模块间通信

- popup ↔ result 页面之间通过 `chrome.storage.local` 共享主题偏好（`qr_theme_preference`）
- 右键菜单操作数据通过临时键 `_ctx_action` 传递（读后即删）
- 解码结果中的 URL 仅在 `http:`/`https:` 协议下才生成"打开链接"按钮，防止 `javascript:` XSS

## 权限

`manifest.json` 声明了三个权限：`activeTab`（读取当前标签页 URL）、`storage`（持久化历史和主题）、`contextMenus`（右键菜单）。

## 第三方库

- `lib/qrcode.min.js` — [qrcode-generator](https://github.com/nicennnnnnnlee/qrcode-generator)，全局 `qrcode()` 函数，用于生成二维码
- `lib/jsqr.js` — [jsQR](https://github.com/cozmo/jsQR)，全局 `jsQR()` 函数，用于识别图片中的二维码

## 关键约定

- 所有面向用户的文案为中文（zh-CN），HTML 的 lang 为 `zh-CN`
- 历史记录 7 天自动过期（`Config.EXPIRE_DAYS`），置顶项不过期
- 弹窗宽度固定 320px，Apple 风格设计
- CSS 通过 `:root` 自定义属性（`--color-*`）管理颜色，`popup.css` 和 `result.css` 各自独立定义完整的设计 token 集（包括浅色和深色值）
- 深色模式同时支持 `@media (prefers-color-scheme: dark)` 系统偏好和 `[data-theme="dark"]` 手动覆盖，后者优先级更高
- `Theme` 模块在 浅色 → 深色 → 自动 之间循环切换，QR 渲染器根据 `Theme.current` 选择颜色
- 输入框使用 150ms 防抖触发二维码生成（`App._bindEvents` 中的 `debounceTimer`）
- `result.js` 中大图片解码时缩放至 `MAX_DECODE_SIZE`（1024px）以内，防止内存溢出

### 新增功能流程

1. 在 `Config` 中添加常量
2. 按现有模式创建新模块对象（对象字面量 + `init()` 方法 + 以 `_` 前缀标记的私有方法）
3. 在 `App.init()` 中调用新模块的 `init()`
4. 在 `App._bindEvents()` 中绑定事件
