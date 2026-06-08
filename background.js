/**
 * Background Service Worker — Context Menu Handlers
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'qr-encode',
    title: '生成二维码',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'qr-decode',
    title: '识别二维码',
    contexts: ['image'],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'qr-encode') {
    const text = info.selectionText;
    if (!text) return;
    chrome.storage.local.set({ _ctx_action: { mode: 'encode', text } }, () => {
      if (chrome.runtime.lastError) return;
      chrome.tabs.create({ url: chrome.runtime.getURL('result.html') });
    });
  } else if (info.menuItemId === 'qr-decode') {
    const srcUrl = info.srcUrl;
    if (!srcUrl) return;
    // Only allow http/https/data to prevent SSRF (file://, chrome://, etc.)
    if (!/^https?:\/\//i.test(srcUrl) && !/^data:/i.test(srcUrl)) {
      chrome.storage.local.set({ _ctx_action: { mode: 'decode', error: '不支持的图片来源协议' } }, () => {
        if (chrome.runtime.lastError) return;
        chrome.tabs.create({ url: chrome.runtime.getURL('result.html') });
      });
      return;
    }
    // Limit data URL size to prevent memory exhaustion
    if (/^data:/i.test(srcUrl) && srcUrl.length > 10 * 1024 * 1024) {
      chrome.storage.local.set({ _ctx_action: { mode: 'decode', error: '图片数据过大' } }, () => {
        if (chrome.runtime.lastError) return;
        chrome.tabs.create({ url: chrome.runtime.getURL('result.html') });
      });
      return;
    }
    chrome.storage.local.set({ _ctx_action: { mode: 'decode', srcUrl } }, () => {
      if (chrome.runtime.lastError) return;
      chrome.tabs.create({ url: chrome.runtime.getURL('result.html') });
    });
  }
});
