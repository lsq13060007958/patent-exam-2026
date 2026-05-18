// 工具函数 - utils.js
var Utils = {
  storage: {
    setItem(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { console.error('Storage setItem error:', e); return false; }
    },
    getItem(key) {
      try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : null; }
      catch (e) { console.error('Storage getItem error:', e); return null; }
    },
    removeItem(key) {
      try { localStorage.removeItem(key); return true; }
      catch (e) { console.error('Storage removeItem error:', e); return false; }
    },
    clear() {
      try { localStorage.clear(); return true; }
      catch (e) { console.error('Storage clear error:', e); return false; }
    }
  },

  hashStr(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  },

  showToast(title, icon, duration) {
    icon = icon || 'none';
    duration = duration || 1500;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon === 'success' ? '✓' : '⚠️'}</span> <span>${title}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  showModal(options) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-sheet">
          <div class="modal-header">
            <div class="modal-title">${options.title}</div>
            <div class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</div>
          </div>
          <div class="modal-body" style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${options.content || options.body}</div>
          <div class="modal-btn-row">
            <button class="modal-btn modal-btn-cancel">${options.cancelText || '取消'}</button>
            <button class="modal-btn modal-btn-confirm">${options.confirmText || '确定'}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('.modal-cancel').onclick = () => { modal.remove(); resolve({ confirm: false }); };
      modal.querySelector('.modal-confirm').onclick = () => { modal.remove(); resolve({ confirm: true }); };
    });
  },

  showLoading(title) {
    title = title || '加载中...';
    const loading = document.getElementById('global-loading');
    if (loading) { loading.style.display = 'flex'; loading.querySelector('.loading-text').textContent = title; }
  },
  hideLoading() {
    const loading = document.getElementById('global-loading');
    if (loading) loading.style.display = 'none';
  },

  modal(opts) {
    const existing = document.getElementById('modal-sheet');
    if (existing) existing.remove();
    if (!opts) return;

    const sheet = document.createElement('div');
    sheet.id = 'modal-sheet';
    sheet.className = 'modal-overlay';
    sheet.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-header">
          <div class="modal-title">${opts.title}</div>
          <div class="modal-close" onclick="Utils.modal(null)">✕</div>
        </div>
        <div class="modal-body" style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${opts.body}</div>
        <div class="modal-btn-row">
          <button class="modal-btn modal-btn-cancel" onclick="Utils.modal(null)">取消</button>
          <button class="modal-btn modal-btn-confirm">${opts.confirmText || '确认'}</button>
        </div>
      </div>
    `;
    sheet.addEventListener('click', (e) => { if (e.target === sheet) Utils.modal(null); });
    document.body.appendChild(sheet);

    const confirmBtn = sheet.querySelector('.modal-btn-confirm');
    if (opts.onConfirm) confirmBtn.onclick = () => { opts.onConfirm(); };
    const cancelBtn = sheet.querySelector('.modal-btn-cancel');
    if (opts.onCancel) cancelBtn.onclick = () => { opts.onCancel(); };
  },
};

window.Utils = Utils;
