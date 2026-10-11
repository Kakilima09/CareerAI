/**
 * CareerAI Mentor — Frontend Application Engine
 * Includes User Authentication (Login/Register), Conversation Management,
 * AI Parameter Presets, and Specialized Career Modules.
 */

class CareerAIApp {
  constructor() {
    this.currentConversationId = null;
    this.conversations = [];
    this.activePreset = 'balanced';
    this.activeModel = 'gemini-flash-lite-latest';
    this.temperature = 0.7;
    this.topP = 0.9;
    this.maxOutputTokens = 2048;
    this.isLoading = false;
    this.lastFailedMessage = null;

    // Authentication State
    this.token = localStorage.getItem('careerai_token') || null;
    try {
      this.user = JSON.parse(localStorage.getItem('careerai_user') || 'null');
    } catch (_) {
      this.user = null;
    }

    this.initElements();
    this.initMarked();
    this.bindEvents();
    this.loadConfig();
    this.initAuth();
    this.loadConversations();
  }

  initElements() {
    this.sidebar = document.getElementById('sidebar');
    this.sidebarBackdrop = document.getElementById('sidebarBackdrop');
    this.btnToggleSidebar = document.getElementById('btnToggleSidebar');
    this.conversationsList = document.getElementById('conversationsList');
    this.chatMessages = document.getElementById('chatMessages');
    this.emptyState = document.getElementById('emptyState');
    this.chatInput = document.getElementById('chatInput');
    this.btnSend = document.getElementById('btnSend');
    this.btnNewChat = document.getElementById('btnNewChat');
    this.charCounter = document.getElementById('charCounter');
    this.chatTitle = document.getElementById('chatTitle');
    this.headerModelBadge = document.getElementById('headerModelBadge');
    this.headerPresetBadge = document.getElementById('headerPresetBadge');
    this.headerIntentBadge = document.getElementById('headerIntentBadge');
    this.errorBanner = document.getElementById('errorBanner');
    this.errorMessage = document.getElementById('errorMessage');
    this.btnRetry = document.getElementById('btnRetry');
    this.apiStatusBadge = document.getElementById('apiStatusBadge');
    this.apiStatusText = document.getElementById('apiStatusText');
    this.sidebarActivePreset = document.getElementById('sidebarActivePreset');
    this.sidebarActiveModel = document.getElementById('sidebarActiveModel');
    this.searchConvInput = document.getElementById('searchConvInput');

    // Auth Elements
    this.authModalEl = document.getElementById('authModal');
    this.authModal = new bootstrap.Modal(this.authModalEl);
    this.authAlert = document.getElementById('authAlert');
    this.btnOpenAuthModal = document.getElementById('btnOpenAuthModal');
    this.userProfileBadge = document.getElementById('userProfileBadge');
    this.headerUserName = document.getElementById('headerUserName');
    this.sidebarGuestPrompt = document.getElementById('sidebarGuestPrompt');
    this.sidebarUserPrompt = document.getElementById('sidebarUserPrompt');
    this.sidebarUserEmail = document.getElementById('sidebarUserEmail');

    // Settings Modal elements
    this.btnOpenSettings = document.getElementById('btnOpenSettings');
    this.btnHeaderSettings = document.getElementById('btnHeaderSettings');
    this.settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
    this.selectModel = document.getElementById('selectModel');
    this.rangeTemperature = document.getElementById('rangeTemperature');
    this.tempValue = document.getElementById('tempValue');
    this.rangeTopP = document.getElementById('rangeTopP');
    this.topPValue = document.getElementById('topPValue');
    this.selectMaxTokens = document.getElementById('selectMaxTokens');
    this.presetDescription = document.getElementById('presetDescription');
    this.btnSaveSettings = document.getElementById('btnSaveSettings');

    // Feature Modals
    this.cvModalEl = document.getElementById('cvModal');
    this.cvModal = new bootstrap.Modal(this.cvModalEl);
    this.btnSubmitCV = document.getElementById('btnSubmitCV');
    this.btnImportCV = document.getElementById('btnImportCV');
    this.cvFileInput = document.getElementById('cvFileInput');
    this.cvFileStatus = document.getElementById('cvFileStatus');
    this.cvTextContent = document.getElementById('cvTextContent');

    this.skillGapModalEl = document.getElementById('skillGapModal');
    this.skillGapModal = new bootstrap.Modal(this.skillGapModalEl);
    this.btnSubmitSkillGap = document.getElementById('btnSubmitSkillGap');

    this.roadmapModalEl = document.getElementById('roadmapModal');
    this.roadmapModal = new bootstrap.Modal(this.roadmapModalEl);
    this.btnSubmitRoadmap = document.getElementById('btnSubmitRoadmap');

    this.interviewModalEl = document.getElementById('interviewModal');
    this.interviewModal = new bootstrap.Modal(this.interviewModalEl);
    this.btnStartInterview = document.getElementById('btnStartInterview');
  }

