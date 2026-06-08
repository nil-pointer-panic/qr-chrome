(function () {
  'use strict';

  const QR_CONFIG = {
    CANVAS_MAX: 240,
    MARGIN: 14,
    ERROR_LEVEL: 'M',
    DOWNLOAD_SCALE: 4,
  };

  const MAX_DECODE_SIZE = 1024;

  // Apply theme preference from popup
  chrome.storage.local.get('qr_theme_preference', ({ qr_theme_preference }) => {
    const mode = qr_theme_preference || 'auto';
    if (mode === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (mode === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  });

  chrome.storage.local.get('_ctx_action', ({ _ctx_action }) => {
    chrome.storage.local.remove('_ctx_action');

    if (!_ctx_action) {
      showError('无效的操作');
      return;
    }

    if (_ctx_action.mode === 'encode') {
      showEncode(_ctx_action.text);
    } else if (_ctx_action.mode === 'decode') {
      showDecode(_ctx_action);
    }
  });

  // ---- Encode ----

  function showEncode(text) {
    document.getElementById('mode-title').textContent = '生成二维码';
    document.getElementById('result-label').textContent = '编码内容';

    document.getElementById('result-text').textContent = text;
    document.getElementById('result-section').style.display = '';

    const qr = createQR(text);
    if (!qr) return;
    const cellSize = Math.max(1, Math.floor(QR_CONFIG.CANVAS_MAX / qr.getModuleCount()));
    renderModules(qr, document.getElementById('qr-canvas'), cellSize, QR_CONFIG.MARGIN);
    document.getElementById('qr-section').style.display = '';

    document.getElementById('btn-download').addEventListener('click', () => {
      const scale = QR_CONFIG.DOWNLOAD_SCALE;
      const offscreen = document.createElement('canvas');
      renderModules(qr, offscreen, scale, QR_CONFIG.MARGIN * scale);
      downloadCanvas(offscreen);
    });

    document.getElementById('btn-copy-text').addEventListener('click', () => {
      copyText(text);
    });
    document.getElementById('btn-copy').addEventListener('click', () => {
      copyText(text);
    });
  }

  // ---- Decode ----

  async function showDecode(action) {
    document.getElementById('mode-title').textContent = '识别二维码';

    if (action.error) {
      showError(action.error);
      return;
    }

    const srcUrl = action.srcUrl;

    let img;
    let blobUrl;
    try {
      if (srcUrl.startsWith('data:')) {
        img = await loadImg(srcUrl);
      } else {
        const resp = await fetch(srcUrl);
        const blob = await resp.blob();
        blobUrl = URL.createObjectURL(blob);
        img = await loadImg(blobUrl);
      }
    } catch {
      showError('无法加载图片');
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      return;
    }
    if (blobUrl) URL.revokeObjectURL(blobUrl);

    const canvas = document.createElement('canvas');
    if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      showError('无效的图片尺寸');
      return;
    }
    // Limit canvas size to prevent memory overflow on huge images
    let w = img.naturalWidth, h = img.naturalHeight;
    if (w > MAX_DECODE_SIZE || h > MAX_DECODE_SIZE) {
      const ratio = Math.min(MAX_DECODE_SIZE / w, MAX_DECODE_SIZE / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      showError('无法读取图片数据');
      return;
    }

    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (!code || !code.data) {
      showError('未识别到有效二维码内容');
      return;
    }

    const decoded = code.data;

    document.getElementById('result-text').textContent = decoded;
    document.getElementById('result-section').style.display = '';

    // Preview: use data URL to avoid CORS issues
    try {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) throw new Error();
      const previewCanvas = document.createElement('canvas');
      const pw = Math.min(img.naturalWidth, 480);
      const ph = Math.round(pw * img.naturalHeight / img.naturalWidth);
      previewCanvas.width = pw;
      previewCanvas.height = ph;
      previewCanvas.getContext('2d').drawImage(img, 0, 0, pw, ph);
      document.getElementById('image-preview').src = previewCanvas.toDataURL('image/png');
      document.getElementById('preview-section').style.display = '';
    } catch {}

    // Only allow http/https links to prevent javascript: XSS
    try {
      const u = new URL(decoded);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        const btnOpen = document.getElementById('btn-open');
        btnOpen.style.display = '';
        btnOpen.addEventListener('click', () => {
          chrome.tabs.create({ url: decoded });
        });
      }
    } catch {}

    document.getElementById('btn-copy').addEventListener('click', () => {
      copyText(decoded);
    });
  }

  // ---- QR Helpers ----

  function createQR(text) {
    try {
      const qr = qrcode(0, QR_CONFIG.ERROR_LEVEL);
      qr.addData(text);
      qr.make();
      return qr;
    } catch {
      showError('内容过长，无法生成二维码');
      return null;
    }
  }

  function renderModules(qr, canvas, cellSize, margin) {
    const count = qr.getModuleCount();
    const size = cellSize * count + margin * 2;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1d1d1f';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  function downloadCanvas(canvas) {
    const a = document.createElement('a');
    a.download = 'qrcode.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  // ---- Utilities ----

  function loadImg(src, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.onload = img.onerror = null;
        img.src = '';
        reject(new Error('Load timeout'));
      }, timeout);
      img.onload = () => { clearTimeout(timer); resolve(img); };
      img.onerror = () => { clearTimeout(timer); reject(); };
      img.src = src;
    });
  }

  function copyText(text) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('已复制'))
      .catch(() => showToast('复制失败'));
  }

  function showError(msg) {
    document.getElementById('error-msg').textContent = msg;
    document.getElementById('error-section').style.display = '';
  }

  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1500);
  }
})();
