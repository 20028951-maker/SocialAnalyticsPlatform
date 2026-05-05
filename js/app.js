/* ============================================
   Smart Social Media Analytics Platform
   Enhanced Application Logic with Roles & OAuth
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
  },
  // Check if user has minimum required role
  hasRole(requiredRole) {
    const user = this.getUser();
    if (!user) return false;
    
    const hierarchy = { 'Admin': 3, 'Analyst': 2, 'Viewer': 1 };
    const userLevel = hierarchy[user.role] || 0;
    const requiredLevel = hierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  }
};

// ─── Mock Users with Different Roles ──────────
const MOCK_USERS = [
  { id: 1, name: 'Alex Johnson', email: 'alex@ssmap.io', role: 'Admin', avatar: 'AJ' },
  { id: 2, name: 'Sarah Chen',   email: 'sarah@ssmap.io', role: 'Analyst', avatar: 'SC' },
  { id: 3, name: 'Mike Taylor',  email: 'mike@ssmap.io', role: 'Viewer', avatar: 'MT' },
  { id: 4, name: 'demo',         email: 'demo@ssmap.io',  role: 'Admin', avatar: 'DM' },
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
  const colors = { success: 'var(--text-primary)', error: 'var(--text-primary)', warning: 'var(--text-secondary)', info: 'var(--text-secondary)' };
  const toast = document.createElement('div');
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}" style="color:${colors[type]}"></i><span>${message}</span>`;
  Object.assign(toast.style, {
    background: 'var(--bg-card)',
    border: `1px solid var(--border-light)`,
    borderLeft: `3px solid ${colors[type]}`,
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '500',
    minWidth: '260px',
    boxShadow: 'var(--shadow-lg)',
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
  qsa('.user-name').forEach(el => el.textContent = user.name);
  qsa('.user-role').forEach(el => el.textContent = user.role);
  qsa('.user-avatar').forEach(el => el.textContent = user.avatar);
}

// ─── Role-Based UI ────────────────────────────
const ROLE_PROFILES = {
  Admin: {
    label: 'Admin mode',
    detail: 'Full access: manage users, settings, integrations, alerts, uploads, exports, and reports.',
    icon: 'fa-user-shield'
  },
  Analyst: {
    label: 'Analyst mode',
    detail: 'Analysis workspace: upload data, run forecasts, create reports, and manage alert rules. Admin settings are hidden.',
    icon: 'fa-chart-line'
  },
  Viewer: {
    label: 'Viewer mode',
    detail: 'Read-only workspace: dashboards and insights are visible. Viewer can download reports, but cannot upload, create, connect, or delete data.',
    icon: 'fa-eye'
  }
};

const MUTATING_ACTION_RE = /\b(new|add|create|edit|delete|remove|clear|reset|revoke|connect|disconnect|configure|upload|import|start|process|run|generate|schedule|share|retry|respond|save|update|upgrade|snooze|test)\b/i;

function applyRoleRestrictions() {
  const user = Auth.getUser();
  if (!user) return;
  const role = user.role || 'Viewer';
  document.body.dataset.role = role.toLowerCase();

  resetRoleRestrictions();
  renderRoleContext(role);

  qsa('[data-role-min]').forEach(el => {
    const minRole = el.getAttribute('data-role-min');
    if (!Auth.hasRole(minRole)) hideForRole(el);
  });

  qsa('[data-role-only]').forEach(el => {
    const allowedRoles = el.getAttribute('data-role-only').split(',').map(r => r.trim());
    if (!allowedRoles.includes(role)) hideForRole(el);
  });

  if (role === 'Viewer') applyViewerMode();
  if (role === 'Analyst') applyAnalystMode();

  qsa('.user-role').forEach(el => {
    el.textContent = role;
    el.classList.add('role-label');
  });
}

function resetRoleRestrictions() {
  qsa('[data-role-managed]').forEach(el => {
    el.hidden = false;
    el.style.display = el.dataset.originalDisplay || '';
    el.classList.remove('is-disabled-by-role');
    if (el.dataset.roleDisabled === 'true') {
      el.disabled = false;
      el.removeAttribute('aria-disabled');
    }
    if (el.dataset.originalHref) el.setAttribute('href', el.dataset.originalHref);
    if (el.dataset.originalPointerEvents !== undefined) el.style.pointerEvents = el.dataset.originalPointerEvents;
    delete el.dataset.roleDisabled;
    delete el.dataset.roleManaged;
  });
}

function hideForRole(el) {
  if (!el.dataset.originalDisplay) el.dataset.originalDisplay = el.style.display || '';
  el.dataset.roleManaged = 'true';
  el.hidden = true;
  el.style.display = 'none';
}

function disableForRole(el, message = 'Read-only for Viewer role') {
  el.dataset.roleManaged = 'true';
  el.dataset.roleDisabled = 'true';
  el.classList.add('is-disabled-by-role');
  el.setAttribute('aria-disabled', 'true');
  el.title = message;
  if ('disabled' in el) el.disabled = true;
  if (el.tagName === 'A') {
    el.dataset.originalHref = el.dataset.originalHref || el.getAttribute('href') || '';
    el.removeAttribute('href');
  }
}

function renderRoleContext(role) {
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.Viewer;
  let banner = qs('#role-context-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'role-context-banner';
    banner.className = 'role-context-banner';
    const pageContent = qs('.page-content');
    if (pageContent) pageContent.prepend(banner);
    else document.body.prepend(banner);
  }
  banner.innerHTML = `
    <div class="role-context-icon"><i class="fa-solid ${profile.icon}"></i></div>
    <div>
      <div class="role-context-title">${profile.label}</div>
      <div class="role-context-detail">${profile.detail}</div>
    </div>
  `;
}

function applyViewerMode() {
  qsa('.nav-item[href="upload.html"], .nav-item[href="settings.html"]').forEach(hideForRole);
  qsa('input[type="file"], textarea, select:not(#user-role-select), .form-control').forEach(el => {
    if (!el.closest('.search-bar')) disableForRole(el);
  });
  qsa('button, a.btn, .topbar-icon-btn, .export-format-btn').forEach(el => {
    const page = window.location.pathname.split('/').pop() || '';
    const label = (el.textContent || el.getAttribute('data-tooltip') || '').trim();
    const onclick = el.getAttribute('onclick') || '';
    const href = el.getAttribute('href') || '';
    const reportDownload = page === 'reports.html' && /downloadReport|selectFormat|window\.print/.test(onclick);
    const isReadOnlyNav = reportDownload || /view|preview|open|load more|logout/i.test(label) || href.includes('sentiment.html') || href.includes('reports.html');
    if (!isReadOnlyNav && (MUTATING_ACTION_RE.test(label) || MUTATING_ACTION_RE.test(onclick) || /upload|settings/.test(href))) {
      hideForRole(el);
    }
  });
  qsa('.drop-zone').forEach(el => {
    el.dataset.roleManaged = 'true';
    el.dataset.originalPointerEvents = el.style.pointerEvents || '';
    el.classList.add('is-disabled-by-role');
    el.style.pointerEvents = 'none';
  });
}

function applyAnalystMode() {
  qsa('.nav-item[href="settings.html"] .nav-badge, [data-admin-only]').forEach(hideForRole);
  qsa('button, a.btn').forEach(el => {
    const text = (el.textContent || '').trim();
    const onclick = el.getAttribute('onclick') || '';
    if (/delete account|revoke|disconnect|connectOAuth|clear cache|reset rules|upgrade/i.test(text + ' ' + onclick)) {
      hideForRole(el);
    }
  });
}

function injectRoleStyles() {
  if (qs('#role-ui-styles')) return;
  const style = document.createElement('style');
  style.id = 'role-ui-styles';
  style.textContent = `
    .role-context-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg-card);
      color: var(--text-primary);
    }
    .role-context-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      background: var(--primary);
      color: var(--on-primary);
      flex-shrink: 0;
    }
    .role-context-title { font-size: 13px; font-weight: 800; }
    .role-context-detail { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .role-label {
      display: inline-flex;
      width: fit-content;
      padding: 2px 7px;
      border: 1px solid var(--border-light);
      border-radius: 999px;
      margin-top: 2px;
    }
    body[data-role="viewer"] .card,
    body[data-role="viewer"] .stat-card { border-style: dashed; }
    .data-source-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: -4px 0 18px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-secondary);
      color: var(--text-muted);
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);
}

// ─── OAuth Integration ────────────────────────
const OAuth = {
  platforms: {
    Google: {
      name: 'Google',
      icon: 'fa-brands fa-google',
      color: '#000000',
      isFree: true,
      isLoginProvider: true,
      authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      clientIdKey: 'ssmap-google-client-id',
      redirectUriKey: 'ssmap-google-redirect-uri',
      defaultRedirectUri: window.location.origin && window.location.origin !== 'null'
        ? window.location.origin + window.location.pathname
        : 'http://localhost:8000/index.html',
      params: {
        response_type: 'token',
        prompt: 'select_account',
        scope: 'openid email profile'
      }
    },
    Reddit: {
      name: 'Reddit',
      icon: 'fa-brands fa-reddit',
      color: '#FF4500',
      isFree: true,
      authEndpoint: 'https://www.reddit.com/api/v1/authorize',
      clientIdKey: 'ssmap-reddit-client-id',
      redirectUriKey: 'ssmap-reddit-redirect-uri',
      defaultRedirectUri: 'http://localhost:3000/oauth/reddit/callback',
      params: {
        response_type: 'code',
        duration: 'permanent',
        scope: 'read identity'
      }
    },
    YouTube: {
      name: 'YouTube',
      icon: 'fa-brands fa-youtube',
      color: '#FF0000',
      isFree: true,
      authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      clientIdKey: 'ssmap-youtube-client-id',
      redirectUriKey: 'ssmap-youtube-redirect-uri',
      defaultRedirectUri: 'http://localhost:3000/oauth/youtube/callback',
      params: {
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        scope: 'https://www.googleapis.com/auth/youtube.readonly'
      }
    },
    Twitter: {
      name: 'Twitter / X',
      icon: 'fa-brands fa-x-twitter',
      color: '#000000',
      isPaid: true,
      message: 'Twitter API requires a paid X API plan'
    },
    Facebook: {
      name: 'Facebook',
      icon: 'fa-brands fa-facebook',
      color: '#1877F2',
      needsApproval: true,
      message: 'Meta app review is required before Facebook OAuth can be enabled'
    },
    Instagram: {
      name: 'Instagram',
      icon: 'fa-brands fa-instagram',
      color: '#E4405F',
      needsApproval: true,
      message: 'Meta app review is required before Instagram OAuth can be enabled'
    },
    LinkedIn: {
      name: 'LinkedIn',
      icon: 'fa-brands fa-linkedin',
      color: '#0A66C2',
      needsApproval: true,
      message: 'LinkedIn partner approval is required before OAuth can be enabled'
    },
    TikTok: {
      name: 'TikTok',
      icon: 'fa-brands fa-tiktok',
      color: '#000000',
      needsApproval: true,
      message: 'TikTok business verification is required before OAuth can be enabled'
    },
    Slack: {
      name: 'Slack',
      icon: 'fa-brands fa-slack',
      color: '#611f69',
      needsApproval: true,
      message: 'Add Slack app credentials before connecting Slack'
    }
  },

  connect(platform) {
    const config = this.platforms[platform];
    if (!config) { showToast('Unknown platform', 'error'); return; }
    if (config.isPaid || config.needsApproval) {
      showToast(config.message, config.isPaid ? 'warning' : 'info', 4500);
      return;
    }
    if (!config.isFree) return;

    const clientId = this.getClientId(config);
    if (!clientId) {
      showToast(`${platform} OAuth needs a client ID first`, 'warning', 4500);
      return;
    }

    const redirectUri = localStorage.getItem(config.redirectUriKey) || config.defaultRedirectUri;
    const state = `ssmap-${platform.toLowerCase()}-${Date.now()}`;
    sessionStorage.setItem(`oauth-state-${platform}`, state);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      ...config.params
    });

    showToast(`Opening ${platform} OAuth authorization`, 'info');
    if (config.isLoginProvider) {
      window.location.href = `${config.authEndpoint}?${params.toString()}`;
    } else {
      window.open(`${config.authEndpoint}?${params.toString()}`, `oauth-${platform}`, 'width=640,height=760,left=180,top=80');
    }
  },

  async completeGoogleLoginFromHash() {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get('access_token');
    const state = hash.get('state');
    if (!token || !state || !state.startsWith('ssmap-google-')) return false;

    const expectedState = sessionStorage.getItem('oauth-state-Google');
    if (expectedState && expectedState !== state) {
      showToast('Google login state mismatch. Please try again.', 'error');
      return true;
    }

    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not load Google profile');
      const profile = await res.json();
      const name = profile.name || profile.email || 'Google User';
      const initials = name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'GU';
      Auth.login({
        id: profile.sub || Date.now(),
        name,
        email: profile.email || '',
        role: 'Analyst',
        avatar: initials,
        provider: 'Google'
      });
      history.replaceState(null, document.title, window.location.pathname);
      showToast('Signed in with Google', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
    } catch (err) {
      showToast(err.message || 'Google login failed', 'error', 5000);
    }
    return true;
  },

  getClientId(config) {
    const existing = localStorage.getItem(config.clientIdKey);
    if (existing) return existing;
    const entered = window.prompt(`Enter your ${config.name} OAuth client ID`);
    if (entered && entered.trim()) {
      localStorage.setItem(config.clientIdKey, entered.trim());
      return entered.trim();
    }
    return '';
  },

  disconnect(platform) {
    const connections = this.getConnections();
    delete connections[platform];
    localStorage.setItem('ssmap-connections', JSON.stringify(connections));
    showToast(`${platform} disconnected`, 'warning');
  },

  handleSuccess(platform, data = {}) {
    const connections = this.getConnections();
    connections[platform] = { connected: true, timestamp: Date.now(), username: data.username || platform };
    localStorage.setItem('ssmap-connections', JSON.stringify(connections));
    showToast(`${platform} connected successfully`, 'success');
  },

  getConnections() {
    const stored = localStorage.getItem('ssmap-connections');
    return stored ? JSON.parse(stored) : {};
  },

  isConnected(platform) {
    return Boolean(this.getConnections()[platform]?.connected);
  }
};

window.connectOAuth = (platform) => OAuth.connect(platform);
window.disconnectOAuth = (platform) => OAuth.disconnect(platform);

// ─── Theme System ─────────────────────────────
function setThemePreference(mode) {
  localStorage.setItem('ssmap-theme', mode);
  applyStoredTheme(mode);
}

function applyStoredTheme(mode) {
  const root = document.documentElement;
  const resolvedMode = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : (mode || 'dark');
  root.dataset.theme = resolvedMode;
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

// ─── Data Source Label ────────────────────────
function hasAnalyticsData() {
  return localStorage.getItem('ssmap-has-data') === 'true';
}

function getActiveDatasetName() {
  return localStorage.getItem('ssmap-active-dataset') || 'Built-in demo dataset';
}

function setAnalyticsDataAvailable(name = 'Uploaded dataset', summary = null) {
  localStorage.setItem('ssmap-has-data', 'true');
  localStorage.setItem('ssmap-active-dataset', name);
  if (summary) localStorage.setItem('ssmap-analysis-summary', JSON.stringify(summary));
}

function getAnalyticsSummary() {
  try {
    const raw = localStorage.getItem('ssmap-analysis-summary');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearAnalyticsData() {
  localStorage.removeItem('ssmap-has-data');
  localStorage.removeItem('ssmap-active-dataset');
  localStorage.removeItem('ssmap-analysis-summary');
}

function applyUploadedResults() {
  if (!hasAnalyticsData()) return;
  const summary = getAnalyticsSummary();
  if (!summary) return;

  const page = window.location.pathname.split('/').pop() || '';
  const statCards = qsa('.stat-card');
  const neutralRate = summary.totalPosts ? Math.round((summary.neutralCount / summary.totalPosts) * 100) : 0;
  const negativeRate = Math.max(0, 100 - summary.positiveRate - neutralRate);
  const setText = (selector, text) => {
    const el = qs(selector);
    if (el) el.textContent = text;
  };

  if (page === 'dashboard.html') {
    if (statCards[0]) {
      const value = statCards[0].querySelector('.stat-value');
      const change = statCards[0].querySelector('.stat-change');
      if (value) value.textContent = summary.totalPosts.toLocaleString();
      if (change) change.innerHTML = '<i class="fa-solid fa-file-circle-check"></i> from uploaded CSV';
    }
    if (statCards[1]) {
      const value = statCards[1].querySelector('.stat-value');
      const change = statCards[1].querySelector('.stat-change');
      if (value) value.textContent = summary.positiveRate + '%';
      if (change) change.innerHTML = '<i class="fa-solid fa-chart-simple"></i> estimated from post text';
    }
    if (statCards[2]) {
      const value = statCards[2].querySelector('.stat-value');
      const change = statCards[2].querySelector('.stat-change');
      if (value) value.textContent = String(summary.topics.length || 1);
      if (change) change.innerHTML = '<i class="fa-solid fa-hashtag"></i> topics found in upload';
    }
    if (statCards[3]) {
      const value = statCards[3].querySelector('.stat-value');
      const change = statCards[3].querySelector('.stat-change');
      if (value) value.textContent = summary.topPlatform;
      if (change) change.innerHTML = '<i class="fa-solid fa-share-nodes"></i> top platform';
    }
    const subtitle = qs('.topbar-subtitle');
    if (subtitle) subtitle.textContent = `Overview from uploaded dataset: ${summary.datasetName}`;
  }

  if (page === 'sentiment.html') {
    const score = (summary.positiveRate / 10).toFixed(1);
    qsa('.card').forEach(card => {
      const title = card.querySelector('.card-title')?.textContent.trim();
      if (title === 'Overall Score') {
        const big = card.querySelector('div[style*="font-size:26px"]');
        const based = [...card.querySelectorAll('div')].find(el => el.textContent.includes('Based on'));
        const label = [...card.querySelectorAll('div')].find(el => /Mostly|Positive|Neutral|Negative/.test(el.textContent));
        if (big) big.textContent = score;
        if (based) based.textContent = `Based on ${summary.totalPosts.toLocaleString()} uploaded posts`;
        if (label) label.textContent = summary.positiveRate >= 55 ? 'Mostly Positive' : summary.positiveRate >= 35 ? 'Mixed Sentiment' : 'Mostly Negative';
      }
      if (title === 'Sentiment Breakdown') {
        const rows = card.querySelectorAll('.flex.items-center.justify-between.text-sm');
        const bars = card.querySelectorAll('.progress-fill');
        const rates = [summary.positiveRate, neutralRate, negativeRate];
        rows.forEach((row, index) => {
          const value = row.querySelector('.font-bold');
          if (value) value.textContent = rates[index] + '%';
        });
        bars.forEach((bar, index) => {
          bar.style.width = rates[index] + '%';
          bar.dataset.width = rates[index];
        });
      }
    });
    qsa('.filter-pill').forEach(btn => {
      const text = btn.textContent.toLowerCase();
      if (text.includes('positive')) btn.innerHTML = '<i class="fa-solid fa-face-smile"></i> Positive ' + summary.positiveCount;
      if (text.includes('neutral')) btn.innerHTML = '<i class="fa-solid fa-face-meh"></i> Neutral ' + summary.neutralCount;
      if (text.includes('negative')) btn.innerHTML = '<i class="fa-solid fa-face-frown"></i> Negative ' + summary.negativeCount;
    });
  }

  if (page === 'trends.html') {
    if (statCards[0]) {
      const value = statCards[0].querySelector('.stat-value');
      if (value) value.textContent = summary.trendConfidence + '%';
    }
    if (statCards[1]) {
      const value = statCards[1].querySelector('.stat-value');
      if (value) value.textContent = summary.topics.length || 1;
    }
    const firstTopic = qs('.trend-topic-name');
    if (firstTopic && summary.topics[0]) firstTopic.textContent = '#' + summary.topics[0];
  }

  if (page === 'reports.html') {
    qsa('div').forEach(el => {
      const text = el.textContent.trim();
      if (text === '248,391' || text === '248391') el.textContent = summary.totalPosts.toLocaleString();
      if (text === '67%' || text === '71%') el.textContent = summary.positiveRate + '%';
    });
    const datasetInput = qs('#report-dataset');
    if (datasetInput) datasetInput.value = summary.datasetName;
  }
}

function applyDataSourceLabel() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const analyticsPages = new Set([
    'dashboard.html',
    'sentiment.html',
    'trends.html',
    'topics.html',
    'audience.html',
    'platforms.html',
    'reports.html',
    'alerts.html'
  ]);
  if (!analyticsPages.has(page)) return;

  const pageContent = qs('.page-content');
  if (!pageContent || qs('#data-source-banner')) return;
  const uploaded = hasAnalyticsData();
  const datasetName = getActiveDatasetName();
  const label = uploaded ? 'Uploaded data' : 'Demo data';
  const summary = getAnalyticsSummary();
  const detail = uploaded && summary
    ? `Showing estimated results from ${datasetName}: ${summary.totalPosts.toLocaleString()} posts, ${summary.positiveRate}% positive, top platform ${summary.topPlatform}.`
    : uploaded
      ? `Showing the dashboard layout with dataset context from ${datasetName}.`
      : 'Showing demo analytics so the UI is populated before Admin or Analyst uploads real data.';
  const roleBanner = qs('#role-context-banner');
  const html = `
    <div class="data-source-banner" id="data-source-banner">
      <span class="badge badge-neutral">${label}</span>
      <span>${detail}</span>
    </div>
  `;
  if (roleBanner) roleBanner.insertAdjacentHTML('afterend', html);
  else pageContent.insertAdjacentHTML('afterbegin', html);
}


// ─── Init on DOM ready ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  OAuth.completeGoogleLoginFromHash();
  injectRoleStyles();
  setActiveNav();
  populateUserInfo();
  applyRoleRestrictions();
  bindLogout();
  animateCounters();
  animateProgressBars();
  applyChartDefaults();
  applyDataSourceLabel();
  applyUploadedResults();
  
  // Apply saved theme
  const savedTheme = localStorage.getItem('ssmap-theme') || 'dark';
  applyStoredTheme(savedTheme);
  
  // Theme is intentionally monochrome, so saved accent colors are ignored.
});