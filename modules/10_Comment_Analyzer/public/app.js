(() => {
  'use strict';

  /* ── DOM refs ───────────────────────────────────────── */
  const postUrlInput    = document.getElementById('post-url');
  const analyzeBtn      = document.getElementById('analyze-btn');
  const loadingBar      = document.getElementById('loading-bar');
  const loadingText     = document.getElementById('loading-text');
  const errorText       = document.getElementById('error-text');
  const results         = document.getElementById('results');
  const historyRow      = document.getElementById('history-row');
  const historySelect   = document.getElementById('history-select');
  const activeShortcodeEl = document.getElementById('active-shortcode');

  const mTotal     = document.getElementById('m-total');
  const mQuestions = document.getElementById('m-questions');
  const mComplaints= document.getElementById('m-complaints');
  const mLeads     = document.getElementById('m-leads');

  const commentFeed = document.getElementById('comment-feed');
  const tabs        = document.querySelectorAll('.tab');

  let allComments   = [];
  let currentFilter = 'All';

  /* ── Helpers ────────────────────────────────────────── */
  function showError(msg) {
    errorText.textContent = msg;
    errorText.classList.remove('hidden');
  }
  function clearError() {
    errorText.textContent = '';
    errorText.classList.add('hidden');
  }

  function setLoading(on) {
    analyzeBtn.disabled = on;
    analyzeBtn.textContent = on ? 'Analyzing…' : 'Analyze →';
    loadingBar.classList.toggle('hidden', !on);
    loadingText.classList.toggle('hidden', !on);
  }

  function animateNumber(el, target) {
    const duration = 600;
    const start = performance.now();
    const from = parseInt(el.textContent) || 0;
    requestAnimationFrame(function step(now) {
      const t = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(from + (target - from) * t);
      if (t < 1) requestAnimationFrame(step);
    });
  }

  /* ── Skeleton loaders ───────────────────────────────── */
  function showSkeletons(count = 4) {
    commentFeed.innerHTML = '';
    for (let i = 0; i < count; i++) {
      commentFeed.innerHTML += `
        <div class="skeleton">
          <div class="skel-line" style="width:30%;margin-bottom:14px"></div>
          <div class="skel-line" style="width:90%"></div>
          <div class="skel-line" style="width:75%"></div>
          <div class="skel-line" style="width:40%;margin-top:14px"></div>
        </div>`;
    }
  }

  /* ── Badge helper ───────────────────────────────────── */
  function badgeHTML(category) {
    const map = {
      'Theme':       ['badge-theme',       'THEME'],
      'Question':    ['badge-question',    'QUESTION'],
      'Complaint':   ['badge-complaint',   'COMPLAINT'],
      'Opportunity': ['badge-opportunity', 'OPPORTUNITY'],
      'Spam':        ['badge-spam',        'SPAM'],
      'Uncategorized':['badge-spam',       'UNCATEGORIZED'],
    };
    const [cls, label] = map[category] || ['badge-theme', category ? category.toUpperCase() : '?'];
    return `<span class="badge ${cls}">${label}</span>`;
  }

  /* ── Render comments ────────────────────────────────── */
  function renderComments() {
    const filtered = allComments.filter(c =>
      currentFilter === 'All' || c.category === currentFilter
    );

    commentFeed.innerHTML = '';

    if (filtered.length === 0) {
      commentFeed.innerHTML = `<div class="empty-state">No ${currentFilter === 'All' ? '' : currentFilter + ' '}comments found.</div>`;
      return;
    }

    filtered.forEach(c => {
      const isReel = c.prime_for_reel === 1 || c.prime_for_reel === true;
      const username = c.instagram_comment_id
        ? '@' + c.instagram_comment_id.replace(/[^a-z0-9_]/gi,'').substring(0, 12)
        : '@unknown';

      const sentiment = c.sentiment || 'Neutral';
      const subcat    = c.sub_category || '';
      const summary   = c.summary && c.summary !== c.raw_text ? c.summary : '';

      const card = document.createElement('div');
      card.className = 'comment-card' + (isReel ? ' reel-prime' : '');
      card.innerHTML = `
        <div class="card-top">
          <span class="card-user">${username}</span>
          ${badgeHTML(c.category)}
          ${isReel ? '<span class="reel-pill">★ Reply with Reel</span>' : ''}
        </div>
        <p class="card-text">${escHtml(c.raw_text || '')}</p>
        <div class="card-meta">
          <span>${sentiment}</span>
          ${subcat ? `<span class="dot">·</span><span>${escHtml(subcat)}</span>` : ''}
        </div>
        ${summary ? `<div class="card-summary">${escHtml(summary)}</div>` : ''}
      `;
      commentFeed.appendChild(card);
    });
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Update dashboard ───────────────────────────────── */
  function updateDashboard(shortcode, metrics, comments) {
    activeShortcodeEl.textContent = shortcode;
    animateNumber(mTotal,     metrics.totalProcessed    || 0);
    animateNumber(mQuestions, metrics.actionableQuestions|| 0);
    animateNumber(mComplaints,metrics.priorityComplaints || 0);
    animateNumber(mLeads,     metrics.contentLeads       || 0);

    allComments = comments;
    results.classList.remove('hidden');
    renderComments();
  }

  /* ── Analyze a URL ──────────────────────────────────── */
  async function analyzeUrl(url) {
    clearError();
    setLoading(true);
    results.classList.add('hidden');
    showSkeletons();
    results.classList.remove('hidden');   // show skeletons in the results panel

    try {
      const res = await fetch('/api/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      updateDashboard(data.shortcode, data.metrics, data.comments);
      loadHistory();

    } catch (err) {
      results.classList.add('hidden');
      showError('Analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Analyze button click ───────────────────────────── */
  analyzeBtn.addEventListener('click', () => {
    const url = postUrlInput.value.trim();
    if (!url) { showError('Please paste an Instagram URL first.'); return; }
    analyzeUrl(url);
  });

  /* Allow Enter key in input */
  postUrlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') analyzeBtn.click();
  });

  /* ── Filter tabs ────────────────────────────────────── */
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderComments();
    });
  });

  /* ── History dropdown ───────────────────────────────── */
  async function loadHistory() {
    try {
      const res   = await fetch('/api/posts');
      const posts = await res.json();

      if (!Array.isArray(posts) || posts.length === 0) return;

      historyRow.style.display = 'flex';
      historySelect.innerHTML  = '<option value="">Load a past post…</option>';
      posts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.shortcode;
        opt.textContent = `${p.shortcode}  (${p.total_comments} comments · ${new Date(p.created_at).toLocaleDateString()})`;
        historySelect.appendChild(opt);
      });
    } catch (_) { /* silent */ }
  }

  historySelect.addEventListener('change', async () => {
    const sc = historySelect.value;
    if (!sc) return;

    clearError();
    showSkeletons();
    results.classList.remove('hidden');

    try {
      const [mRes, cRes] = await Promise.all([
        fetch(`/api/posts/${sc}/metrics`),
        fetch(`/api/posts/${sc}/comments`),
      ]);
      const metrics  = await mRes.json();
      const comments = await cRes.json();
      updateDashboard(sc, metrics, comments);
    } catch (err) {
      showError('Could not load post: ' + err.message);
    }
  });

  /* ── Init ───────────────────────────────────────────── */
  loadHistory();
})();
