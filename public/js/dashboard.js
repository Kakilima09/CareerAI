/**
 * CareerAI Mentor — Dashboard page controller (user + admin)
 */

const INTENT_META = {
  general_question: { label: 'Pertanyaan Umum', badge: 'bg-secondary' },
  career_advice: { label: 'Konsultasi Karier', badge: 'bg-primary' },
  cv_review: { label: 'Review CV', badge: 'bg-info' },
  skill_gap: { label: 'Analisis Skill Gap', badge: 'bg-warning' },
  learning_roadmap: { label: 'Roadmap Belajar', badge: 'bg-success' },
  mock_interview: { label: 'Mock Interview', badge: 'bg-danger' },
  out_of_scope: { label: 'Di Luar Topik', badge: 'bg-dark' }
};

const Dashboard = {
  token: null,
  user: null,

  init() {
    this.token = localStorage.getItem('careerai_token');
    if (!this.token) {
      window.location.replace('/login.html');
      return;
    }
    document.getElementById('btnLogout').addEventListener('click', () => this.logout());
    this.load();
  },

  authHeaders(extra = {}) {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}`, ...extra };
  },

  async authFetch(url, options = {}) {
    const res = await fetch(url, { ...options, headers: this.authHeaders(options.headers || {}) });
    if (res.status === 401) {
      this.logout();
      throw new Error('Sesi berakhir. Silakan masuk kembali.');
    }
    return res;
  },

  logout() {
    localStorage.removeItem('careerai_token');
    localStorage.removeItem('careerai_user');
    window.location.replace('/login.html');
  },

  escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  async load() {
    try {
      const meRes = await this.authFetch('/api/auth/me');
      const meJson = await meRes.json();
      if (!meJson.success) throw new Error('Gagal memuat profil.');
      this.user = meJson.data.user;
      localStorage.setItem('careerai_user', JSON.stringify(this.user));
      this.renderUser();

      await this.loadStats();
      document.getElementById('loadingState').classList.add('d-none');
      document.getElementById('dashboardContent').classList.remove('d-none');

      if (this.user.role === 'admin') {
        this.loadAdmin();
      }
    } catch (err) {
      console.error(err);
      const ls = document.getElementById('loadingState');
      ls.innerHTML = `<div class="text-danger"><i class="bi bi-exclamation-triangle"></i> ${this.escapeHtml(err.message)}</div>`;
    }
  },

  renderUser() {
    document.getElementById('userName').textContent = this.user.name;
    document.getElementById('greetingName').textContent = this.user.name.split(' ')[0];
    const roleEl = document.getElementById('userRole');
    roleEl.textContent = this.user.role;
    if (this.user.role === 'admin') {
      roleEl.classList.remove('bg-indigo-900', 'border-indigo-700');
      roleEl.classList.add('bg-danger');
    }
  },

  async loadStats() {
    const res = await this.authFetch('/api/dashboard/stats');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal memuat statistik.');
    const d = json.data;

    document.getElementById('statConversations').textContent = d.totalConversations;
    document.getElementById('statMessages').textContent = d.totalMessages;
    document.getElementById('statMemberSince').textContent = this.formatDate(d.memberSince);

    this.renderRecentConversations(d.recentConversations);
    this.renderIntentBreakdown(d.intents);
  },

  renderRecentConversations(conversations) {
    const container = document.getElementById('recentConversations');
    if (!conversations || conversations.length === 0) {
      container.innerHTML = `<div class="text-center py-4" style="color:var(--slate-400);">
        <i class="bi bi-chat-dots fs-3 d-block mb-2"></i> Belum ada percakapan.
        <div class="mt-2"><a href="/index.html" class="btn btn-sm btn-primary" style="background:var(--indigo-600);border:none;">Mulai Chat</a></div>
      </div>`;
      return;
    }

    const rows = conversations.map(c => {
      const meta = INTENT_META[c.intent] || { label: c.intent, badge: 'bg-secondary' };
      return `<a href="/index.html" class="d-flex align-items-center gap-3 text-decoration-none py-2 px-1 border-bottom" style="border-color:var(--border-color)!important;color:var(--slate-200);">
        <span class="badge ${meta.badge}">${this.escapeHtml(meta.label)}</span>
        <span class="flex-grow-1 text-truncate">${this.escapeHtml(c.title)}</span>
        <span class="text-nowrap" style="font-size:0.76rem;color:var(--slate-400);"><i class="bi bi-chat-left-text"></i> ${c.message_count}</span>
      </a>`;
    }).join('');

    container.innerHTML = rows;
  },

  renderIntentBreakdown(intents) {
    const container = document.getElementById('intentBreakdown');
    if (!intents || intents.length === 0) {
      container.innerHTML = `<div class="text-center py-3" style="color:var(--slate-400);font-size:0.85rem;">Belum ada data topik.</div>`;
      return;
    }
    const total = intents.reduce((sum, i) => sum + i.total, 0) || 1;
    container.innerHTML = intents.map(i => {
      const meta = INTENT_META[i.intent] || { label: i.intent, badge: 'bg-secondary' };
      const pct = Math.round((i.total / total) * 100);
      return `<div class="mb-3">
        <div class="d-flex justify-content-between mb-1" style="font-size:0.82rem;">
          <span>${this.escapeHtml(meta.label)}</span>
          <span style="color:var(--slate-400);">${i.total} (${pct}%)</span>
        </div>
        <div class="progress" style="height:6px;background:var(--navy-900);">
          <div class="progress-bar" role="progressbar" style="width:${pct}%;background:var(--indigo-500);"></div>
        </div>
      </div>`;
    }).join('');
  },

  // --- Admin ---
  adminListenersBound: false,

  async loadAdmin() {
    document.getElementById('adminSection').classList.remove('d-none');

    if (!this.adminListenersBound) {
      document.getElementById('adminUsersBody').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-delete-user]');
        if (btn) this.deleteUser(btn.getAttribute('data-delete-user'), btn.getAttribute('data-name'));
      });
      document.getElementById('adminConversationsBody').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-delete-conv]');
        if (btn) this.deleteConversation(btn.getAttribute('data-delete-conv'));
      });
      this.adminListenersBound = true;
    }

    await this.refreshAdminData();
  },

  async refreshAdminData() {
    try {
      await Promise.all([this.loadAdminStats(), this.loadAdminUsers(), this.loadAdminConversations()]);
    } catch (err) {
      console.error('Admin load error:', err);
    }
  },

  async loadAdminStats() {
    const res = await this.authFetch('/api/admin/stats');
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    document.getElementById('adminStatUsers').textContent = json.data.totalUsers;
    document.getElementById('adminStatAdmins').textContent = json.data.adminCount;
    document.getElementById('adminStatConversations').textContent = json.data.totalConversations;
    document.getElementById('adminStatMessages').textContent = json.data.totalMessages;
  },

  async loadAdminUsers() {
    const res = await this.authFetch('/api/admin/users');
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    document.getElementById('adminUsersBody').innerHTML = json.data.map(u => `
      <tr>
        <td class="fw-semibold">${this.escapeHtml(u.name)}</td>
        <td style="color:var(--slate-400);">${this.escapeHtml(u.email)}</td>
        <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-secondary'}">${this.escapeHtml(u.role)}</span></td>
        <td>${u.conversation_count}</td>
        <td style="color:var(--slate-400);">${this.formatDate(u.created_at)}</td>
        <td class="text-end">
          ${u.id === this.user.id
            ? '<span class="text-muted" style="font-size:0.76rem;">Anda</span>'
            : `<button class="btn btn-sm btn-outline-danger py-0 px-2" data-delete-user="${this.escapeHtml(u.id)}" data-name="${this.escapeHtml(u.name)}" style="font-size:0.76rem;"><i class="bi bi-trash"></i></button>`}
        </td>
      </tr>
    `).join('');
  },

  async loadAdminConversations() {
    const res = await this.authFetch('/api/admin/conversations');
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    document.getElementById('adminConversationsBody').innerHTML = json.data.map(c => {
      const meta = INTENT_META[c.intent] || { label: c.intent, badge: 'bg-secondary' };
      const owner = c.owner_name ? `${this.escapeHtml(c.owner_name)}` : '<em style="color:var(--slate-400);">Tamu</em>';
      return `<tr>
        <td class="fw-semibold text-truncate" style="max-width:260px;">${this.escapeHtml(c.title)}</td>
        <td style="color:var(--slate-400);">${owner}</td>
        <td><span class="badge ${meta.badge}">${this.escapeHtml(meta.label)}</span></td>
        <td>${c.message_count}</td>
        <td style="color:var(--slate-400);">${this.formatDateTime(c.updated_at)}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-danger py-0 px-2" data-delete-conv="${this.escapeHtml(c.id)}" style="font-size:0.76rem;"><i class="bi bi-trash"></i></button></td>
      </tr>`;
    }).join('');

    if (json.data.length === 0) {
      document.getElementById('adminConversationsBody').innerHTML = '<tr><td colspan="6" class="text-center py-4" style="color:var(--slate-400);">Belum ada percakapan.</td></tr>';
    }
  },

  async deleteUser(id, name) {
    if (!confirm(`Hapus pengguna "${name}" beserta semua percakapannya?`)) return;
    const res = await this.authFetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) return alert(json.error || 'Gagal menghapus pengguna.');
    await this.refreshAdminData();
  },

  async deleteConversation(id) {
    if (!confirm('Hapus percakapan ini?')) return;
    const res = await this.authFetch(`/api/admin/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) return alert(json.error || 'Gagal menghapus percakapan.');
    await this.refreshAdminData();
  }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