  initMarked() {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
        highlight: function(code, lang) {
          if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (_) {}
          }
          return typeof hljs !== 'undefined' ? hljs.highlightAuto(code).value : code;
        }
      });
    }
  }

  bindEvents() {
    // Mobile sidebar toggle
    this.btnToggleSidebar?.addEventListener('click', () => this.toggleMobileSidebar(true));
    this.sidebarBackdrop?.addEventListener('click', () => this.toggleMobileSidebar(false));

    // New Chat
    this.btnNewChat.addEventListener('click', () => this.startNewChat());

    // Input text handling
    this.chatInput.addEventListener('input', () => {
      this.autoResizeTextarea();
      this.updateCharCounter();
    });

    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.btnSend.addEventListener('click', () => this.sendMessage());

    // Error retry
    this.btnRetry.addEventListener('click', () => {
      if (this.lastFailedMessage) {
        this.chatInput.value = this.lastFailedMessage;
        this.hideError();
        this.sendMessage();
      }
    });

    // Search conversations
    this.searchConvInput.addEventListener('input', (e) => this.filterConversations(e.target.value));

    // Settings Modal
    const openSettings = () => {
      if (this.selectModel && this.activeModel && Array.from(this.selectModel.options).some(o => o.value === this.activeModel)) {
        this.selectModel.value = this.activeModel;
      }
      this.settingsModal.show();
    };
    this.btnOpenSettings?.addEventListener('click', openSettings);
    this.btnHeaderSettings?.addEventListener('click', openSettings);

    this.rangeTemperature.addEventListener('input', (e) => {
      this.tempValue.textContent = e.target.value;
    });

    this.rangeTopP.addEventListener('input', (e) => {
      this.topPValue.textContent = e.target.value;
    });

    document.querySelectorAll('input[name="presetRadio"]').forEach(radio => {
      radio.addEventListener('change', (e) => this.onPresetRadioChange(e.target.value));
    });

    this.btnSaveSettings.addEventListener('click', () => this.saveSettings());

    // Action modals
    this.btnSubmitCV.addEventListener('click', () => this.handleCVSubmit());

    // CV file import (PDF/Word/TXT) — via button, picker, or drag & drop
    this.btnImportCV?.addEventListener('click', () => this.cvFileInput?.click());
    this.cvFileInput?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) this.handleCVFileImport(file);
    });
    if (this.cvTextContent) {
      ['dragover', 'dragenter'].forEach(evt =>
        this.cvTextContent.addEventListener(evt, (e) => e.preventDefault())
      );
      this.cvTextContent.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) this.handleCVFileImport(file);
      });
    }
    this.btnSubmitSkillGap.addEventListener('click', () => this.handleSkillGapSubmit());
    this.btnSubmitRoadmap.addEventListener('click', () => this.handleRoadmapSubmit());
    this.btnStartInterview.addEventListener('click', () => this.handleStartInterview());
  }

  // --- Authentication Helpers ---
  getAuthHeaders(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async initAuth() {
    this.updateAuthUI();
    if (this.token) {
      try {
        const res = await fetch('/api/auth/me', { headers: this.getAuthHeaders() });
        const json = await res.json();
        if (json.success && json.data.user) {
          this.user = json.data.user;
          localStorage.setItem('careerai_user', JSON.stringify(this.user));
          this.updateAuthUI();
        } else {
          this.logout(false);
        }
      } catch (err) {
        console.warn('Auth check error:', err);
      }
    }
  }

  updateAuthUI() {
    if (this.user) {
      this.btnOpenAuthModal?.classList.add('d-none');
      this.userProfileBadge?.classList.remove('d-none');
      this.userProfileBadge?.classList.add('d-flex');
      if (this.headerUserName) this.headerUserName.textContent = this.user.name;

      this.sidebarGuestPrompt?.classList.add('d-none');
      this.sidebarUserPrompt?.classList.remove('d-none');
      this.sidebarUserPrompt?.classList.add('d-flex');
      if (this.sidebarUserEmail) this.sidebarUserEmail.textContent = this.user.email;
    } else {
      this.btnOpenAuthModal?.classList.remove('d-none');
      this.userProfileBadge?.classList.add('d-none');
      this.userProfileBadge?.classList.remove('d-flex');

      this.sidebarGuestPrompt?.classList.remove('d-none');
      this.sidebarGuestPrompt?.classList.add('d-flex');
      this.sidebarUserPrompt?.classList.add('d-none');
      this.sidebarUserPrompt?.classList.remove('d-flex');
    }
  }

  openAuthModal(tab = 'login') {
    if (this.authAlert) this.authAlert.classList.add('d-none');
    if (tab === 'register') {
      const regTab = document.getElementById('tab-register');
      if (regTab) bootstrap.Tab.getOrCreateInstance(regTab).show();
    } else {
      const loginTab = document.getElementById('tab-login');
      if (loginTab) bootstrap.Tab.getOrCreateInstance(loginTab).show();
    }
    this.authModal.show();
  }

  async handleLogin() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const submitBtn = document.getElementById('btnLoginSubmit');

    if (!email || !password) return;

    this.authAlert.classList.add('d-none');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Masuk...`;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Login gagal.');
      }

      this.token = json.data.token;
      this.user = json.data.user;
      localStorage.setItem('careerai_token', this.token);
      localStorage.setItem('careerai_user', JSON.stringify(this.user));

      this.updateAuthUI();
      this.authModal.hide();
      this.startNewChat();
      this.loadConversations();
    } catch (err) {
      this.authAlert.textContent = err.message;
      this.authAlert.classList.remove('d-none');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk ke CareerAI';
    }
  }

  async handleRegister() {
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const submitBtn = document.getElementById('btnRegisterSubmit');

    if (!name || !email || !password) return;

    this.authAlert.classList.add('d-none');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Mendaftar...`;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Registrasi gagal.');
      }

      this.token = json.data.token;
      this.user = json.data.user;
      localStorage.setItem('careerai_token', this.token);
      localStorage.setItem('careerai_user', JSON.stringify(this.user));

      this.updateAuthUI();
      this.authModal.hide();
      this.startNewChat();
      this.loadConversations();
    } catch (err) {
      this.authAlert.textContent = err.message;
      this.authAlert.classList.remove('d-none');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Daftar Akun Baru';
    }
  }

  logout(reload = true) {
    this.token = null;
    this.user = null;
    localStorage.removeItem('careerai_token');
    localStorage.removeItem('careerai_user');
    this.updateAuthUI();
    if (reload) {
      this.startNewChat();
      this.loadConversations();
    }
  }

  // --- Layout & UI Helpers ---
  toggleMobileSidebar(show) {
    if (show) {
      this.sidebar.classList.add('open');
      this.sidebarBackdrop.classList.add('show');
    } else {
      this.sidebar.classList.remove('open');
      this.sidebarBackdrop.classList.remove('show');
    }
  }

  autoResizeTextarea() {
    this.chatInput.style.height = 'auto';
    this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 180) + 'px';
  }

  updateCharCounter() {
    const len = this.chatInput.value.length;
    this.charCounter.textContent = `${len} / 4000`;
    if (len > 3800) {
      this.charCounter.classList.add('text-warning');
    } else {
      this.charCounter.classList.remove('text-warning');
    }
  }

  async loadConfig() {
    try {
      const res = await fetch('/api/config');
      const json = await res.json();
      if (json.success) {
        const { activeModel, hasApiKey } = json.data;
        this.activeModel = activeModel;
        this.sidebarActiveModel.textContent = activeModel;
        this.headerModelBadge.textContent = activeModel;

        // Keep the settings dropdown in sync with the server default model
        if (this.selectModel && Array.from(this.selectModel.options).some(o => o.value === activeModel)) {
          this.selectModel.value = activeModel;
        }

        if (hasApiKey) {
          this.apiStatusBadge.querySelector('.status-dot').style.backgroundColor = 'var(--emerald-500)';
          this.apiStatusText.textContent = 'Gemini Ready';
        } else {
          this.apiStatusBadge.querySelector('.status-dot').style.backgroundColor = 'var(--amber-500)';
          this.apiStatusText.textContent = 'API Key Missing (.env)';
        }
      }
    } catch (err) {
      console.warn('Failed to fetch config:', err);
    }
  }

  async loadConversations() {
    try {
      const res = await fetch('/api/conversations', { headers: this.getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        this.conversations = json.data;
        this.renderConversationsList();
      }
    } catch (err) {
      this.conversationsList.innerHTML = `<div class="p-3 text-center text-muted" style="font-size:0.8rem;">Gagal memuat percakapan.</div>`;
    }
  }

  renderConversationsList() {
    if (this.conversations.length === 0) {
      this.conversationsList.innerHTML = `
        <div class="text-center py-4 text-muted" style="font-size: 0.8rem;">
          <i class="bi bi-chat-dots fs-4 d-block mb-1 opacity-50"></i>
          Belum ada riwayat percakapan.
        </div>`;
      return;
    }

    this.conversationsList.innerHTML = this.conversations.map(c => `
      <div class="conversation-item ${c.id === this.currentConversationId ? 'active' : ''}" 
           onclick="app.selectConversation('${c.id}')" data-id="${c.id}">
        <div class="conversation-meta">
          <span class="conv-title">${this.escapeHtml(c.title || 'Percakapan')}</span>
          <span class="conv-time">${new Date(c.updated_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <button class="conv-delete-btn" onclick="event.stopPropagation(); app.deleteConversation('${c.id}')" title="Hapus Percakapan">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `).join('');
  }

  filterConversations(keyword) {
    const q = keyword.toLowerCase().trim();
    const items = this.conversationsList.querySelectorAll('.conversation-item');
    items.forEach(el => {
      const title = el.querySelector('.conv-title')?.textContent.toLowerCase() || '';
      el.style.display = title.includes(q) ? 'flex' : 'none';
    });
  }

  async selectConversation(id) {
    if (this.isLoading) return;
    this.currentConversationId = id;
    this.toggleMobileSidebar(false);
    this.hideError();

    // Set active in list
    document.querySelectorAll('.conversation-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-id') === id);
    });

    try {
      this.chatMessages.innerHTML = `
        <div class="d-flex justify-content-center align-items-center h-100">
          <div class="spinner-border text-primary" role="status"></div>
        </div>`;

      const res = await fetch(`/api/conversations/${id}`, { headers: this.getAuthHeaders() });
      const json = await res.json();

      if (json.success) {
        const conv = json.data;
        this.chatTitle.textContent = conv.title || 'Percakapan';
        this.activePreset = conv.preset || 'balanced';
        this.updatePresetUI();
        this.renderMessages(conv.messages || []);
      } else {
        this.showError(json.error || 'Gagal memuat percakapan');
      }
    } catch (err) {
      this.showError('Koneksi terputus saat mengambil percakapan.');
    }
  }

  async deleteConversation(id) {
    if (!confirm('Hapus percakapan ini secara permanen?')) return;

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      const json = await res.json();
      if (json.success) {
        this.conversations = this.conversations.filter(c => c.id !== id);
        this.renderConversationsList();
        if (this.currentConversationId === id) {
          this.startNewChat();
        }
      }
    } catch (err) {
      alert('Gagal menghapus percakapan.');
    }
  }

  startNewChat() {
    if (this.isLoading) return;
    this.currentConversationId = null;
    this.chatTitle.textContent = 'Percakapan Baru';
    this.headerIntentBadge.style.display = 'none';
    this.hideError();
    this.chatMessages.innerHTML = '';
    this.chatMessages.appendChild(this.emptyState);
    this.emptyState.style.display = 'block';
    this.chatInput.value = '';
    this.updateCharCounter();
    this.autoResizeTextarea();

    document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
    this.toggleMobileSidebar(false);
  }

  renderMessages(messages) {
    this.chatMessages.innerHTML = '';
    if (!messages || messages.length === 0) {
      this.chatMessages.appendChild(this.emptyState);
      this.emptyState.style.display = 'block';
      return;
    }

    this.emptyState.style.display = 'none';
    messages.forEach(msg => {
      this.appendMessageRow(msg.role, msg.content, msg.intent, msg.created_at);
    });

    this.scrollToBottom();
  }

  appendMessageRow(role, content, intent = null, timestamp = null) {
    if (this.emptyState) {
      this.emptyState.style.display = 'none';
    }

    const isUser = role === 'user';
    const row = document.createElement('div');
    row.className = `message-row ${isUser ? 'user' : 'model'}`;

    const timeStr = timestamp
      ? new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    let formattedBody = '';
    if (isUser) {
      formattedBody = `<div class="message-bubble">${this.escapeHtml(content).replace(/\n/g, '<br>')}</div>`;
    } else {
      const parsedHtml = (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined')
        ? DOMPurify.sanitize(marked.parse(content))
        : this.escapeHtml(content);

      formattedBody = `
        <div class="message-bubble">${parsedHtml}</div>
        <div class="message-actions">
          <button class="btn-msg-copy" onclick="app.copyToClipboard(this)">
            <i class="bi bi-clipboard"></i> Salin
          </button>
        </div>
      `;
    }

    const intentTag = (!isUser && intent && intent !== 'general_question')
      ? `<span class="badge-intent">${intent.replace('_', ' ')}</span>`
      : '';

    row.innerHTML = `
      <div class="message-avatar ${isUser ? 'user' : 'ai'}">
        <i class="bi ${isUser ? 'bi-person' : 'bi-stars'}"></i>
      </div>
      <div class="message-content-wrapper">
        ${formattedBody}
        <div class="message-meta">
          <span>${timeStr}</span>
          ${intentTag}
        </div>
      </div>
    `;

    this.chatMessages.appendChild(row);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'typingIndicatorRow';
    indicator.className = 'message-row model';
    indicator.innerHTML = `
      <div class="message-avatar ai">
        <i class="bi bi-stars"></i>
      </div>
      <div class="message-content-wrapper">
        <div class="message-bubble" style="padding: 0.75rem 1rem;">
          <div class="typing-indicator">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
        </div>
      </div>
    `;
    this.chatMessages.appendChild(indicator);
    this.scrollToBottom();
  }

  removeTypingIndicator() {
    const ind = document.getElementById('typingIndicatorRow');
    if (ind) ind.remove();
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  async sendMessage(customText = null, explicitIntent = null) {
    const text = customText || this.chatInput.value.trim();
    if (!text || this.isLoading) return;

    this.hideError();
    this.setLoading(true);

    if (!customText) {
      this.chatInput.value = '';
      this.updateCharCounter();
      this.autoResizeTextarea();
    }

    // Append user message immediately
    this.appendMessageRow('user', text);
    this.showTypingIndicator();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          message: text,
          conversationId: this.currentConversationId,
          preset: this.activePreset,
          customModel: this.activeModel,
          explicitIntent,
          parameters: {
            temperature: this.temperature,
            topP: this.topP,
            maxOutputTokens: this.maxOutputTokens
          }
        })
      });

      const json = await response.json();
      this.removeTypingIndicator();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Gagal memproses pesan');
      }

      const { reply, conversationId, intent } = json.data;

      // Update state & UI
      if (!this.currentConversationId) {
        this.currentConversationId = conversationId;
        this.loadConversations();
      }

      if (intent) {
        this.headerIntentBadge.textContent = intent.replace('_', ' ');
        this.headerIntentBadge.style.display = 'inline-block';
      }

      this.appendMessageRow('model', reply, intent);

    } catch (err) {
      this.removeTypingIndicator();
      this.lastFailedMessage = text;
      this.showError(err.message || 'Terjadi kesalahan pada server saat menghubungi Gemini API.');
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.btnSend.disabled = loading;
    if (loading) {
      this.btnSend.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`;
    } else {
      this.btnSend.innerHTML = `<span>Kirim</span> <i class="bi bi-send-fill" style="font-size: 0.8rem;"></i>`;
    }
  }

  showError(msg) {
    this.errorMessage.textContent = msg;
    this.errorBanner.classList.remove('d-none');
    this.scrollToBottom();
  }

  hideError() {
    this.errorBanner.classList.add('d-none');
  }

  useQuickPrompt(promptText) {
    this.chatInput.value = promptText;
    this.updateCharCounter();
    this.autoResizeTextarea();
    this.chatInput.focus();
  }

  copyToClipboard(btnEl) {
    const bubble = btnEl.closest('.message-content-wrapper')?.querySelector('.message-bubble');
    if (!bubble) return;

    navigator.clipboard.writeText(bubble.innerText).then(() => {
      const originalText = btnEl.innerHTML;
      btnEl.innerHTML = `<i class="bi bi-check2 text-success"></i> Disalin!`;
      setTimeout(() => { btnEl.innerHTML = originalText; }, 2000);
    });
  }

  // Preset UI updates
  onPresetRadioChange(presetKey) {
    this.activePreset = presetKey;
    const presets = {
      accurate: { temp: 0.2, topP: 0.8, desc: 'Structured career analysis, CV review, and factual evaluation with minimal variance.' },
      balanced: { temp: 0.7, topP: 0.9, desc: 'General career consulting, natural conversational tone, and balanced guidance.' },
      creative: { temp: 1.0, topP: 0.95, desc: 'Brainstorming career alternatives, project ideas, learning exploration, and creative solutions.' }
    };

    const p = presets[presetKey];
    if (p) {
      this.rangeTemperature.value = p.temp;
      this.tempValue.textContent = p.temp;
      this.rangeTopP.value = p.topP;
      this.topPValue.textContent = p.topP;
      this.presetDescription.textContent = p.desc;
    }
  }

  saveSettings() {
    this.temperature = parseFloat(this.rangeTemperature.value);
    this.topP = parseFloat(this.rangeTopP.value);
    this.maxOutputTokens = parseInt(this.selectMaxTokens.value, 10);
    this.activeModel = this.selectModel.value;

    this.updatePresetUI();
    this.settingsModal.hide();
  }

  updatePresetUI() {
    const titleCase = this.activePreset.charAt(0).toUpperCase() + this.activePreset.slice(1);
    this.sidebarActivePreset.textContent = titleCase;
    this.headerPresetBadge.textContent = `Preset: ${titleCase}`;
    this.headerModelBadge.textContent = this.activeModel;
    this.sidebarActiveModel.textContent = this.activeModel;
  }

  // Feature Modals Form Submissions
  async handleCVSubmit() {
    const targetRole = document.getElementById('cvTargetRole').value.trim() || 'General Tech Role';
    const jobDescription = document.getElementById('cvJobDesc').value.trim();
    const cvText = document.getElementById('cvTextContent').value.trim();

    if (cvText.length < 20) {
      alert('Mohon masukkan setidaknya 20 karakter konten CV.');
      return;
    }

    this.cvModal.hide();
    this.setLoading(true);
    this.hideError();

    const summaryText = `[Permintaan CV Review]\nPosisi Target: ${targetRole}\n\nKonten CV:\n${cvText.slice(0, 200)}...`;
    this.appendMessageRow('user', summaryText);
    this.showTypingIndicator();

    try {
      const res = await fetch('/api/specialized/cv-review', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          targetRole,
          jobDescription,
          cvText,
          conversationId: this.currentConversationId
        })
      });

      const json = await res.json();
      this.removeTypingIndicator();

      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal mereview CV');

      if (!this.currentConversationId) {
        this.currentConversationId = json.data.conversationId;
        this.loadConversations();
      }

      this.appendMessageRow('model', json.data.reply, 'cv_review');
    } catch (err) {
      this.removeTypingIndicator();
      this.showError(err.message);
    } finally {
      this.setLoading(false);
    }
  }

  // --- CV File Import (PDF / Word / Text) ---
  setCVFileStatus(message, isError = false, isSuccess = false) {
    if (!this.cvFileStatus) return;
    this.cvFileStatus.textContent = message;
    this.cvFileStatus.classList.remove('d-none', 'text-muted', 'text-danger', 'text-success');
    if (isError) this.cvFileStatus.classList.add('text-danger');
    else if (isSuccess) this.cvFileStatus.classList.add('text-success');
    else this.cvFileStatus.classList.add('text-muted');
  }

  async handleCVFileImport(file) {
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const fileName = file.name || '';
    const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';

    if (file.size > MAX_FILE_SIZE) {
      this.setCVFileStatus(`"${fileName}" melebihi batas 5 MB.`, true);
      return;
    }

    this.setCVFileStatus(`Membaca "${fileName}"...`);

    try {
      let text = '';
      if (ext === 'pdf') {
        text = await this.extractPdfText(file);
      } else if (ext === 'docx') {
        text = await this.extractDocxText(file);
      } else if (ext === 'txt' || ext === 'md') {
        text = await file.text();
      } else {
        throw new Error('Format tidak didukung. Gunakan PDF, DOCX, TXT, atau MD (untuk .doc lama simpan ulang sebagai .docx/.pdf).');
      }

      text = (text || '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (text.length < 20) {
        throw new Error('Teks yang terbaca terlalu pendek. Pastikan CV berisi teks (bukan hasil scan/gambar).');
      }

      this.cvTextContent.value = text;
      this.cvTextContent.dispatchEvent(new Event('input'));
      this.setCVFileStatus(`${fileName} • ${text.length.toLocaleString('id-ID')} karakter dimuat`, false, true);
    } catch (err) {
      this.setCVFileStatus(err.message, true);
    } finally {
      if (this.cvFileInput) this.cvFileInput.value = '';
    }
  }

  async extractPdfText(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('Pustaka pembaca PDF belum termuat. Periksa koneksi internet lalu coba lagi.');
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      let pageText = '';
      content.items.forEach((item) => {
        pageText += item.str;
        if (item.hasEOL) pageText += '\n';
      });
      pages.push(pageText);
    }

    return pages.join('\n\n');
  }

  async extractDocxText(file) {
    if (typeof mammoth === 'undefined') {
      throw new Error('Pustaka pembaca Word belum termuat. Periksa koneksi internet lalu coba lagi.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  async handleSkillGapSubmit() {
    const targetRole = document.getElementById('gapTargetRole').value.trim();
    const currentSkills = document.getElementById('gapCurrentSkills').value.trim();
    const experienceLevel = document.getElementById('gapLevel').value;
    const availableHours = document.getElementById('gapAvailableHours').value.trim();

    if (!targetRole || !currentSkills) {
      alert('Target posisi dan skill saat ini wajib diisi.');
      return;
    }

    this.skillGapModal.hide();
    this.setLoading(true);
    this.hideError();

    const summaryText = `[Analisis Skill Gap]\nTarget: ${targetRole}\nLevel: ${experienceLevel}\nSkill Saat Ini: ${currentSkills}\nWaktu Belajar: ${availableHours}`;
    this.appendMessageRow('user', summaryText);
    this.showTypingIndicator();

    try {
      const res = await fetch('/api/specialized/skill-gap', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          targetRole,
          currentSkills,
          experienceLevel,
          availableHours,
          conversationId: this.currentConversationId
        })
      });

      const json = await res.json();
      this.removeTypingIndicator();

      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menganalisis skill gap');

      if (!this.currentConversationId) {
        this.currentConversationId = json.data.conversationId;
        this.loadConversations();
      }

      this.appendMessageRow('model', json.data.reply, 'skill_gap');
    } catch (err) {
      this.removeTypingIndicator();
      this.showError(err.message);
    } finally {
      this.setLoading(false);
    }
  }

  async handleRoadmapSubmit() {
    const careerGoal = document.getElementById('roadmapGoal').value.trim();
    const currentLevel = document.getElementById('roadmapLevel').value;
    const weeklyHours = document.getElementById('roadmapWeeklyHours').value;
    const targetMonths = document.getElementById('roadmapTimeline').value;

    if (!careerGoal) {
      alert('Tujuan karier / spesialisasi wajib diisi.');
      return;
    }

    this.roadmapModal.hide();
    this.setLoading(true);
    this.hideError();

    const summaryText = `[Permintaan Roadmap Belajar]\nTarget: ${careerGoal}\nLevel: ${currentLevel}\nKomitmen: ${weeklyHours} jam/minggu selama ${targetMonths} bulan`;
    this.appendMessageRow('user', summaryText);
    this.showTypingIndicator();

    try {
      const res = await fetch('/api/specialized/roadmap', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          careerGoal,
          currentLevel,
          weeklyHours,
          targetMonths,
          conversationId: this.currentConversationId
        })
      });

      const json = await res.json();
      this.removeTypingIndicator();

      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menghasilkan roadmap');

      if (!this.currentConversationId) {
        this.currentConversationId = json.data.conversationId;
        this.loadConversations();
      }

      this.appendMessageRow('model', json.data.reply, 'learning_roadmap');
    } catch (err) {
      this.removeTypingIndicator();
      this.showError(err.message);
    } finally {
      this.setLoading(false);
    }
  }

  async handleStartInterview() {
    const jobRole = document.getElementById('interviewRole').value.trim();
    const difficulty = document.getElementById('interviewDifficulty').value;

    if (!jobRole) {
      alert('Posisi pekerjaan wajib diisi untuk simulasi wawancara.');
      return;
    }

    this.interviewModal.hide();
    this.setLoading(true);
    this.hideError();

    this.appendMessageRow('user', `Halo CareerAI, saya siap memulai simulasi wawancara kerja untuk posisi ${jobRole} (${difficulty}). Silakan berikan pertanyaan pertama.`);
    this.showTypingIndicator();

    try {
      const res = await fetch('/api/specialized/mock-interview', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          jobRole,
          difficulty,
          conversationId: this.currentConversationId
        })
      });

      const json = await res.json();
      this.removeTypingIndicator();

      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal memulai wawancara');

      if (!this.currentConversationId) {
        this.currentConversationId = json.data.conversationId;
        this.loadConversations();
      }

      this.appendMessageRow('model', json.data.reply, 'mock_interview');
    } catch (err) {
      this.removeTypingIndicator();
      this.showError(err.message);
    } finally {
      this.setLoading(false);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate App
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CareerAIApp();
});
