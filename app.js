// ============================================================
// 专利代理师考试刷题 App — 2026 重新设计版
// 响应式：PC侧边栏 + 移动端TabBar + 手动切换
// ============================================================

var App = {
  // ─── 路由配置 ───
  routes: {
    home:    { title: '首页',   icon: '📖', tab: true,  sidebar: true },
    practice:{ title: '练习',   icon: '✏️', tab: true,  sidebar: true },
    mine:    { title: '我的',   icon: '👤', tab: true,  sidebar: true },
    quiz:    { title: '答题',   icon: '',   tab: false, sidebar: false },
    topic:   { title: '专题',   icon: '',   tab: false, sidebar: false },
    subject: { title: '科目',   icon: '',   tab: false, sidebar: false },
    lecture: { title: '讲座',   icon: '',   tab: false, sidebar: false },
  },

  // 中文数字排序
  _cnNum(s) {
    const m = (s || '').match(/专题([一二三四五六七八九十百]+)/);
    if (!m) return 999;
    const cn = m[1];
    const map = {一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
    if (map[cn]) return map[cn];
    if (cn === '十') return 10;
    if (cn.startsWith('十')) return 10 + (map[cn.slice(1)] || 0);
    const m2 = cn.match(/(.+)十(.*)/);
    if (m2) return (map[m2[1]] || 0) * 10 + (map[m2[2]] || 0);
    return 999;
  },

  // ─── 全局状态 ───
  state: {
    uid: '',
    ptDone: new Set(), ptCorrect: new Set(),
    xgDone: new Set(), xgCorrect: new Set(),
    currentTab: 'home',
    currentRoute: 'home',
    routeParams: {},
    quiz: null,
    modal: null,
    deviceMode: 'auto', // 'auto' | 'mobile' | 'desktop'
  },

  // ─── 初始化 ───
  init() {
    this._loadUid();
    this._loadProgress();
    this._loadQuestions();
    this._loadDeviceMode();
    this._bindNav();
    this._render();
  },

  // ─── 用户 & 进度 ───
  _loadUid() {
    this.state.uid = Utils.storage.getItem('__uid__') || this._newUid();
  },
  _newUid() {
    const uid = 'u_' + Date.now();
    Utils.storage.setItem('__uid__', uid);
    return uid;
  },
  _sk(key) { return `${this.state.uid}_${key}`; },

  _loadProgress() {
    try {
      const s = Utils.storage.getItem.bind(Utils.storage);
      this.state.ptDone = new Set(s(this._sk('pt_d')) || []);
      this.state.ptCorrect = new Set(s(this._sk('pt_c')) || []);
      this.state.xgDone = new Set(s(this._sk('xg_d')) || []);
      this.state.xgCorrect = new Set(s(this._sk('xg_c')) || []);
    } catch(e) {
      this.state.ptDone = new Set(); this.state.ptCorrect = new Set();
      this.state.xgDone = new Set(); this.state.xgCorrect = new Set();
    }
  },

  _saveProgress() {
    const s = Utils.storage.setItem.bind(Utils.storage);
    s(this._sk('pt_d'), [...this.state.ptDone]);
    s(this._sk('pt_c'), [...this.state.ptCorrect]);
    s(this._sk('xg_d'), [...this.state.xgDone]);
    s(this._sk('xg_c'), [...this.state.xgCorrect]);
  },

  // ─── 设备模式 ───
  _loadDeviceMode() {
    this.state.deviceMode = Utils.storage.getItem('__device__') || 'auto';
    this._applyDeviceMode();
  },

  _setDeviceMode(mode) {
    this.state.deviceMode = mode;
    Utils.storage.setItem('__device__', mode);
    this._applyDeviceMode();
    this._render();
  },

  _applyDeviceMode() {
    document.body.classList.remove('mobile-force', 'desktop-force');
    if (this.state.deviceMode === 'mobile') document.body.classList.add('mobile-force');
    else if (this.state.deviceMode === 'desktop') document.body.classList.add('desktop-force');
  },

  _isDesktop() {
    if (this.state.deviceMode === 'desktop') return true;
    if (this.state.deviceMode === 'mobile') return false;
    return window.innerWidth >= 768;
  },

  // ─── 数据加载 ───
  _loadQuestions() {
    const rawPt = (typeof PATENT_2026_QUESTIONS !== 'undefined') ? PATENT_2026_QUESTIONS : [];
    const rawXg = (typeof XG_2026_QUESTIONS !== 'undefined') ? XG_2026_QUESTIONS : [];
    this.state.ptQuestions = this._process(rawPt, 'pt');
    this.state.xgQuestions = this._process(rawXg, 'xg');
    this._buildTopicStats();
  },

  _process(rawList, prefix) {
    return rawList
      .filter(q => q.question && q.question.trim().length > 5 && q.options && q.options.length >= 2)
      .map((q, i) => {
        const isMulti = /多选|多项/.test(q.question) ||
          (q.answer && q.answer.length > 1 && /^[A-D]+$/.test(q.answer));
        return {
          ...q,
          id: `${prefix}_${i}`,
          type: isMulti ? 'multiple' : 'single',
          optionsMap: this._parseOptions(q.options || []),
          answer: ((q.answer || '').toUpperCase()).replace(/[^A-D]/g, ''),
        };
      });
  },

  _parseOptions(opts) {
    const map = {};
    (opts || []).forEach(item => {
      const m = String(item).match(/^([A-Za-z])[.、\s]\s*(.+)/);
      if (m) map[m[1].toUpperCase()] = m[2].trim();
    });
    return map;
  },

  _buildTopicStats() {
    const build = (questions) => {
      const stats = {};
      questions.forEach(q => {
        const t = q.topic || '未分类';
        if (!stats[t]) stats[t] = { total: 0, done: 0, correct: 0 };
        stats[t].total++;
      });
      return stats;
    };
    this.state.ptTopicStats = build(this.state.ptQuestions);
    this.state.xgTopicStats = build(this.state.xgQuestions);
  },

  // ─── 路由 ───
  _bindNav() {
    document.addEventListener('nav', (e) => {
      const { route, params } = e.detail || {};
      this.state.currentRoute = route;
      this.state.routeParams = params || {};
      this.state.currentTab = this.routes[route]?.tab ? route : this.state.currentTab;
      this._render();
    });
  },

  navigate(route, params = {}) {
    document.dispatchEvent(new CustomEvent('nav', { detail: { route, params } }));
  },

  // ─── 渲染入口 ───
  _render() {
    const app = document.getElementById('app');
    const isDesktop = this._isDesktop();
    const r = this.state.currentRoute;

    if (isDesktop) {
      this._renderDesktop(app, r);
    } else {
      this._renderMobile(app, r);
    }

    // 设备切换按钮（移动端时显示在右上角）
    this._renderDeviceToggle();
  },

  // ─── PC端布局 ───
  _renderDesktop(app, route) {
    const s = this._stats();
    const tabs = ['home', 'practice', 'mine'];
    const icons = { home: '📖', practice: '✏️', mine: '👤' };
    const titles = { home: '首页', practice: '练习', mine: '我的' };

    app.innerHTML = `
      <div class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-logo">⚖️</div>
            <div>
              <div class="sidebar-title">专利代理师</div>
              <div class="sidebar-sub">2026 资格考试</div>
            </div>
          </div>
        </div>
        <div class="sidebar-nav">
          <div class="sidebar-section-label">导航</div>
          ${tabs.map(t => `
            <button class="sidebar-nav-item${this.state.currentTab === t ? ' active' : ''}" onclick="App.navigate('${t}')">
              <span class="nav-icon">${icons[t]}</span>
              <span>${titles[t]}</span>
              ${t === 'home' && s.totalDone > 0 ? `<span class="nav-badge">${s.totalDone}</span>` : ''}
            </button>
          `).join('')}
          <div class="sidebar-section-label">科目</div>
          <button class="sidebar-nav-item" onclick="App.navigate('subject', {key:'pt'})">
            <span class="nav-icon" style="color:var(--pt-color)">📚</span>
            <span>专利法</span>
            <span class="nav-badge">${s.ptCount}</span>
          </button>
          <button class="sidebar-nav-item" onclick="App.navigate('subject', {key:'xg'})">
            <span class="nav-icon" style="color:var(--xg-color)">⚖️</span>
            <span>相关法</span>
            <span class="nav-badge">${s.xgCount}</span>
          </button>
        </div>
        <div class="sidebar-footer">
          <div class="device-toggle">
            <button class="device-toggle-btn${this.state.deviceMode === 'auto' ? ' active' : ''}" onclick="App._setDeviceMode('auto')">🔄 自动</button>
            <button class="device-toggle-btn${this.state.deviceMode === 'mobile' ? ' active' : ''}" onclick="App._setDeviceMode('mobile')">📱 手机</button>
            <button class="device-toggle-btn${this.state.deviceMode === 'desktop' ? ' active' : ''}" onclick="App._setDeviceMode('desktop')">🖥️ 电脑</button>
          </div>
        </div>
      </div>
      <div class="main-content" id="main-content"></div>
    `;

    this._renderPageContent(document.getElementById('main-content'), route);
  },

  // ─── 移动端布局 ───
  _renderMobile(app, route) {
    const tabs = ['home', 'practice', 'mine'];
    const icons = { home: '📖', practice: '✏️', mine: '👤' };
    const titles = { home: '首页', practice: '练习', mine: '我的' };
    const s = this._stats();

    app.innerHTML = `
      <div class="main-content" id="main-content"></div>
      <div class="tabbar">
        ${tabs.map(t => `
          <button class="tab-item${this.state.currentTab === t ? ' active' : ''}" onclick="App.navigate('${t}')">
            <span class="tab-icon">${icons[t]}</span>
            <span>${titles[t]}</span>
            ${t === 'home' && s.totalDone > 0 ? '<span class="tab-badge"></span>' : ''}
          </button>
        `).join('')}
      </div>
    `;

    this._renderPageContent(document.getElementById('main-content'), route);
  },

  // ─── 设备切换按钮 ───
  _renderDeviceToggle() {
    let existing = document.getElementById('device-toggle-floating');
    if (existing) existing.remove();

    const toggle = document.createElement('div');
    toggle.id = 'device-toggle-floating';
    toggle.className = 'mobile-device-toggle';
    toggle.innerHTML = `
      <button class="device-toggle-btn${this.state.deviceMode === 'auto' ? ' active' : ''}" onclick="App._setDeviceMode('auto')" title="自动">🔄</button>
      <button class="device-toggle-btn${this.state.deviceMode === 'mobile' ? ' active' : ''}" onclick="App._setDeviceMode('mobile')" title="手机">📱</button>
      <button class="device-toggle-btn${this.state.deviceMode === 'desktop' ? ' active' : ''}" onclick="App._setDeviceMode('desktop')" title="电脑">🖥️</button>
    `;
    document.body.appendChild(toggle);
  },

  // ─── 页面内容分发 ───
  _renderPageContent(container, route) {
    switch (route) {
      case 'home':     this._renderHome(container);     break;
      case 'practice': this._renderPractice(container); break;
      case 'mine':     this._renderMine(container);     break;
      case 'quiz':     this._renderQuiz(container);     break;
      case 'topic':    this._renderTopic(container);    break;
      case 'subject':  this._renderSubject(container);  break;
      case 'lecture':  this._renderLecture(container);  break;
      default:         this._renderHome(container);     break;
    }
  },

  // ═══════════════════════════════════════
  // 首页
  // ═══════════════════════════════════════
  _renderHome(container) {
    const s = this._stats();
    container.innerHTML = `
      <div class="page active" id="page-home">
        <div class="home-hero">
          <div class="home-logo">⚖️</div>
          <h1 class="home-title">专利代理师</h1>
          <p class="home-subtitle">2026 资格考试 · 刷题助手</p>
          <div class="home-stats">
            <div class="home-stat">
              <span class="home-stat-num">${s.totalCount}</span>
              <span class="home-stat-label">总题数</span>
            </div>
            <div class="home-stat">
              <span class="home-stat-num green">${s.totalDone}</span>
              <span class="home-stat-label">已练习</span>
            </div>
            <div class="home-stat">
              <span class="home-stat-num">${s.accuracy}</span>
              <span class="home-stat-label">正确率</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">快捷入口</div>
          <div class="action-grid">
            <div class="action-card" onclick="App.navigate('quiz', {mode:'exam'})">
              <div class="action-icon">🏁</div>
              <div class="action-title">模拟考试</div>
              <div class="action-desc">限时90分钟 · 60题</div>
            </div>
            <div class="action-card" onclick="App.navigate('quiz', {mode:'pt-random'})">
              <div class="action-icon">🎲</div>
              <div class="action-title">随机练习</div>
              <div class="action-desc">${s.ptCount}题</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">科目</div>
          <div class="subject-card pt-card" onclick="App.navigate('subject', {key:'pt'})">
            <div class="subject-icon pt-icon">📚</div>
            <div class="subject-info">
              <div class="subject-name">专利法</div>
              <div class="subject-meta">${s.ptCount}题 · ${Object.keys(this.state.ptTopicStats).length}个专题</div>
              <div class="subject-progress">
                <div class="progress-bar"><div class="progress-fill pt-fill" style="width:${s.ptPercent}%"></div></div>
                <span class="progress-text">${s.ptDone}/${s.ptCount}</span>
              </div>
            </div>
            <span class="subject-arrow">›</span>
          </div>
          <div class="subject-card xg-card" onclick="App.navigate('subject', {key:'xg'})">
            <div class="subject-icon xg-icon">⚖️</div>
            <div class="subject-info">
              <div class="subject-name">相关法</div>
              <div class="subject-meta">${s.xgCount}题 · ${Object.keys(this.state.xgTopicStats).length}个专题</div>
              <div class="subject-progress">
                <div class="progress-bar"><div class="progress-fill xg-fill" style="width:${s.xgPercent}%"></div></div>
                <span class="progress-text">${s.xgDone}/${s.xgCount}</span>
              </div>
            </div>
            <span class="subject-arrow">›</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">薄弱专题</div>
          ${this._weakTopicsHtml()}
        </div>

        <div style="height:var(--space-8)"></div>
      </div>
    `;
  },

  _weakTopicsHtml() {
    const ptWeak = Object.entries(this.state.ptTopicStats || {})
      .filter(([,v]) => v.total > 0)
      .map(([t,v]) => ({ topic: t, key: 'pt', done: v.done, total: v.total, rate: v.done / v.total }))
      .filter(x => x.done > 0 && x.rate < 0.7)
      .sort((a,b) => a.rate - b.rate)
      .slice(0, 3);

    if (ptWeak.length === 0) {
      return '<div style="font-size:13px;color:var(--text-muted);padding:var(--space-2) 0;">暂无薄弱专题，继续保持 🎉</div>';
    }

    return ptWeak.map(w => `
      <div class="subject-card weak-card" onclick="App.navigate('topic', {key:'pt', topic:'${w.topic}'})">
        <div class="subject-icon weak-icon">🔴</div>
        <div class="subject-info">
          <div class="subject-name">${w.topic}</div>
          <div class="subject-meta">正确率 ${Math.round(w.rate*100)}% · ${w.done}/${w.total}题</div>
          <div class="subject-progress">
            <div class="progress-bar"><div class="progress-fill weak-fill" style="width:${w.rate*100}%"></div></div>
          </div>
        </div>
        <span class="subject-arrow">›</span>
      </div>
    `).join('');
  },

  // ═══════════════════════════════════════
  // 练习页
  // ═══════════════════════════════════════
  _renderPractice(container) {
    const s = this._stats();
    container.innerHTML = `
      <div class="page active" id="page-practice">
        <div class="header">
          <div class="header-title">选择练习模式</div>
        </div>
        <div class="section" style="margin-top:var(--space-4);">
          <div class="section-title">专利法</div>
          <div class="mode-card" onclick="App.navigate('quiz', {mode:'pt-all'})">
            <div class="mode-header">
              <span class="mode-title">📋 顺序练习</span>
              <span class="mode-badge">${this.state.ptQuestions.length}题</span>
            </div>
            <div class="mode-desc">从第1题开始，逐题练习</div>
          </div>
          <div class="mode-card" onclick="App.navigate('quiz', {mode:'pt-random'})">
            <div class="mode-header">
              <span class="mode-title">🎲 随机练习</span>
              <span class="mode-badge">${this.state.ptQuestions.length}题</span>
            </div>
            <div class="mode-desc">随机抽取题目</div>
          </div>
          ${s.ptWrong > 0 ? `
          <div class="mode-card" onclick="App.navigate('quiz', {mode:'pt-wrong'})">
            <div class="mode-header">
              <span class="mode-title">❌ 错题复习</span>
              <span class="mode-badge" style="background:rgba(239,68,68,0.15);color:var(--red);">${s.ptWrong}题</span>
            </div>
            <div class="mode-desc">专项攻克薄弱知识点</div>
          </div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">相关法</div>
          <div class="mode-card" onclick="App.navigate('quiz', {mode:'xg-all'})">
            <div class="mode-header">
              <span class="mode-title">📋 顺序练习</span>
              <span class="mode-badge">${this.state.xgQuestions.length}题</span>
            </div>
            <div class="mode-desc">从第1题开始，逐题练习</div>
          </div>
          <div class="mode-card" onclick="App.navigate('quiz', {mode:'xg-random'})">
            <div class="mode-header">
              <span class="mode-title">🎲 随机练习</span>
              <span class="mode-badge">${this.state.xgQuestions.length}题</span>
            </div>
            <div class="mode-desc">随机抽取题目</div>
          </div>
          ${s.xgWrong > 0 ? `
          <div class="mode-card" onclick="App.navigate('quiz', {mode:'xg-wrong'})">
            <div class="mode-header">
              <span class="mode-title">❌ 错题复习</span>
              <span class="mode-badge" style="background:rgba(239,68,68,0.15);color:var(--red);">${s.xgWrong}题</span>
            </div>
            <div class="mode-desc">专项攻克薄弱知识点</div>
          </div>` : ''}
        </div>

        <div style="height:var(--space-8)"></div>
      </div>
    `;
  },

  // ═══════════════════════════════════════
  // 我的
  // ═══════════════════════════════════════
  _renderMine(container) {
    const s = this._stats();
    container.innerHTML = `
      <div class="page active" id="page-mine">
        <div class="header">
          <div class="header-title">我的</div>
          <div class="header-action" onclick="App._resetProgress()">重置</div>
        </div>

        <div class="section" style="margin-top:var(--space-4);">
          <div class="section-title">总览</div>
          <div class="home-stats">
            <div class="home-stat">
              <span class="home-stat-num">${s.totalCount}</span>
              <span class="home-stat-label">题库总量</span>
            </div>
            <div class="home-stat">
              <span class="home-stat-num green">${s.totalDone}</span>
              <span class="home-stat-label">已练习</span>
            </div>
            <div class="home-stat">
              <span class="home-stat-num">${s.accuracy}</span>
              <span class="home-stat-label">总正确率</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">专利法</div>
          <div class="stats-detail">
            <div class="stats-detail-item">
              <div class="stats-detail-num" style="color:var(--text-primary);">${s.ptDone}</div>
              <div class="stats-detail-label">已练习</div>
            </div>
            <div class="stats-detail-item">
              <div class="stats-detail-num" style="color:var(--green);">${s.ptCorrect}</div>
              <div class="stats-detail-label">答对</div>
            </div>
            <div class="stats-detail-item">
              <div class="stats-detail-num" style="color:var(--red);">${s.ptWrong}</div>
              <div class="stats-detail-label">错题</div>
            </div>
          </div>
          <div class="subject-progress" style="margin-top:var(--space-3);">
            <div class="progress-bar"><div class="progress-fill pt-fill" style="width:${s.ptPercent}%;"></div></div>
            <span class="progress-text">${s.ptPercent}% 掌握</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">相关法</div>
          <div class="stats-detail">
            <div class="stats-detail-item">
              <div class="stats-detail-num" style="color:var(--text-primary);">${s.xgDone}</div>
              <div class="stats-detail-label">已练习</div>
            </div>
            <div class="stats-detail-item">
              <div class="stats-detail-num" style="color:var(--green);">${s.xgCorrect}</div>
              <div class="stats-detail-label">答对</div>
            </div>
            <div class="stats-detail-item">
              <div class="stats-detail-num" style="color:var(--red);">${s.xgWrong}</div>
              <div class="stats-detail-label">错题</div>
            </div>
          </div>
          <div class="subject-progress" style="margin-top:var(--space-3);">
            <div class="progress-bar"><div class="progress-fill xg-fill" style="width:${s.xgPercent}%;"></div></div>
            <span class="progress-text">${s.xgPercent}% 掌握</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">关于</div>
          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-4);">
            <div style="font-size:14px;font-weight:600;margin-bottom:var(--space-1);">专利代理师考试刷题</div>
            <div style="font-size:12px;color:var(--text-secondary);">2026版 · 响应式暗色设计</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:var(--space-2);">
              题目数据来源：2026年专利法600题、相关法600题<br>
              相关法知识精讲：专题讲座
            </div>
          </div>
        </div>

        <div style="height:var(--space-8)"></div>
      </div>
    `;
  },

  // ═══════════════════════════════════════
  // 科目页
  // ═══════════════════════════════════════
  _renderSubject(container) {
    const { key } = this.state.routeParams;
    const isPt = key === 'pt';
    const topicStats = isPt ? this.state.ptTopicStats : this.state.xgTopicStats;
    const topics = Object.keys(topicStats).sort((a, b) => this._cnNum(a) - this._cnNum(b));
    const title = isPt ? '专利法' : '相关法';
    const colorClass = isPt ? 'pt' : 'xg';

    const topicItems = topics.map((t, i) => {
      const st = topicStats[t] || { total: 0, done: 0 };
      const rate = st.total > 0 ? (st.done / st.total * 100).toFixed(0) : 0;
      return `
        <div class="topic-item" onclick="App.navigate('topic', {key:'${key}', topic:'${t.replace(/'/g, "\\'")}'})">
          <div class="topic-num ${colorClass}-num">${i + 1}</div>
          <div class="topic-name">${t}</div>
          <div style="display:flex;align-items:center;gap:var(--space-2);">
            <div class="progress-bar" style="width:60px;">
              <div class="progress-fill ${colorClass}-fill" style="width:${rate}%;"></div>
            </div>
            <span class="topic-count">${st.done}/${st.total}</span>
          </div>
          <span class="subject-arrow">›</span>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="page active">
        <div class="header">
          <div class="header-back" onclick="App.navigate('home')">←</div>
          <div class="header-title">${title} · 专题</div>
        </div>
        <div class="topic-list">${topicItems}</div>
        <div style="height:var(--space-8)"></div>
      </div>
    `;
  },

  // ═══════════════════════════════════════
  // 专题详情页（改进版）
  // ═══════════════════════════════════════
  _renderTopic(container) {
    const { key, topic } = this.state.routeParams;
    const isPt = key === 'pt';
    const questions = isPt ? this.state.ptQuestions : this.state.xgQuestions;
    const topicQuestions = questions.filter(q => q.topic === topic || (!q.topic && topic === '未分类'));
    const st = (isPt ? this.state.ptTopicStats : this.state.xgTopicStats)[topic] || { total: 0, done: 0, correct: 0 };
    const rate = st.done > 0 ? Math.round(st.correct / st.done * 100) : 0;
    const escTopic = topic.replace(/'/g, "\\'");
    const colorClass = isPt ? 'pt' : 'xg';

    container.innerHTML = `
      <div class="page active">
        <div class="header">
          <div class="header-back" onclick="App.navigate('subject', {key:'${key}'})">←</div>
          <div class="header-title">${topic}</div>
        </div>

        <div class="topic-detail-hero">
          <div class="topic-detail-title">${topic}</div>
          <div class="topic-detail-stats">
            <div class="home-stat">
              <span class="home-stat-num">${st.total}</span>
              <span class="home-stat-label">总题数</span>
            </div>
            <div class="home-stat">
              <span class="home-stat-num green">${st.done}</span>
              <span class="home-stat-label">已练习</span>
            </div>
            <div class="home-stat">
              <span class="home-stat-num" style="color:${rate >= 70 ? 'var(--green)' : rate > 0 ? 'var(--red)' : 'var(--text-muted)'};">
                ${st.done > 0 ? rate + '%' : '—'}
              </span>
              <span class="home-stat-label">正确率</span>
            </div>
          </div>
        </div>

        <div class="section" style="margin-top:var(--space-4);">
          <div class="section-title">学习</div>
          <div class="mode-card" onclick="App.navigate('lecture', {key:'${key}', topic:'${escTopic}'})" style="border-left:3px solid var(--accent);">
            <div class="mode-header">
              <span class="mode-title">📘 专题讲座</span>
            </div>
            <div class="mode-desc">阅读韩龙老师讲座原文，掌握考点</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">练习</div>
          <div class="mode-card" onclick="App.navigate('quiz', {mode:'topic', key:'${key}', topic:'${escTopic}'})">
            <div class="mode-header">
              <span class="mode-title">✏️ 开始练习</span>
              <span class="mode-badge">${topicQuestions.length}题</span>
            </div>
            <div class="mode-desc">按专题练习 · 随机顺序</div>
          </div>
        </div>
        <div style="height:var(--space-8)"></div>
      </div>
    `;
  },

  // ═══════════════════════════════════════
  // 答题页
  // ═══════════════════════════════════════
  _renderQuiz() {
    const { mode } = this.state.routeParams;
    const quiz = this._initQuiz(mode);
    if (!quiz || quiz.questions.length === 0) {
      Utils.showToast('暂无题目');
      this.navigate('home');
      return;
    }
    this.state.quiz = quiz;
    this._showQuizPage();
  },

  _initQuiz(mode) {
    let questions = [];
    let subjectKey = 'pt';

    if (mode === 'exam') {
      const ptQs = [...this.state.ptQuestions].sort(() => Math.random() - 0.5);
      const xgQs = [...this.state.xgQuestions].sort(() => Math.random() - 0.5);
      questions = [...ptQs.slice(0, 30), ...xgQs.slice(0, 30)];
      subjectKey = 'exam';
    } else if (mode === 'pt-all') {
      questions = [...this.state.ptQuestions]; subjectKey = 'pt';
    } else if (mode === 'pt-random') {
      questions = [...this.state.ptQuestions].sort(() => Math.random() - 0.5); subjectKey = 'pt';
    } else if (mode === 'pt-wrong') {
      questions = this.state.ptQuestions.filter(q => this.state.ptDone.has(q.id) && !this.state.ptCorrect.has(q.id));
      subjectKey = 'pt';
    } else if (mode === 'xg-all') {
      questions = [...this.state.xgQuestions]; subjectKey = 'xg';
    } else if (mode === 'xg-random') {
      questions = [...this.state.xgQuestions].sort(() => Math.random() - 0.5); subjectKey = 'xg';
    } else if (mode === 'xg-wrong') {
      questions = this.state.xgQuestions.filter(q => this.state.xgDone.has(q.id) && !this.state.xgCorrect.has(q.id));
      subjectKey = 'xg';
    } else if (mode === 'topic') {
      const { key, topic } = this.state.routeParams;
      const src = key === 'pt' ? this.state.ptQuestions : this.state.xgQuestions;
      questions = src.filter(q => q.topic === topic || (!q.topic && topic === '未分类')).sort(() => Math.random() - 0.5);
      subjectKey = key;
    }

    return { mode, subjectKey, questions, current: 0, answers: {}, submitted: {}, startTime: Date.now() };
  },

  _showQuizPage() {
    const q = this.state.quiz;
    if (!q) return;
    const question = q.questions[q.current];
    const total = q.questions.length;
    const progress = ((q.current) / total * 100).toFixed(0);
    const isMulti = question.type === 'multiple';
    const answered = q.answers[q.current];
    const isSubmitted = q.submitted[q.current];

    const container = this._isDesktop()
      ? document.getElementById('main-content')
      : document.getElementById('main-content');
    if (!container) return;

    container.innerHTML = `
      <div class="page active">
        <div class="quiz-topbar">
          <div class="quiz-counter">${q.current + 1}/${total}</div>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width:${progress}%"></div>
          </div>
          <div class="quiz-time" id="quiz-time">--:--</div>
          <div class="header-back" onclick="App._quizConfirmExit()" style="margin:0;">✕</div>
        </div>

        <div class="quiz-body">
          ${question.topic ? `<div class="quiz-topic-tag">${question.topic}</div>` : ''}
          <div class="quiz-stem">
            <span class="q-type ${isMulti ? 'multi' : 'single'}">${isMulti ? '多选' : '单选'}</span>
            ${question.question}
          </div>

          <div class="quiz-options">
            ${Object.entries(question.optionsMap).map(([k, v]) => {
              const sel = answered ? answered.includes(k) : false;
              const isCorrectAns = question.answer.includes(k);
              let cls = 'quiz-option';
              if (sel) cls += ' selected';
              if (isSubmitted) {
                if (isCorrectAns) cls += ' correct';
                else if (sel) cls += ' wrong';
              }
              return `
                <div class="${cls}" onclick="App._selectOption('${k}')">
                  <div class="quiz-option-key">${k}</div>
                  <div class="quiz-option-text">${v}</div>
                </div>
              `;
            }).join('')}
          </div>

          ${isSubmitted ? `
            <div class="explanation">
              <strong>解析：</strong>${question.explanation || '暂无解析'}
            </div>
          ` : ''}
        </div>

        <div class="quiz-footer">
          ${q.current > 0 ? `<button class="quiz-btn quiz-btn-ghost" onclick="App._prevQuestion()">上一题</button>` : '<div></div>'}
          ${!isSubmitted ? `
            <button class="quiz-btn quiz-btn-primary" onclick="App._submitAnswer()" ${!answered ? 'disabled' : ''}>
              确认答案
            </button>
          ` : q.current < total - 1 ? `
            <button class="quiz-btn quiz-btn-primary" onclick="App._nextQuestion()">下一题</button>
          ` : `
            <button class="quiz-btn quiz-btn-primary" onclick="App._finishQuiz()">完成练习</button>
          `}
        </div>
      </div>
    `;

    this._updateTimer();
  },

  _selectOption(key) {
    const q = this.state.quiz;
    if (q.submitted[q.current]) return;
    const question = q.questions[q.current];
    const isMulti = question.type === 'multiple';

    if (isMulti) {
      const cur = q.answers[q.current] || [];
      q.answers[q.current] = cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key];
    } else {
      q.answers[q.current] = [key];
    }

    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => {
      const k = opt.querySelector('.quiz-option-key').textContent;
      opt.classList.toggle('selected', (q.answers[q.current] || []).includes(k));
    });

    const btn = document.querySelector('.quiz-btn-primary');
    if (btn) btn.disabled = !(q.answers[q.current]?.length > 0);
  },

  _submitAnswer() {
    const q = this.state.quiz;
    const question = q.questions[q.current];
    const selected = q.answers[q.current] || [];
    if (selected.length === 0) return;

    q.submitted[q.current] = true;
    const id = question.id;
    const isCorrect = selected.sort().join('') === question.answer.split('').sort().join('');

    if (q.subjectKey === 'pt' || q.subjectKey === 'exam') {
      if (!this.state.ptDone.has(id)) this.state.ptDone.add(id);
      if (isCorrect) this.state.ptCorrect.add(id);
    } else {
      if (!this.state.xgDone.has(id)) this.state.xgDone.add(id);
      if (isCorrect) this.state.xgCorrect.add(id);
    }
    this._saveProgress();

    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => {
      const k = opt.querySelector('.quiz-option-key').textContent;
      const isCorrectAns = question.answer.includes(k);
      opt.classList.remove('selected');
      if (isCorrectAns) opt.classList.add('correct');
      else if (selected.includes(k)) opt.classList.add('wrong');
    });

    const body = document.querySelector('.quiz-body');
    const existing = body.querySelector('.explanation');
    if (existing) existing.remove();

    const exp = document.createElement('div');
    exp.className = 'explanation';
    exp.innerHTML = `<strong>解析：</strong>${question.explanation || '暂无解析'}`;
    body.appendChild(exp);

    const footer = document.querySelector('.quiz-footer');
    const isLast = q.current === q.questions.length - 1;
    footer.innerHTML = `
      ${q.current > 0 ? `<button class="quiz-btn quiz-btn-ghost" onclick="App._prevQuestion()">上一题</button>` : '<div></div>'}
      ${isLast ? `<button class="quiz-btn quiz-btn-primary" onclick="App._finishQuiz()">完成练习</button>`
               : `<button class="quiz-btn quiz-btn-primary" onclick="App._nextQuestion()">下一题</button>`}
    `;
  },

  _nextQuestion() {
    const q = this.state.quiz;
    if (q.current < q.questions.length - 1) { q.current++; this._showQuizPage(); }
  },
  _prevQuestion() {
    const q = this.state.quiz;
    if (q.current > 0) { q.current--; this._showQuizPage(); }
  },

  _finishQuiz() {
    const q = this.state.quiz;
    const total = q.questions.length;
    const answered = Object.keys(q.submitted).length;
    const correct = Object.entries(q.submitted).filter(([idx]) => {
      const question = q.questions[+idx];
      const selected = q.answers[+idx] || [];
      return selected.sort().join('') === question.answer.split('').sort().join('');
    }).length;

    const elapsed = Math.round((Date.now() - q.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const acc = answered > 0 ? Math.round(correct / answered * 100) : 0;

    const container = this._isDesktop()
      ? document.getElementById('main-content')
      : document.getElementById('main-content');
    if (!container) return;

    container.innerHTML = `
      <div class="page active">
        <div class="header">
          <div class="header-back" onclick="App.navigate('home')">←</div>
          <div class="header-title">练习结果</div>
        </div>
        <div class="result-hero">
          <div class="result-emoji">${acc >= 80 ? '🎉' : acc >= 60 ? '💪' : '📚'}</div>
          <div class="result-score">${acc}%</div>
          <div class="result-meta">正确率 · ${mins}分${secs}秒</div>

          <div class="home-stats" style="max-width:320px;margin:0 auto var(--space-6);">
            <div class="home-stat">
              <span class="home-stat-num">${answered}</span>
              <span class="home-stat-label">已答</span>
            </div>
            <div class="home-stat">
              <span class="home-stat-num green">${correct}</span>
              <span class="home-stat-label">正确</span>
            </div>
            <div class="home-stat">
              <span class="home-stat-num red">${answered - correct}</span>
              <span class="home-stat-label">错误</span>
            </div>
          </div>

          <button class="quiz-btn quiz-btn-primary" onclick="App.navigate('home')" style="width:100%;max-width:280px;">
            返回首页
          </button>
        </div>
      </div>
    `;
  },

  _quizConfirmExit() {
    Utils.modal({
      title: '退出答题',
      body: '确定要退出当前练习吗？进度将会保存。',
      confirmText: '退出',
      onConfirm: () => { Utils.modal(null); this.navigate('home'); },
      onCancel: () => Utils.modal(null),
    });
  },

  _updateTimer() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    this._timerInterval = setInterval(() => {
      const q = this.state.quiz;
      if (!q) { clearInterval(this._timerInterval); return; }
      const elapsed = Math.round((Date.now() - q.startTime) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      const el = document.getElementById('quiz-time');
      if (el) el.textContent = `${mins}:${secs}`;
    }, 1000);
  },

  // ─── 重置进度 ───
  _resetProgress() {
    Utils.modal({
      title: '重置进度',
      body: '确定要清除所有做题记录吗？此操作不可恢复。',
      confirmText: '确认重置',
      onConfirm: () => {
        this.state.ptDone = new Set(); this.state.ptCorrect = new Set();
        this.state.xgDone = new Set(); this.state.xgCorrect = new Set();
        this._saveProgress();
        Utils.modal(null);
        Utils.showToast('进度已重置');
        this._render();
      },
      onCancel: () => Utils.modal(null),
    });
  },

  // ═══════════════════════════════════════
  // 讲座
  // ═══════════════════════════════════════
  _renderLecture(container) {
    const { key, topic } = this.state.routeParams;
    const isPt = key === 'pt';
    const lectures = isPt ? (typeof LECTURE_PT !== 'undefined' ? LECTURE_PT : []) : (typeof LECTURE_XG !== 'undefined' ? LECTURE_XG : []);

    let lecture = lectures.find(l => l.title === topic);
    if (!lecture) {
      lecture = lectures.find(l => topic.includes(l.title) || l.title.includes(topic));
    }

    if (!lecture) {
      container.innerHTML = `
        <div class="lecture-page">
          <div class="lecture-header">
            <span class="back-btn" onclick="App.navigate('subject', {key:'${key}'})">←</span>
            <span class="title">${topic}</span>
          </div>
          <div style="padding:var(--space-8);text-align:center;color:var(--text-muted);">
            <div style="font-size:48px;margin-bottom:var(--space-4);">📭</div>
            <div>该专题讲座内容暂未收录</div>
          </div>
        </div>
      `;
      return;
    }

    // Build TOC
    const tocItems = [];
    const headerRegex = /<(div class="ch"|div class="sh")>([^<]+)<\/div>/g;
    let m;
    while ((m = headerRegex.exec(lecture.content)) !== null) {
      const level = m[1].includes('ch') ? 'ch' : 'sh';
      const text = m[2].trim();
      if (text.length > 1 && text.length < 60) tocItems.push({ level, text });
    }

    container.innerHTML = `
      <div class="lecture-page">
        <div class="lecture-header">
          <span class="back-btn" onclick="App.navigate('subject', {key:'${key}'})">←</span>
          <span class="title">${lecture.title}</span>
        </div>
        <div class="lecture-body" id="lecture-body">${lecture.content}</div>
        ${tocItems.length > 2 ? `
          <button class="lecture-toc-btn" onclick="App._toggleToc()">📑</button>
          <div class="lecture-toc-panel" id="lecture-toc" style="display:none;">
            <div style="font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:var(--space-2);padding:0 12px;">目录</div>
            ${tocItems.map((t, i) => `<div class="toc-item toc-${t.level}" onclick="App._scrollToToc(${i})">${t.text}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;

    this._enhanceLectureContent();
  },

  _toggleToc() {
    const panel = document.getElementById('lecture-toc');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  },

  _scrollToToc(idx) {
    const body = document.getElementById('lecture-body');
    if (!body) return;
    const headers = body.querySelectorAll('.ch, .sh');
    if (headers[idx]) {
      headers[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
      headers[idx].style.background = 'var(--accent-dim)';
      setTimeout(() => { headers[idx].style.background = ''; }, 1500);
    }
    const panel = document.getElementById('lecture-toc');
    if (panel) panel.style.display = 'none';
  },

  // ─── 讲座内容增强（去重版） ───
  _enhanceLectureContent() {
    const body = document.getElementById('lecture-body');
    if (!body) return;

    // 1. Convert markdown-style tables to <table>
    const allParas = Array.from(body.querySelectorAll('.para'));
    let tableStart = -1;
    for (let i = 0; i <= allParas.length; i++) {
      const p = i < allParas.length ? allParas[i] : null;
      const text = p ? p.textContent.trim() : '';
      const isTableRow = /^\|.+\|$/.test(text);

      if (!isTableRow && tableStart >= 0 && i - tableStart >= 2) {
        const rows = allParas.slice(tableStart, i);
        const parsed = rows.map(r => r.textContent.trim().split('|').map(c => c.trim()).filter(c => c !== ''));
        const isSep = parsed[1] && parsed[1].every(c => /^[-:]+$/.test(c));
        const dataStart = isSep ? 2 : 0;

        const table = document.createElement('table');
        if (isSep && parsed[0]) {
          const thead = document.createElement('thead');
          const tr = document.createElement('tr');
          parsed[0].forEach(c => { const th = document.createElement('th'); th.textContent = c; tr.appendChild(th); });
          thead.appendChild(tr);
          table.appendChild(thead);
        }
        const tbody = document.createElement('tbody');
        for (let j = dataStart; j < parsed.length; j++) {
          if (parsed[j].length > 0) {
            const tr = document.createElement('tr');
            parsed[j].forEach(c => { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); });
            tbody.appendChild(tr);
          }
        }
        table.appendChild(tbody);
        rows[0].replaceWith(table);
        for (let j = 1; j < rows.length; j++) rows[j].remove();
        tableStart = -1;
      }
      if (!isTableRow) tableStart = -1;
      if (isTableRow && tableStart < 0) tableStart = i;
    }

    // 2. Convert tree patterns to visual mind maps (with deduplication)
    const paras = Array.from(body.querySelectorAll('.para'));
    let mapStart = -1;
    for (let i = 0; i <= paras.length; i++) {
      const p = i < paras.length ? paras[i] : null;
      const text = p ? p.textContent : '';
      const isTree = /[├└]/.test(text) && /^[│├└─\s]{2,}/.test(text);

      if (!isTree && mapStart >= 0 && i - mapStart >= 3) {
        const items = paras.slice(mapStart, i).map(el => {
          let t = el.textContent;
          let depth = 0;
          const m = t.match(/^([│├└─\s]+)/);
          if (m) depth = Math.min((m[1].match(/[├└]/g) || []).length, 4);
          t = t.replace(/^[│├└─\s]+/, '').trim();
          return { depth, text: t };
        }).filter(x => x.text && x.text.length > 1 && x.text.length < 60);

        if (items.length >= 3) {
          const deduplicated = this._deduplicateMindMapItems(items);
          const container = this._buildMindMap(deduplicated);
          paras[mapStart].replaceWith(container);
          for (let j = mapStart + 1; j < i; j++) paras[j].remove();
        }
        mapStart = -1;
      }
      if (!isTree) mapStart = -1;
      if (isTree && mapStart < 0) mapStart = i;
    }

    // 3. Convert 【总结】highlight blocks to mind maps (with deduplication)
    body.querySelectorAll('.highlight').forEach(el => {
      const text = el.textContent;
      if (text.includes('总结') || text.includes('概览') || text.includes('区分')) {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length >= 4) {
          const items = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            let depth = 0;
            if (line.startsWith('    ')) depth = 2;
            else if (line.startsWith('  ') || line.startsWith('　')) depth = 1;
            items.push({ depth, text: line.trim() });
          }
          const deduplicated = this._deduplicateMindMapItems(items);
          if (deduplicated.length >= 3) {
            const container = this._buildMindMap(deduplicated);
            el.replaceWith(container);
          }
        }
      }
    });

    // 4. Style ① list items
    body.querySelectorAll('.para').forEach(el => {
      if (/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(el.textContent.trim())) {
        el.style.paddingLeft = '1.5em';
        el.style.color = 'var(--text-secondary)';
      }
    });
  },

  // ─── 思维导图去重 ───
  _deduplicateMindMapItems(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = item.text.replace(/\s+/g, '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  _buildMindMap(items) {
    const container = document.createElement('div');
    container.className = 'mindmap-container';
    container.innerHTML = '<div class="mindmap-title">知识结构</div>';

    const rootText = items.find(x => x.depth === 0)?.text || items[0].text;
    const root = document.createElement('div');
    root.className = 'mindmap';
    root.innerHTML = '<div class="mindmap-node root">' + rootText + '</div>';

    const branches = this._buildBranches(items, 0);
    if (branches) root.appendChild(branches);
    container.appendChild(root);
    return container;
  },

  _buildBranches(items, startDepth) {
    const children = [];
    let i = 0;
    while (i < items.length) {
      if (items[i].depth === startDepth + 1) {
        const subItems = [];
        let j = i + 1;
        while (j < items.length && items[j].depth > startDepth + 1) {
          subItems.push(items[j]);
          j++;
        }
        children.push({ node: items[i], subItems, endIdx: j });
        i = j;
      } else if (items[i].depth <= startDepth) {
        break;
      } else {
        i++;
      }
    }

    if (children.length === 0) return null;

    const branchesDiv = document.createElement('div');
    branchesDiv.className = 'mindmap-branches';

    children.forEach(child => {
      const branch = document.createElement('div');
      branch.className = 'mindmap-branch';

      const nodeDiv = document.createElement('div');
      const lv = Math.min(startDepth + 1, 3);
      nodeDiv.className = 'mindmap-node lv' + lv;
      nodeDiv.textContent = child.node.text;
      branch.appendChild(nodeDiv);

      if (child.subItems.length > 0) {
        const sub = this._buildBranches(child.subItems, startDepth + 1);
        if (sub) {
          const subWrap = document.createElement('div');
          subWrap.className = 'mindmap-sub';
          subWrap.appendChild(sub);
          branch.appendChild(subWrap);
        }
      }

      branchesDiv.appendChild(branch);
    });

    return branchesDiv;
  },

  // ═══════════════════════════════════════
  // 统计
  // ═══════════════════════════════════════
  _stats() {
    const ptTotal = this.state.ptQuestions?.length || 0;
    const xgTotal = this.state.xgQuestions?.length || 0;
    const ptDone = this.state.ptDone.size;
    const xgDone = this.state.xgDone.size;
    const ptCorrect = this.state.ptCorrect.size;
    const xgCorrect = this.state.xgCorrect.size;
    const ptWrong = ptDone - ptCorrect;
    const xgWrong = xgDone - xgCorrect;
    const totalDone = ptDone + xgDone;
    const totalCorrect = ptCorrect + xgCorrect;
    const totalCount = ptTotal + xgTotal;
    const accuracy = totalDone > 0 ? Math.round(totalCorrect / totalDone * 100) + '%' : '—';
    const ptPercent = ptTotal > 0 ? Math.round(ptDone / ptTotal * 100) : 0;
    const xgPercent = xgTotal > 0 ? Math.round(xgDone / xgTotal * 100) : 0;

    return {
      ptTotal, xgTotal, totalCount,
      ptCount: ptTotal, xgCount: xgTotal,
      ptDone, xgDone, totalDone,
      ptCorrect, xgCorrect,
      ptWrong, xgWrong,
      ptPercent, xgPercent,
      accuracy,
    };
  },
};

window.addEventListener('DOMContentLoaded', () => App.init());
