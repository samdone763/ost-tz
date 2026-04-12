/* ═══════════════════════════════════════════════════════
   OST v2 — Global JavaScript Utilities
   ═══════════════════════════════════════════════════════ */

const OST = (() => {

  // ─── Config ─────────────────────────────────────────
  const API_BASE = 'https://ost-tz.onrender.com/api';
  // const API_BASE = 'http://localhost:5000/api'; // Uncomment kwa local dev

  // ─── API Helper ─────────────────────────────────────
  const api = {
    async request(endpoint, options = {}) {
      const token = auth.getToken();
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers
        },
        ...options
      };

      if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
      }
      if (config.body instanceof FormData) {
        delete config.headers['Content-Type'];
      }

      try {
        const res = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || `Hitilafu: ${res.status}`);
        }

        return data;
      } catch (error) {
        if (error.message === 'Failed to fetch') {
          throw new Error('Hakuna muunganiko wa intaneti au seva haifanyi kazi');
        }
        throw error;
      }
    },

    get: (endpoint, params = {}) => {
      const query = new URLSearchParams(params).toString();
      return OST.api.request(`${endpoint}${query ? '?' + query : ''}`);
    },

    post: (endpoint, body) =>
      OST.api.request(endpoint, { method: 'POST', body }),

    put: (endpoint, body) =>
      OST.api.request(endpoint, { method: 'PUT', body }),

    delete: (endpoint, body) =>
      OST.api.request(endpoint, { method: 'DELETE', body })
  };

  // ─── Auth ────────────────────────────────────────────
  const auth = {
    getToken: () => localStorage.getItem('ost_token'),
    getUser: () => JSON.parse(localStorage.getItem('ost_user') || 'null'),
    isLoggedIn: () => !!localStorage.getItem('ost_token'),

    isMerchant: () => {
      const user = auth.getUser();
      return user?.role === 'merchant' || user?.role === 'admin';
    },

    login(token, user) {
      localStorage.setItem('ost_token', token);
      localStorage.setItem('ost_user', JSON.stringify(user));
      this.updateNavUI();
    },

    logout() {
      localStorage.removeItem('ost_token');
      localStorage.removeItem('ost_user');
      window.location.href = '/onlinestores-tz/index.html';
    },

    updateNavUI() {
      const user = this.getUser();
      const loginBtn = document.getElementById('loginBtn');
      const userMenu = document.getElementById('userMenu');
      const userAvatar = document.getElementById('userAvatar');
      const userName = document.getElementById('userName');
      const merchantLink = document.getElementById('merchantLink');

      if (user && loginBtn) {
        loginBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userAvatar) userAvatar.src = user.avatar?.url || '/onlinestores-tz/assets/icons/user.svg';
        if (userName) userName.textContent = user.name.split(' ')[0];
        if (merchantLink && this.isMerchant()) merchantLink.style.display = 'flex';
      }
    },

    requireAuth() {
      if (!this.isLoggedIn()) {
        toast.warning('Tafadhali ingia kwanza');
        setTimeout(() => showModal('loginModal'), 800);
        return false;
      }
      return true;
    }
  };

  // ─── Toast Notifications ────────────────────────────
  const toast = {
    container: null,

    init() {
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
      }
    },

    show(message, type = 'info', duration = 4000) {
      this.init();
      const icons = {
        success: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
        error:   `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        warning: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info:    `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      };

      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.closest('.toast').remove()">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>`;

      this.container.appendChild(el);

      if (duration > 0) {
        setTimeout(() => {
          el.classList.add('removing');
          setTimeout(() => el.remove(), 300);
        }, duration);
      }
    },

    success: (msg, dur) => OST.toast.show(msg, 'success', dur),
    error:   (msg, dur) => OST.toast.show(msg, 'error', dur),
    warning: (msg, dur) => OST.toast.show(msg, 'warning', dur),
    info:    (msg, dur) => OST.toast.show(msg, 'info', dur)
  };

  // ─── Helpers ─────────────────────────────────────────
  const helpers = {
    formatPrice(amount, currency = 'TZS') {
      return new Intl.NumberFormat('sw-TZ', {
        style: 'currency', currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    },

    formatDate(date, options = {}) {
      return new Intl.DateTimeFormat('sw-TZ', {
        day: 'numeric', month: 'short', year: 'numeric',
        ...options
      }).format(new Date(date));
    },

    formatTimeAgo(date) {
      const diff = Date.now() - new Date(date);
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Sasa hivi';
      if (minutes < 60) return `Dakika ${minutes} zilizopita`;
      if (hours < 24) return `Saa ${hours} zilizopita`;
      if (days < 7) return `Siku ${days} zilizopita`;
      return this.formatDate(date);
    },

    debounce(fn, delay = 300) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    },

    getQueryParam(key) {
      return new URLSearchParams(window.location.search).get(key);
    },

    truncate(str, length = 80) {
      return str.length > length ? str.slice(0, length) + '...' : str;
    },

    orderStatusLabel(status) {
      const labels = {
        pending: 'Inasubiri',
        confirmed: 'Imekubaliwa',
        processing: 'Inafungashwa',
        shipped: 'Imesafirishwa',
        out_for_delivery: 'Iko Njiani',
        delivered: 'Imefikishwa',
        cancelled: 'Imefutwa',
        refunded: 'Imerudishiwa'
      };
      return labels[status] || status;
    },

    orderStatusBadge(status) {
      const badges = {
        pending: 'badge-warning',
        confirmed: 'badge-info',
        processing: 'badge-info',
        shipped: 'badge-info',
        out_for_delivery: 'badge-accent',
        delivered: 'badge-success',
        cancelled: 'badge-danger',
        refunded: 'badge-gray'
      };
      return badges[status] || 'badge-gray';
    },

    paymentMethodLabel(method) {
      const labels = {
        mpesa: 'M-Pesa',
        tigo_pesa: 'Tigo Pesa',
        airtel_money: 'Airtel Money',
        halopesa: 'Halopesa',
        card: 'Kadi ya Benki',
        cash_on_delivery: 'Lipa Ukipokea'
      };
      return labels[method] || method;
    }
  };

  // ─── Skeleton Loader ─────────────────────────────────
  const skeleton = {
    productCard: () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-text w-3-4"></div>
          <div class="skeleton skeleton-text w-1-2"></div>
          <div class="skeleton skeleton-text w-1-4"></div>
        </div>
      </div>`,

    storeCard: () => `
      <div class="skeleton-card">
        <div class="skeleton" style="height:100px"></div>
        <div class="skeleton-body" style="padding-top:36px">
          <div class="skeleton skeleton-text w-3-4"></div>
          <div class="skeleton skeleton-text w-1-2"></div>
        </div>
      </div>`,

    renderMany(container, type = 'productCard', count = 8) {
      container.innerHTML = Array(count).fill(OST.skeleton[type]()).join('');
    }
  };

  // ─── Cart (localStorage) ─────────────────────────────
  const cart = {
    get() { return JSON.parse(localStorage.getItem('ost_cart') || '[]'); },
    save(items) { localStorage.setItem('ost_cart', JSON.stringify(items)); },
    count() { return this.get().reduce((sum, item) => sum + item.quantity, 0); },

    add(product, quantity = 1, variants = []) {
      const items = this.get();
      const key = `${product._id}_${JSON.stringify(variants)}`;
      const existing = items.find(i => i.key === key);

      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({ key, productId: product._id, name: product.name,
          price: product.price.discounted || product.price.original,
          image: product.media?.find(m => m.isPrimary)?.url || product.media?.[0]?.url,
          storeId: product.store?._id || product.store,
          storeName: product.store?.name,
          selectedVariants: variants, quantity });
      }

      this.save(items);
      this.updateBadge();
      toast.success(`${product.name} imeongezwa kwenye mkoba`);
    },

    remove(key) {
      const items = this.get().filter(i => i.key !== key);
      this.save(items);
      this.updateBadge();
    },

    clear() { localStorage.removeItem('ost_cart'); this.updateBadge(); },

    updateBadge() {
      const badge = document.getElementById('cartBadge');
      const count = this.count();
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
    },

    total() {
      return this.get().reduce((sum, item) => {
        const variantMod = item.selectedVariants.reduce((s, v) => s + (v.priceModifier || 0), 0);
        return sum + (item.price + variantMod) * item.quantity;
      }, 0);
    }
  };

  // ─── Smart Search ────────────────────────────────────
  const search = {
    init(inputEl, resultsEl) {
      if (!inputEl) return;

      const debouncedSearch = helpers.debounce(async (query) => {
        if (query.length < 2) { resultsEl.classList.add('hidden'); return; }

        try {
          const data = await api.get('/search/autocomplete', { q: query });
          if (data.suggestions.length === 0) { resultsEl.classList.add('hidden'); return; }

          resultsEl.innerHTML = data.suggestions.map(s => `
            <div class="autocomplete-item" onclick="OST.search.selectSuggestion('${s.text}')">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                ${s.type === 'store'
                  ? '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>'
                  : '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'}
              </svg>
              <span>${s.text}</span>
              <span class="badge badge-gray" style="margin-left:auto">${s.type === 'store' ? 'Biashara' : 'Bidhaa'}</span>
            </div>`).join('');

          resultsEl.classList.remove('hidden');
        } catch (e) {}
      }, 300);

      inputEl.addEventListener('input', e => debouncedSearch(e.target.value));
      inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const q = e.target.value.trim();
          if (q) window.location.href = `/onlinestores-tz/index.html?search=${encodeURIComponent(q)}`;
        }
        if (e.key === 'Escape') resultsEl.classList.add('hidden');
      });

      document.addEventListener('click', e => {
        if (!inputEl.contains(e.target) && !resultsEl.contains(e.target)) {
          resultsEl.classList.add('hidden');
        }
      });
    },

    selectSuggestion(text) {
      window.location.href = `/onlinestores-tz/index.html?search=${encodeURIComponent(text)}`;
    }
  };

  // ─── Push Notifications ──────────────────────────────
  const notifications = {
    async init() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      try {
        const reg = await navigator.serviceWorker.register('/onlinestores-tz/sw.js');
        const { publicKey } = await api.get('/notifications/vapid-public-key');

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlB64ToUint8Array(publicKey)
        });

        if (auth.isLoggedIn()) {
          await api.post('/auth/push-subscription', { subscription });
        }
      } catch (e) { console.log('Push notifications hazikuwezekana:', e.message); }
    },

    urlB64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
    }
  };

  // ─── Modal Helpers ───────────────────────────────────
  window.showModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  };
  window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  };

  // Close modal on overlay click
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('active');
    }
  });

  // ─── Init ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    auth.updateNavUI();
    cart.updateBadge();
  });

  return { api, auth, toast, helpers, skeleton, cart, search, notifications };

})();
