/* ============================================
   Smart Social Media Analytics Platform
   Shared Application Logic
   ============================================ */

// ─── Session / Auth ───────────────────────────
const Auth = {
  key: 'ssmap_user',
  login(user) {
    sessionStorage.setItem(this.key, JSON.stringify(user));
  },
  logout() {
    sessionStorage.removeItem(this.key);
    window.location.href = 'index.html';
  },
  getUser() {
    const u = sessionStorage.getItem(this.key);
    return u ? JSON.parse(u) : null;
  },
  requireAuth() {
    if (!this.getUser()) {
      window.location.href = 'index.html';
    }
  }
};

// ─── Mock Users ───────────────────────────────
const MOCK_USERS = [
  { id: 1, name: 'Alex Johnson', email: 'alex@ssmap.io', role: 'Admin', avatar: 'AJ' },
  { id: 2, name: 'Sarah Chen',   email: 'sarah@ssmap.io', role: 'Analyst', avatar: 'SC' },
  { id: 3, name: 'demo',         email: 'demo@ssmap.io',  role: 'Viewer', avatar: 'DM' },
];

function mockLogin(identifier, password) {
  if (!identifier || !password) return null;
  // Accept any password for demo; match by email or name
  return MOCK_USERS.find(u =>
    u.email.toLowerCase() === identifier.toLowerCase() ||
    u.name.toLowerCase()  === identifier.toLowerCase() ||
    identifier === 'demo'
  ) || null;
}

// ─── DOM Helpers ──────────────────────────────
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function showToast(message, type = 'success', duration = 3000) {
  let container = qs('#toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    Object.assign(container.style, {
      position: 'fixed', bottom: '24px', right: '24px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      zIndex: '9999'
    });
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#06b6d4' };
  const toast = document.createElement('div');
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}" style="color:${colors[type]}"></i><span>${message}</span>`;
  Object.assign(toast.style, {
    background: '#1a2235',
    border: `1px solid #1e2d45`,
    borderLeft: `3px solid ${colors[type]}`,
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#f1f5f9',
    fontSize: '13px',
    fontWeight: '500',
    minWidth: '260px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    animation: 'toastIn 0.3s ease',
    fontFamily: 'Inter, sans-serif'
  });
  const style = document.createElement('style');
  style.textContent = `@keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
  @keyframes toastOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(20px)}}`;
  document.head.appendChild(style);
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Sidebar Active State ─────────────────────
function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  qsa('.nav-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    if (href === page || (page === '' && href === 'index.html')) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// ─── Populate User Info ───────────────────────
function populateUserInfo() {
  const user = Auth.getUser();
  if (!user) return;
  const nameEl  = qs('.user-name');
  const roleEl  = qs('.user-role');
  const avatarEl = qs('.user-avatar');
  if (nameEl)   nameEl.textContent  = user.name;
  if (roleEl)   roleEl.textContent  = user.role;
  if (avatarEl) avatarEl.textContent = user.avatar;
}

// ─── Logout Button ────────────────────────────
function bindLogout() {
  const btn = qs('#logout-btn');
  if (btn) btn.addEventListener('click', () => {
    showToast('Logged out successfully', 'info');
    setTimeout(() => Auth.logout(), 800);
  });
}

// ─── Number Counter Animation ─────────────────
function animateCounters() {
  qsa('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const isFloat = el.dataset.float === 'true';
    const duration = 1200;
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      el.textContent = prefix + (isFloat ? val.toFixed(1) : Math.floor(val).toLocaleString()) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

// ─── Progress Bar Animation ───────────────────
function animateProgressBars() {
  qsa('.progress-fill[data-width]').forEach(el => {
    setTimeout(() => { el.style.width = el.dataset.width + '%'; }, 100);
  });
}

// ─── Chart defaults (Chart.js) ────────────────
function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.color = '#64748b';
  Chart.defaults.borderColor = '#1e2d45';
  Chart.defaults.font.family = 'Inter';
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
  Chart.defaults.plugins.tooltip.backgroundColor = '#1a2235';
  Chart.defaults.plugins.tooltip.borderColor = '#1e2d45';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = '#f1f5f9';
  Chart.defaults.plugins.tooltip.bodyColor = '#94a3b8';
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
}

// ─── Date Formatter ───────────────────────────
function formatDate(d = new Date()) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Init on DOM ready ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  populateUserInfo();
  bindLogout();
  animateCounters();
  animateProgressBars();
  applyChartDefaults();
});
