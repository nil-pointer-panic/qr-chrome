/**
 * QR Code Generator — Popup Script
 *
 * Modular architecture:
 *   Config    — centralized constants & design tokens
 *   Toast     — lightweight notification
 *   Storage   — chrome.storage wrapper
 *   QR        — QR code rendering & download
 *   History   — record management
 *   UI        — DOM manipulation & event delegation
 *   App       — entry point, wires modules together
 */
(function () {
  'use strict';

  // ==================== Config ====================

  const Config = Object.freeze({
    // Storage
    STORAGE_KEY: 'qr_custom_history',
    THEME_KEY: 'qr_theme_preference',
    EXPIRE_DAYS: 7,

    // QR rendering
    QR_CANVAS_MAX: 200,
    QR_MARGIN: 12,
    QR_EMPTY_SIZE: 180,
    QR_ERROR_LEVEL: 'M',
    QR_DOWNLOAD_SCALE: 4,

    // QR colors (light mode defaults)
    QR_COLOR_BG: '#ffffff',
    QR_COLOR_DARK: '#1d1d1f',
    QR_EMPTY_COLOR_BG: '#f5f5f7',
    QR_EMPTY_COLOR_LINE: '#d2d2d7',
    QR_EMPTY_COLOR_TEXT: '#86868b',

    // QR colors (dark mode)
    QR_COLOR_BG_DARK: '#ffffff',
    QR_COLOR_DARK_DARK: '#1d1d1f',
    QR_EMPTY_COLOR_BG_DARK: '#2c2c2e',
    QR_EMPTY_COLOR_LINE_DARK: '#3a3a3c',
    QR_EMPTY_COLOR_TEXT_DARK: '#6c6c70',

    // Toast
    TOAST_DURATION: 1500,
  });

  // ==================== Toast ====================

  const Toast = {
    el: null,
    timer: null,

    init() {
      this.el = document.getElementById('toast');
    },

    show(message) {
      clearTimeout(this.timer);
      this.el.textContent = message;
      this.el.classList.add('show');
      this.timer = setTimeout(() => this.el.classList.remove('show'), Config.TOAST_DURATION);
    },
  };

  // ==================== Theme ====================

  const Theme = {
    current: 'light',

    async init() {
      const saved = await this._getSaved();
      this.current = saved || 'auto';
      this._apply(this.current);
    },

    toggle() {
      const modes = ['light', 'dark', 'auto'];
      const currentIndex = modes.indexOf(this.current);
      const next = modes[(currentIndex + 1) % modes.length];
      this.current = next;
      this._apply(next);
      this._save(next);
      return next;
    },

    _apply(mode) {
      const doc = document.documentElement;
      doc.removeAttribute('data-theme');

      if (mode === 'dark') {
        doc.setAttribute('data-theme', 'dark');
      } else if (mode === 'light') {
        doc.setAttribute('data-theme', 'light');
      }
      // auto: rely on CSS media query, no data-theme needed

      // Redraw QR with appropriate colors (if QR is initialized)
      if (QR.canvas) {
        QR.updateColors(mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches));
        QR.generate(QR.currentText);
      }
    },

    _getSaved() {
      return new Promise((resolve) => {
        chrome.storage.local.get(Config.THEME_KEY, (result) => {
          resolve(result[Config.THEME_KEY] || 'auto');
        });
      });
    },

    _save(mode) {
      chrome.storage.local.set({ [Config.THEME_KEY]: mode }, () => {
        if (chrome.runtime.lastError) console.warn('Failed to save theme:', chrome.runtime.lastError);
      });
    },
  };

  // ==================== Storage ====================

  const Storage = {
    get() {
      return new Promise((resolve) => {
        chrome.storage.local.get(Config.STORAGE_KEY, (result) => {
          resolve(result[Config.STORAGE_KEY] || []);
        });
      });
    },

    set(list) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [Config.STORAGE_KEY]: list }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    },
  };

  // ==================== QR Renderer ====================

  const QR = {
    canvas: null,
    ctx: null,
    currentText: '',
    colors: {
      bg: Config.QR_COLOR_BG,
      dark: Config.QR_COLOR_DARK,
      emptyBg: Config.QR_EMPTY_COLOR_BG,
      emptyLine: Config.QR_EMPTY_COLOR_LINE,
      emptyText: Config.QR_EMPTY_COLOR_TEXT,
    },

    init() {
      this.canvas = document.getElementById('qrcode');
      this.ctx = this.canvas.getContext('2d');
      // Detect initial dark mode
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (document.documentElement.getAttribute('data-theme') !== 'light' &&
         window.matchMedia('(prefers-color-scheme: dark)').matches);
      this.updateColors(isDark);
    },

    updateColors(isDark) {
      if (isDark) {
        this.colors = {
          bg: Config.QR_COLOR_BG_DARK,
          dark: Config.QR_COLOR_DARK_DARK,
          emptyBg: Config.QR_EMPTY_COLOR_BG_DARK,
          emptyLine: Config.QR_EMPTY_COLOR_LINE_DARK,
          emptyText: Config.QR_EMPTY_COLOR_TEXT_DARK,
        };
      } else {
        this.colors = {
          bg: Config.QR_COLOR_BG,
          dark: Config.QR_COLOR_DARK,
          emptyBg: Config.QR_EMPTY_COLOR_BG,
          emptyLine: Config.QR_EMPTY_COLOR_LINE,
          emptyText: Config.QR_EMPTY_COLOR_TEXT,
        };
      }
    },

    generate(text) {
      this.currentText = text;
      if (!text) {
        this._drawEmpty();
        return;
      }

      const qr = this._createQR(text);
      if (!qr) {
        this._drawEmpty();
        Toast.show('内容过长，无法生成二维码');
        return;
      }
      const cellSize = Math.max(1, Math.floor(Config.QR_CANVAS_MAX / qr.getModuleCount()));
      this._renderModules(qr, this.canvas, cellSize, Config.QR_MARGIN);
    },

    download() {
      if (!this.currentText) return false;

      const qr = this._createQR(this.currentText);
      if (!qr) return false;
      const scale = Config.QR_DOWNLOAD_SCALE;
      const margin = Config.QR_MARGIN * scale;

      const offscreen = document.createElement('canvas');
      this._renderModules(qr, offscreen, scale, margin);

      const link = document.createElement('a');
      link.download = this._downloadName(this.currentText);
      link.href = offscreen.toDataURL('image/png');
      link.click();
      return true;
    },

    // --- Private helpers ---

    _downloadName(text) {
      const pad = (n) => (n < 10 ? '0' + n : '' + n);
      const now = new Date();
      const date = pad(now.getFullYear() % 100) + pad(now.getMonth() + 1) + pad(now.getDate());

      try {
        const host = new URL(text).hostname.replace(/^www\./, '');
        if (host) {
          const domain = host.split('.').slice(-2).join('_');
          return 'qr_' + domain + '_' + date + '.png';
        }
      } catch { /* not a URL */ }
      return 'qr_' + date + '.png';
    },

    _createQR(text) {
      try {
        const qr = qrcode(0, Config.QR_ERROR_LEVEL);
        qr.addData(text);
        qr.make();
        return qr;
      } catch {
        return null;
      }
    },

    _renderModules(qr, canvas, cellSize, margin) {
      const moduleCount = qr.getModuleCount();
      const size = cellSize * moduleCount + margin * 2;

      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = this.colors.bg;
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = this.colors.dark;
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(margin + col * cellSize, margin + row * cellSize, cellSize, cellSize);
          }
        }
      }
    },

    _drawEmpty() {
      const s = Config.QR_EMPTY_SIZE;
      const cx = s / 2;

      this.canvas.width = s;
      this.canvas.height = s;

      this.ctx.fillStyle = this.colors.emptyBg;
      this.ctx.fillRect(0, 0, s, s);

      // Decorative lines (centered, relative to canvas size)
      const lineTop = cx * 0.72;
      const lineLeft = cx * 0.58;
      const lineRight = cx * 1.42;
      const lineGap = s * 0.056;

      this.ctx.strokeStyle = this.colors.emptyLine;
      this.ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        this.ctx.beginPath();
        this.ctx.moveTo(lineLeft, lineTop + i * lineGap);
        this.ctx.lineTo(lineRight, lineTop + i * lineGap);
        this.ctx.stroke();
      }

      this.ctx.fillStyle = this.colors.emptyText;
      this.ctx.font = `${Math.round(s * 0.067)}px -apple-system, BlinkMacSystemFont, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('等待内容', cx, cx * 1.44);
    },
  };

  // ==================== History ====================

  const History = {
    items: [],

    async load() {
      this.items = await Storage.get();
      this.items = this._cleanExpired(this.items);
      this._sort();
      await this._persist();
      return this.items;
    },

    async add(url) {
      if (!url) return;
      const existing = this.items.find((i) => i.url === url);
      this.items = this.items.filter((i) => i.url !== url);
      this.items = this._cleanExpired(this.items);
      this.items.unshift({ url, time: Date.now(), pinned: existing?.pinned ?? false });
      this._sort();
      await this._persist();
    },

    async togglePin(url) {
      const item = this.items.find((i) => i.url === url);
      if (item) {
        item.pinned = !item.pinned;
        this._sort();
        await this._persist();
      }
    },

    async remove(url) {
      this.items = this.items.filter((i) => i.url !== url);
      await this._persist();
    },

    async clear() {
      this.items = [];
      await this._persist();
    },

    _cleanExpired(list) {
      const cutoff = Date.now() - Config.EXPIRE_DAYS * 24 * 60 * 60 * 1000;
      return list.filter((item) => item.pinned || item.time > cutoff);
    },

    _sort() {
      this.items.sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
        return b.time - a.time;
      });
    },

    async _persist() {
      try {
        await Storage.set(this.items);
      } catch {
        Toast.show('保存失败');
      }
    },
  };

  // ==================== UI ====================

  const UI = {
    els: {},
    callbacks: { onPin: null, onDelete: null, onTheme: null },

    init() {
      this.els = {
        urlInput: document.getElementById('url-input'),
        btnSave: document.getElementById('btn-save'),
        btnDownload: document.getElementById('btn-download'),
        btnClear: document.getElementById('btn-clear'),
        btnTheme: document.getElementById('btn-theme'),
        historyList: document.getElementById('history-list'),
      };
    },

    getInput() {
      return this.els.urlInput.value.trim();
    },

    setInput(value) {
      this.els.urlInput.value = value;
      this.els.urlInput.title = value;
    },

    renderHistory(list) {
      const container = this.els.historyList;
      this.els.btnClear.style.display = list.length ? '' : 'none';

      if (!list.length) {
        container.innerHTML = '<div class="history-empty">暂无记录</div>';
        return;
      }

      container.innerHTML = '';
      list.forEach((item) => {
        container.appendChild(this._createItem(item));
      });
    },

    // --- Private helpers ---

    _createItem(item) {
      const div = document.createElement('div');
      div.className = 'history-item' + (item.pinned ? ' pinned' : '');
      div.innerHTML =
        '<div class="history-info">' +
          '<div class="history-url">' + this._escapeHtml(item.url) + '</div>' +
          '<div class="history-date">' + this._formatDate(item.time) + '</div>' +
        '</div>' +
        '<div class="history-actions">' +
          '<button class="btn-icon pin-btn' + (item.pinned ? ' pin-active' : '') +
            '" title="' + (item.pinned ? '取消置顶' : '置顶') + '" aria-label="' + (item.pinned ? '取消置顶' : '置顶') + '">' +
            (item.pinned ? '⭐' : '☆') +
          '</button>' +
          '<button class="btn-icon delete-btn" title="删除" aria-label="删除">✕</button>' +
        '</div>';

      div.querySelector('.history-info').addEventListener('click', () => {
        this.setInput(item.url);
        QR.generate(item.url);
      });

      div.querySelector('.pin-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onPin(item.url);
      });

      div.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onDelete(item.url);
      });

      return div;
    },

    _escapeHtml(str) {
      const el = document.createElement('span');
      el.textContent = str;
      return el.innerHTML;
    },

    _formatDate(timestamp) {
      const d = new Date(timestamp);
      const now = new Date();
      const pad = (n) => (n < 10 ? '0' + n : '' + n);
      const time = pad(d.getHours()) + ':' + pad(d.getMinutes());

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diff = Math.round((today - target) / (24 * 60 * 60 * 1000));

      if (diff === 0) return '今天 ' + time;
      if (diff === 1) return '昨天 ' + time;
      return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + time;
    },
  };

  // ==================== App ====================

  const App = {
    async init() {
      await Theme.init();
      QR.init();
      Toast.init();
      UI.init();

      UI.callbacks = {
        onPin: (url) => this._handlePin(url),
        onDelete: (url) => this._handleDelete(url),
        onTheme: () => this._handleTheme(),
      };

      this._bindEvents();
      await this._loadInitialData();
    },

    _bindEvents() {
      const { urlInput, btnSave, btnDownload, btnClear, btnTheme } = UI.els;

      let debounceTimer;
      urlInput.addEventListener('input', () => {
        urlInput.title = urlInput.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => QR.generate(UI.getInput()), 150);
      });

      btnSave.addEventListener('click', () => {
        const url = UI.getInput();
        if (!url) {
          Toast.show('请先输入内容');
          return;
        }
        History.add(url).then(() => {
          UI.renderHistory(History.items);
          Toast.show('已收藏');
        });
      });

      btnDownload.addEventListener('click', () => {
        if (QR.download()) {
          Toast.show('已下载');
        } else {
          Toast.show('暂无内容');
        }
      });

      btnClear.addEventListener('click', () => {
        History.clear().then(() => {
          UI.renderHistory(History.items);
          Toast.show('已清空');
        });
      });

      btnTheme.addEventListener('click', () => {
        const mode = Theme.toggle();
        const modeText = { light: '浅色', dark: '深色', auto: '自动' }[mode];
        Toast.show(`主题: ${modeText}`);
      });
    },

    async _loadInitialData() {
      const list = await History.load();
      UI.renderHistory(list);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          QR.generate('');
          return;
        }
        const url = tabs[0]?.url;
        if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
          UI.setInput(url);
          QR.generate(url);
        } else {
          QR.generate('');
        }
      });
    },

    async _handlePin(url) {
      await History.togglePin(url);
      UI.renderHistory(History.items);
    },

    async _handleDelete(url) {
      await History.remove(url);
      UI.renderHistory(History.items);
    },
  };

  // ==================== Bootstrap ====================

  App.init();
})();
