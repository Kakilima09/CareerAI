/**
 * CareerAI Mentor — Login / Register page controller
 */

const CareerAuth = {
  alertEl: null,
  loginBtn: null,
  registerBtn: null,

  init() {
    // Already authenticated? Go straight to the dashboard.
    if (localStorage.getItem('careerai_token')) {
      window.location.replace('/dashboard.html');
      return;
    }
    this.alertEl = document.getElementById('authAlert');
    this.loginBtn = document.getElementById('btnLoginSubmit');
    this.registerBtn = document.getElementById('btnRegisterSubmit');
  },

  showError(message) {
    if (!this.alertEl) return;
    this.alertEl.textContent = message;
    this.alertEl.classList.remove('d-none');
  },

  hideError() {
    this.alertEl && this.alertEl.classList.add('d-none');
  },

  setBusy(btn, busy, busyText, idleText) {
    if (!btn) return;
    btn.disabled = busy;
    btn.innerHTML = busy
      ? `<span class="spinner-border spinner-border-sm me-1"></span> ${busyText}`
      : idleText;
  },

  persist(data) {
    localStorage.setItem('careerai_token', data.token);
    localStorage.setItem('careerai_user', JSON.stringify(data.user));
  },

  async login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return;

    this.hideError();
    this.setBusy(this.loginBtn, true, 'Masuk...', 'Masuk ke Dashboard');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Login gagal.');

      this.persist(json.data);
      window.location.replace('/dashboard.html');
    } catch (err) {
      this.showError(err.message);
    } finally {
      this.setBusy(this.loginBtn, false, '', 'Masuk ke Dashboard');
    }
  },

  async register() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    if (!name || !email || !password) return;

    this.hideError();
    this.setBusy(this.registerBtn, true, 'Mendaftar...', 'Daftar & Masuk');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Registrasi gagal.');

      this.persist(json.data);
      window.location.replace('/dashboard.html');
    } catch (err) {
      this.showError(err.message);
    } finally {
      this.setBusy(this.registerBtn, false, '', 'Daftar & Masuk');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => CareerAuth.init());
