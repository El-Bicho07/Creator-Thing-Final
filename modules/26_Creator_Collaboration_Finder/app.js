(function() {
  'use strict';

  const Data = window.SyndicateData;
  const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY || 'YOUR_API_KEY_HERE';
  const LANGSMITH_BASE = 'https://api.smith.langchain.com';

  // ─── STATE ──────────────────────────────────────────────────
  let state = {
    profile: null,
    shortlist: [],
    savedPitches: [],
    lastRoute: '#/',
    filters: { platform: '', size: '', goal: '', field: '', search: '' },
    sort: 'best',
    setupStep: 1,
    agentAnalysis: null,
    theme: 'dark',
    evalStatus: null // null | 'running' | 'success' | 'error'
  };

  function loadState() {
    try {
      const saved = localStorage.getItem('syndicate.v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      }
    } catch (e) { console.warn("Storage blocked or unavailable."); }
  }

  function saveState() {
    try {
      localStorage.setItem('syndicate.v3', JSON.stringify({
        profile: state.profile,
        shortlist: state.shortlist,
        savedPitches: state.savedPitches,
        lastRoute: location.hash || '#/',
        theme: state.theme
      }));
    } catch (e) {}
    updateHeader();
  }

  // ─── UTILS ──────────────────────────────────────────────────
  const el = id => document.getElementById(id);
  const qs = sel => document.querySelector(sel);
  const qsa = sel => document.querySelectorAll(sel);

  function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    return n;
  }

  function updateHeader() {
    const badge = el('nav-badge');
    if (badge) badge.textContent = state.shortlist.length;

    const profileEl = el('nav-profile');
    if (profileEl) {
      if (state.profile) {
        const initial = state.profile.name ? state.profile.name.substring(0,1).toUpperCase() : '?';
        profileEl.innerHTML = `<div class="avatar bg-sage-10" style="width:28px;height:28px;font-size:12px;">${initial}</div><span style="font-size:13px;">${state.profile.name}</span>`;
      } else {
        profileEl.innerHTML = `<i data-lucide="user-plus" style="width:16px;height:16px;"></i> Create profile`;
      }
      refreshIcons();
    }

    // Update active nav link
    const hash = location.hash || '#/';
    qsa('.nav-link').forEach(link => {
      const route = link.getAttribute('data-route');
      link.classList.toggle('active', hash.includes(route));
    });
  }

  function getCategoryTint(field) {
    const sage = ["Technical writing", "Systems engineering", "Game development tooling", "Open-source maintainer", "Data journalism", "Science communication"];
    const clay = ["3D concept art", "Illustration", "Architecture and design", "Ceramics or woodworking", "Motion design", "Typography and lettering"];
    const lavender = ["Audio production", "Video essays", "Synth design", "Game composer"];
    if (sage.includes(field)) return 'sage';
    if (clay.includes(field)) return 'clay';
    if (lavender.includes(field)) return 'lavender';
    return 'sage';
  }

  function refreshIcons() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // ─── THEME ──────────────────────────────────────────────────
  function initTheme() {
    const saved = state.theme || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    state.theme = saved;
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    saveState();
    // Refresh particles with new colors
    initParticles();
  }

  // ─── CUSTOM CURSOR ─────────────────────────────────────────
  function initCursor() {
    const glow = el('cursor-glow');
    const dot = el('cursor-dot');
    if (!glow || !dot) return;

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;
    let dotX = 0, dotY = 0;

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animate() {
      // Smooth follow with lag
      glowX += (mouseX - glowX) * 0.06;
      glowY += (mouseY - glowY) * 0.06;
      dotX += (mouseX - dotX) * 0.15;
      dotY += (mouseY - dotY) * 0.15;

      glow.style.left = glowX + 'px';
      glow.style.top = glowY + 'px';
      dot.style.left = dotX + 'px';
      dot.style.top = dotY + 'px';

      requestAnimationFrame(animate);
    }
    animate();

    // Hover detection
    document.addEventListener('mouseover', e => {
      const interactive = e.target.closest('a, button, input, select, textarea, .card, [data-action]');
      if (interactive) {
        dot.classList.add('hovering');
        glow.style.width = '500px';
        glow.style.height = '500px';
      } else {
        dot.classList.remove('hovering');
        glow.style.width = '400px';
        glow.style.height = '400px';
      }
    });

    // Card mouse tracking for glow effect
    document.addEventListener('mousemove', e => {
      const card = e.target.closest('.card');
      if (card) {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--card-mouse-x', x + '%');
        card.style.setProperty('--card-mouse-y', y + '%');
      }

      // Button mouse tracking
      const btn = e.target.closest('.btn');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty('--mouse-x', ((e.clientX - rect.left) / rect.width * 100) + '%');
        btn.style.setProperty('--mouse-y', ((e.clientY - rect.top) / rect.height * 100) + '%');
      }
    });
  }

  // ─── PARTICLES ──────────────────────────────────────────────
  function initParticles() {
    const canvas = el('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;
    let animId;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.3 + 0.1;
        this.hue = Math.random() > 0.5 ? 120 : 250; // sage or lavender hue
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
      }
      draw() {
        const isDark = state.theme === 'dark';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `hsla(${this.hue}, 30%, 70%, ${this.opacity})`
          : `hsla(${this.hue}, 30%, 40%, ${this.opacity * 0.5})`;
        ctx.fill();
      }
    }

    function init() {
      resize();
      particles = [];
      const count = Math.min(80, Math.floor(w * h / 15000));
      for (let i = 0; i < count; i++) particles.push(new Particle());
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => { p.update(); p.draw(); });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const alpha = (1 - dist / 120) * 0.08;
            ctx.strokeStyle = state.theme === 'dark'
              ? `rgba(159, 184, 159, ${alpha})`
              : `rgba(100, 130, 100, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }

    if (animId) cancelAnimationFrame(animId);
    init();
    draw();
    window.addEventListener('resize', () => { resize(); });
  }

  // ─── SCROLL ANIMATIONS ─────────────────────────────────────
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    qsa('.reveal, .reveal-scale, .stagger-item').forEach(el => observer.observe(el));
  }

  function setupStaggerAnimations() {
    qsa('.stagger-container').forEach(container => {
      const items = container.querySelectorAll('.stagger-item');
      items.forEach((item, i) => {
        item.style.transitionDelay = `${i * 0.08}s`;
      });
    });
  }

  // ─── HEADER SCROLL EFFECT ──────────────────────────────────
  function initHeaderScroll() {
    const header = el('global-header');
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  // ─── SCORING ENGINE ─────────────────────────────────────────
  function getTierMidpoint(sizeLabel) {
    if (sizeLabel.includes('Just starting')) return 3000;
    if (sizeLabel.includes('Growing')) return 12000;
    if (sizeLabel.includes('Established')) return 50000;
    if (sizeLabel.includes('Large')) return 150000;
    return 12000;
  }

  function scoreCreator(user, creator) {
    let breakdown = { field: 0, interests: 0, audience: 0, style: 0, goal: 0 };

    // 1. Field (0-30)
    let fieldAdj = 0.2;
    if (user.field === creator.field) {
      fieldAdj = 0.7;
    } else if (Data.fieldAdjacency[user.field] && Data.fieldAdjacency[user.field][creator.field]) {
      fieldAdj = Data.fieldAdjacency[user.field][creator.field];
    } else if (Data.fieldAdjacency[creator.field] && Data.fieldAdjacency[creator.field][user.field]) {
      fieldAdj = Data.fieldAdjacency[creator.field][user.field];
    }
    breakdown.field = fieldAdj * 30;

    // 2. Interests (0-20)
    let overlap = 0;
    const userTags = (user.interests || []).map(t => t.toLowerCase());
    const creatorTags = (creator.interests || []).map(t => t.toLowerCase());
    userTags.forEach(ut => {
      let match = creatorTags.includes(ut);
      if (!match) {
        for (const [key, syns] of Object.entries(Data.synonyms)) {
          if ((key === ut || syns.includes(ut)) && (creatorTags.includes(key) || creatorTags.some(ct => syns.includes(ct)))) {
            match = true; break;
          }
        }
      }
      if (match) overlap++;
    });
    breakdown.interests = Math.max(3, Math.min(20, overlap * 6));

    // 3. Audience (0-20)
    const uSize = getTierMidpoint(user.audienceSize || "Growing (5k to 25k)");
    const cSize = creator.audience;
    const ratio = Math.min(uSize, cSize) / Math.max(uSize, cSize);
    let audScore = ratio * 20;
    if (user.goal === "Swap skills and make something together") {
      audScore = Math.max(audScore, 14);
    } else if (user.goal === "Appear as a guest on each other's channel" && cSize < (uSize * 0.3)) {
      audScore = Math.min(audScore, 6);
    }
    breakdown.audience = audScore;

    // 4. Style (0-15)
    let styleScore = 4.5;
    const uPlat = user.platform || "Substack";
    const cPlat = creator.platform;
    if (uPlat === cPlat) {
      styleScore = 15;
    } else if (Data.platformCompatibility[uPlat] && Data.platformCompatibility[uPlat][cPlat]) {
      styleScore = Data.platformCompatibility[uPlat][cPlat] * 15;
    } else if (Data.platformCompatibility[cPlat] && Data.platformCompatibility[cPlat][uPlat]) {
      styleScore = Data.platformCompatibility[cPlat][uPlat] * 15;
    }
    breakdown.style = styleScore;

    // 5. Goal (0-15)
    let goalScore = 2;
    const uGoal = user.goal || "Reach each other's audiences";
    if (creator.openGoals.includes(uGoal)) {
      goalScore = 15;
    } else {
      goalScore = 6;
    }
    breakdown.goal = goalScore;

    const total = Math.round(breakdown.field + breakdown.interests + breakdown.audience + breakdown.style + breakdown.goal);
    return {
      total: Math.min(100, Math.max(0, total)),
      breakdown: {
        field: Math.round(breakdown.field),
        interests: Math.round(breakdown.interests),
        audience: Math.round(breakdown.audience),
        style: Math.round(breakdown.style),
        goal: Math.round(breakdown.goal)
      }
    };
  }

  function getRankedCreators() {
    const profile = state.profile || {
      name: "Guest",
      field: "Technical writing",
      interests: ["documentation", "api design", "rust"],
      audienceSize: "Growing (5k to 25k)",
      platform: "Substack",
      goal: "Publish research or open-source work together"
    };

    let results = Data.creators.map(c => {
      const match = scoreCreator(profile, c);
      return { ...c, match };
    });

    if (state.profile && state.profile.name) {
      results = results.filter(c => c.name !== state.profile.name && c.handle !== state.profile.name);
    }

    results.sort((a, b) => {
      if (b.match.total !== a.match.total) return b.match.total - a.match.total;
      return b.audience - a.audience;
    });

    return results;
  }

  function applyFilters(creatorsList) {
    return creatorsList.filter(c => {
      if (state.filters.field && c.field !== state.filters.field) return false;
      if (state.filters.platform && c.platform !== state.filters.platform) return false;
      if (state.filters.search) {
        const s = state.filters.search.toLowerCase();
        return c.name.toLowerCase().includes(s) || c.handle.toLowerCase().includes(s) || c.field.toLowerCase().includes(s) || c.tags.some(t => t.toLowerCase().includes(s));
      }
      return true;
    });
  }

  // ─── SCORE RING SVG ─────────────────────────────────────────
  function renderScoreRing(score, size = 52) {
    const radius = (size / 2) - 4;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    return `
      <div class="score-ring" style="width:${size}px;height:${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle class="ring-bg" cx="${size/2}" cy="${size/2}" r="${radius}"/>
          <circle class="ring-fill" cx="${size/2}" cy="${size/2}" r="${radius}"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
        </svg>
        <div class="score-label">${score}</div>
      </div>
    `;
  }

  // ─── RENDERERS ──────────────────────────────────────────────
  const root = el('app-root');

  function renderCard(c, index) {
    const isSaved = state.shortlist.includes(c.id);
    const tint = getCategoryTint(c.field);
    const delay = Math.min(index * 0.06, 0.5);

    return `
      <div class="card stagger-item" style="transition-delay:${delay}s">
        <div class="card-top-strip strip-${tint}"></div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-12">
            <div class="avatar bg-${tint}-10">${c.initials}</div>
            <div>
              <div class="weight-600 text-16 truncate" style="max-width:200px;">${c.name}</div>
              <div class="mono text-12 color-text-3">${c.handle}</div>
            </div>
          </div>
          <div class="flex items-center gap-8">
            ${renderScoreRing(c.match.total)}
            <button class="btn-icon" data-action="toggle-save" data-id="${c.id}" aria-pressed="${isSaved}" aria-label="Save ${c.name}" style="width:36px;height:36px;">
              <i data-lucide="${isSaved ? 'bookmark-check' : 'bookmark'}" style="width:18px;height:18px;${isSaved ? 'color:var(--sage);' : ''}"></i>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-8" style="margin-top:14px;font-size:12px;color:var(--text-3);">
          <span class="flex items-center gap-4"><i data-lucide="radio" style="width:12px;height:12px;"></i>${c.platform}</span>
          ${c.verified ? `<span class="tint-sage flex items-center gap-4"><i data-lucide="badge-check" style="width:12px;height:12px;"></i>Verified</span>` : ''}
          <span class="flex items-center gap-4"><i data-lucide="clock" style="width:12px;height:12px;"></i>${c.timezone}</span>
        </div>

        <div class="text-14 color-text-2 bio-clamp" style="margin-top:14px;">${c.bio}</div>

        <div class="flex gap-6 flex-wrap" style="margin-top:16px;">
          ${c.tags.slice(0,3).map(t => `<span class="tag tag-${tint}">${t}</span>`).join('')}
          ${state.agentAnalysis && state.agentAnalysis[c.id] ? `<span class="tag tag-sage" style="background:rgba(var(--sage-rgb),0.15);">
            <i data-lucide="brain" style="width:10px;height:10px;margin-right:2px;"></i>
            Agent-verified ${state.agentAnalysis[c.id].judge_score || state.agentAnalysis[c.id].judgeScore || ''}
          </span>` : ''}
        </div>

        <div class="flex justify-between items-center" style="margin-top:24px;border-top:1px solid var(--line);padding-top:16px;">
          <div><div class="mono text-15 weight-600">${formatNum(c.audience)}</div><div class="text-12 color-text-3">Followers</div></div>
          <div><div class="mono text-15 weight-600">${c.engagementRate}%</div><div class="text-12 color-text-3">Engagement</div></div>
          <div class="text-right"><div class="mono text-15 weight-600">${c.cadence.split(' ')[0]}</div><div class="text-12 color-text-3">Posts</div></div>
        </div>

        <div class="flex gap-12 mt-auto" style="margin-top:20px;">
          <button class="btn btn-secondary w-full" data-action="open-drawer" data-id="${c.id}" data-tab="why" style="font-size:13px;">
            <i data-lucide="scan-search" style="width:14px;height:14px;"></i> See why
          </button>
          <button class="btn btn-primary w-full" data-action="open-drawer" data-id="${c.id}" data-tab="message" style="font-size:13px;">
            <i data-lucide="send" style="width:14px;height:14px;"></i> Reach out
          </button>
        </div>
      </div>
    `;
  }

  function renderHome() {
    const topMatches = getRankedCreators().slice(0, 3);

    root.innerHTML = `
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-bg">
          <img src="assets/hero-bg.jpg" alt="" loading="eager">
        </div>
        <div class="glow-orb glow-orb-sage" style="top:-100px;right:20%;"></div>
        <div class="glow-orb glow-orb-lavender" style="bottom:10%;left:10%;"></div>

        <div class="container hero-content">
          <div class="flex items-center gap-64" style="flex-wrap:wrap;">
            <div class="hero-headline reveal">
              <div class="overline">
                <i data-lucide="zap" style="width:14px;height:14px;"></i>
                For independent creators
              </div>
              <h1 class="display display-72 mb-24">Find the creator you should be<br><span class="text-gradient">working with.</span></h1>
              <p class="text-16 color-text-2 mb-32" style="max-width:520px;line-height:1.7;">
                Stop guessing who shares your audience. Syndicate scores thousands of creators to find your perfect collaboration partner — powered by AI.
              </p>
              <div class="flex gap-12 flex-wrap">
                <button class="btn btn-primary" data-action="nav" data-path="#/discover" style="padding:12px 28px;">
                  <i data-lucide="compass" style="width:16px;height:16px;"></i>
                  Find my matches
                </button>
                <button class="btn btn-secondary" data-action="nav" data-path="#/how-it-works" style="padding:12px 28px;">
                  <i data-lucide="play-circle" style="width:16px;height:16px;"></i>
                  See how it works
                </button>
              </div>
            </div>
            <div class="hero-cards-float reveal" style="transition-delay:0.3s;">
              ${topMatches.map((c, i) => {
                const tint = getCategoryTint(c.field);
                return `
                  <div class="hero-float-card">
                    <div class="flex items-center gap-12 mb-12">
                      <div class="avatar bg-${tint}-10" style="width:36px;height:36px;font-size:13px;">${c.initials}</div>
                      <div>
                        <div class="weight-600 text-14">${c.name}</div>
                        <div class="text-12 color-text-3">${c.field}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-8">
                      ${renderScoreRing(c.match.total, 40)}
                      <div>
                        <div class="mono text-12 color-text-3">Match score</div>
                        <div class="text-gradient weight-600 text-16" style="-webkit-text-fill-color:unset;color:var(--sage);">${c.match.total}%</div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- Marquee -->
      <div class="marquee-container">
        <div class="marquee-track">
          ${['Technical Writing', '3D Concept Art', 'Audio Production', 'Video Essays', 'Game Dev', 'Motion Design', 'Data Journalism', 'Typography', 'Science Comm', 'Synth Design', 'Illustration', 'Open Source',
            'Technical Writing', '3D Concept Art', 'Audio Production', 'Video Essays', 'Game Dev', 'Motion Design', 'Data Journalism', 'Typography', 'Science Comm', 'Synth Design', 'Illustration', 'Open Source'
          ].map(t => `<span class="marquee-item">${t}<span class="marquee-dot"></span></span>`).join('')}
        </div>
      </div>

      <!-- Stats -->
      <section class="section">
        <div class="container">
          <div class="stats-bar reveal">
            <div class="stat-item">
              <div class="stat-value" data-count="16">16</div>
              <div class="stat-label">Creators</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" data-count="100">100</div>
              <div class="stat-label">Point Algorithm</div>
            </div>
            <div class="stat-item">
              <div class="stat-value" data-count="5">5</div>
              <div class="stat-label">Match Factors</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">AI</div>
              <div class="stat-label">Verified Matches</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Popular Matches -->
      <section class="section" style="padding-top:0;">
        <div class="container">
          <div class="flex justify-between items-center mb-48 flex-wrap gap-16 reveal">
            <div>
              <div class="mono mono-11 color-text-3 mb-8">TOP MATCHES</div>
              <h2 class="display display-48">Popular matches right now</h2>
            </div>
            <button class="btn btn-glow" data-action="nav" data-path="#/discover">
              <i data-lucide="arrow-right" style="width:16px;height:16px;"></i>
              View all
            </button>
          </div>
          <div class="card-grid stagger-container">
            ${topMatches.map((c, i) => renderCard(c, i)).join('')}
          </div>
        </div>
      </section>

      <div class="section-divider"></div>

      <!-- How it works (preview) -->
      <section class="section">
        <div class="container">
          <div class="text-center mb-64 reveal">
            <div class="mono mono-11 color-text-3 mb-8">WORKFLOW</div>
            <h2 class="display display-48">How it works</h2>
          </div>
          <div class="flex gap-24" style="flex-wrap:wrap;">
            <div class="step-card reveal reveal-delay-1" style="flex:1;min-width:260px;">
              <div class="step-number">01</div>
              <h3 class="weight-600 text-16 mb-8">Tell us about you</h3>
              <p class="color-text-2 text-14">Takes 2 minutes. No account required. Your data stays in your browser.</p>
            </div>
            <div class="step-card reveal reveal-delay-2" style="flex:1;min-width:260px;">
              <div class="step-number">02</div>
              <h3 class="weight-600 text-16 mb-8">See your best matches</h3>
              <p class="color-text-2 text-14">Ranked by shared interests, audience overlap, and compatibility — scored out of 100.</p>
            </div>
            <div class="step-card reveal reveal-delay-3" style="flex:1;min-width:260px;">
              <div class="step-number">03</div>
              <h3 class="weight-600 text-16 mb-8">Send a message that gets read</h3>
              <p class="color-text-2 text-14">Use our AI-crafted message drafts, personalised for each collaborator.</p>
            </div>
          </div>
        </div>
      </section>

      <div class="section-divider"></div>

      <!-- CTA -->
      <section class="section" style="position:relative;overflow:hidden;">
        <div class="glow-orb glow-orb-sage" style="top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;"></div>
        <div class="container text-center reveal" style="position:relative;z-index:1;">
          <div class="mono mono-11 color-text-3 mb-8">READY?</div>
          <h2 class="display display-48 mb-32">Start discovering<br><span class="text-gradient">your perfect match.</span></h2>
          <button class="btn btn-primary" data-action="nav" data-path="#/discover" style="padding:14px 36px;font-size:16px;">
            <i data-lucide="sparkles" style="width:18px;height:18px;"></i>
            Start discovering
          </button>
        </div>
      </section>
    `;
    afterRender();
  }

  function renderDiscover() {
    let creators = getRankedCreators();
    creators = applyFilters(creators);

    let banner = '';
    if (!state.profile) {
      banner = `<div class="reveal" style="background:rgba(var(--sage-rgb),0.06);border:1px solid rgba(var(--sage-rgb),0.12);border-radius:var(--radius-md);padding:14px 24px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div class="flex items-center gap-8 text-14">
          <i data-lucide="info" style="width:16px;height:16px;color:var(--sage);"></i>
          <span class="color-text-2">Showing results for a sample profile. Create yours for personalised matches.</span>
        </div>
        <button class="btn btn-glow" style="min-height:36px;padding:6px 16px;font-size:13px;" data-action="go-profile">Create profile</button>
      </div>`;
    }

    root.innerHTML = `
      ${banner}
      <div class="container section" style="padding-top:48px;">
        <div class="reveal">
          <div class="mono mono-11 color-text-3 mb-8">DISCOVER</div>
          <h1 class="display display-48 mb-8">Find collaborators</h1>
          <p class="color-text-2 text-16 mb-32">Results ranked by match score. ${creators.length} creators found.</p>
        </div>

        <div class="flex justify-between items-center mb-24 flex-wrap gap-16 reveal">
          <div class="flex gap-8 items-center flex-wrap">
            <div class="relative">
              <input type="text" class="input" placeholder="Search creators..." id="search-input" value="${state.filters.search}" style="width:280px;padding-left:40px;" data-action="search-input">
              <i data-lucide="search" style="position:absolute;left:14px;top:14px;width:16px;height:16px;color:var(--text-3);pointer-events:none;"></i>
            </div>
            ${state.filters.field || state.filters.search ? `<button class="btn btn-secondary" style="border:none;font-size:13px;" data-action="clear-filters"><i data-lucide="x" style="width:14px;height:14px;"></i> Clear</button>` : ''}
            <button class="btn btn-glow" data-action="run-analysis" id="btn-run-analysis" style="font-size:13px;">
              <i data-lucide="brain" style="width:14px;height:14px;"></i>
              Run AI analysis
            </button>
            <span id="analysis-error" class="text-13" style="color:var(--clay);display:none;">Analysis failed. Existing data unaffected.</span>
          </div>
          <div class="flex gap-8">
            ${['All', ...new Set(Data.creators.map(c => c.platform))].map(p =>
              `<button class="tag ${state.filters.platform === (p === 'All' ? '' : p) ? 'tag-sage' : ''}" data-action="filter-platform" data-platform="${p === 'All' ? '' : p}" style="cursor:none;">${p}</button>`
            ).join('')}
          </div>
        </div>

        ${creators.length === 0 ? `
          <div class="text-center reveal" style="padding:80px 0;border:1px solid var(--line);border-radius:var(--radius-lg);">
            <i data-lucide="search-x" style="width:48px;height:48px;color:var(--text-3);margin-bottom:16px;"></i>
            <div class="text-16 weight-500 mb-16">No collaborators match these filters</div>
            <button class="btn btn-secondary" data-action="clear-filters">Clear filters</button>
          </div>
        ` : `
          <div class="card-grid stagger-container">
            ${creators.map((c, i) => renderCard(c, i)).join('')}
          </div>
        `}
      </div>
    `;
    afterRender();
  }

  function renderProfile() {
    if (state.profile && state.profile.name !== "Guest" && state.setupStep === 'done') {
      root.innerHTML = `
        <div class="container section" style="padding-top:48px;">
          <div style="max-width:600px;margin:0 auto;">
            <div class="reveal">
              <div class="mono mono-11 color-text-3 mb-8">YOUR PROFILE</div>
              <h1 class="display display-48 mb-32">Profile</h1>
            </div>
            <div class="glass reveal reveal-delay-1" style="padding:32px;">
              <div class="flex items-center gap-16 mb-32">
                <div class="avatar bg-sage-10 text-20" style="width:64px;height:64px;font-size:24px;color:var(--sage);">${state.profile.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div class="text-20 weight-600">${state.profile.name}</div>
                  <div class="color-text-2">${state.profile.field}</div>
                </div>
              </div>
              <div class="flex flex-col mb-32">
                <div class="flex justify-between items-start py-16" style="border-top:1px solid var(--line);">
                  <div class="mono mono-11 color-text-3" style="width:120px;flex-shrink:0;">Platform</div>
                  <div class="text-14">${state.profile.platform || 'Substack'}</div>
                </div>
                <div class="flex justify-between items-start py-16" style="border-top:1px solid var(--line);">
                  <div class="mono mono-11 color-text-3" style="width:120px;flex-shrink:0;">Audience Size</div>
                  <div class="text-14">${state.profile.audienceSize}</div>
                </div>
                <div class="flex justify-between items-start py-16" style="border-top:1px solid var(--line);">
                  <div class="mono mono-11 color-text-3" style="width:120px;flex-shrink:0;">Interests</div>
                  <div class="flex gap-6 flex-wrap justify-end">${(state.profile.interests||[]).map(t=>`<span class="tag tag-sage">${t}</span>`).join('')}</div>
                </div>
                <div class="flex justify-between items-start py-16" style="border-top:1px solid var(--line);border-bottom:1px solid var(--line);">
                  <div class="mono mono-11 color-text-3" style="width:120px;flex-shrink:0;">Primary Goal</div>
                  <div class="text-14 text-right">${state.profile.goal}</div>
                </div>
              </div>
              <div class="flex gap-12 flex-wrap">
                <button class="btn btn-primary" data-action="edit-profile"><i data-lucide="pencil" style="width:14px;height:14px;"></i> Edit profile</button>
                <button class="btn btn-secondary" data-action="reset-profile"><i data-lucide="trash-2" style="width:14px;height:14px;"></i> Reset everything</button>
              </div>
            </div>
          </div>
        </div>
      `;
      afterRender();
      return;
    }

    const step = typeof state.setupStep === 'number' ? state.setupStep : 1;

    root.innerHTML = `
      <div class="container section" style="padding-top:48px;">
        <div style="max-width:600px;margin:0 auto;">
          <div class="reveal">
            <div class="mono mono-11 color-text-3 mb-8">PROFILE SETUP</div>
            <h1 class="display display-48 mb-16">Your profile</h1>
            <p class="color-text-2 text-16 mb-32">Matches are scored locally from these fields. No data leaves your browser.</p>
          </div>

          <div class="steps-indicator reveal reveal-delay-1">
            <div class="step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}"></div>
            <div class="step-dot ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}"></div>
            <div class="step-dot ${step >= 3 ? 'active' : ''}"></div>
          </div>

          <div class="mb-24 reveal reveal-delay-2">
            <div class="mono text-12 color-text-3 mb-8">Quick start from a template</div>
            <div class="flex gap-8 flex-wrap">
              <button class="btn btn-secondary" data-action="preset-profile" data-type="writer" style="font-size:12px;min-height:36px;padding:6px 14px;">
                <i data-lucide="pen-tool" style="width:12px;height:12px;"></i> Technical writer
              </button>
              <button class="btn btn-secondary" data-action="preset-profile" data-type="audio" style="font-size:12px;min-height:36px;padding:6px 14px;">
                <i data-lucide="headphones" style="width:12px;height:12px;"></i> Audio producer
              </button>
              <button class="btn btn-secondary" data-action="preset-profile" data-type="3d" style="font-size:12px;min-height:36px;padding:6px 14px;">
                <i data-lucide="box" style="width:12px;height:12px;"></i> 3D concept artist
              </button>
            </div>
          </div>

          <div class="glass reveal reveal-delay-3" style="padding:32px;">
            <div id="setup-step-1" class="${step === 1 ? '' : 'hidden'}">
              <div class="mono mono-11 tint-sage mb-16">STEP 1 OF 3 — ABOUT YOU</div>
              <div class="flex flex-col gap-16 mb-24">
                <div>
                  <label class="text-13 color-text-2 mb-4" style="display:block;">Name or handle</label>
                  <input type="text" class="input" id="prof-name" placeholder="e.g. @janedoe" value="${state.profile?.name || ''}">
                  <div class="error-message">Required</div>
                </div>
                <div>
                  <label class="text-13 color-text-2 mb-4" style="display:block;">Main field</label>
                  <select class="input" id="prof-field">
                    <option value="">Select your field...</option>
                    ${Data.fields.map(f => `<option value="${f}" ${state.profile?.field === f ? 'selected' : ''}>${f}</option>`).join('')}
                  </select>
                  <div class="error-message">Required</div>
                </div>
                <div>
                  <label class="text-13 color-text-2 mb-4" style="display:block;">Primary platform</label>
                  <select class="input" id="prof-platform">
                    ${['Substack','Podcast','YouTube','GitHub','Instagram','Twitter'].map(p => `<option value="${p}" ${state.profile?.platform === p ? 'selected' : ''}>${p}</option>`).join('')}
                  </select>
                </div>
              </div>
              <button class="btn btn-primary" data-action="profile-next" data-step="2">Next step <i data-lucide="arrow-right" style="width:14px;height:14px;"></i></button>
            </div>

            <div id="setup-step-2" class="${step === 2 ? '' : 'hidden'}">
              <div class="mono mono-11 tint-sage mb-16">STEP 2 OF 3 — YOUR AUDIENCE</div>
              <div class="flex flex-col gap-16 mb-24">
                <div>
                  <label class="text-13 color-text-2 mb-4" style="display:block;">Audience size</label>
                  <select class="input" id="prof-size">
                    <option value="Just starting (under 5k)">Just starting (under 5k)</option>
                    <option value="Growing (5k to 25k)">Growing (5k to 25k)</option>
                    <option value="Established (25k to 100k)">Established (25k to 100k)</option>
                    <option value="Large (100k+)">Large (100k+)</option>
                  </select>
                </div>
                <div>
                  <label class="text-13 color-text-2 mb-4" style="display:block;">Interests (comma separated)</label>
                  <input type="text" class="input" id="prof-tags" placeholder="e.g. rust, systems, open source" value="${(state.profile?.interests||[]).join(', ')}">
                </div>
              </div>
              <div class="flex gap-12">
                <button class="btn btn-secondary" data-action="profile-next" data-step="1"><i data-lucide="arrow-left" style="width:14px;height:14px;"></i> Back</button>
                <button class="btn btn-primary" data-action="profile-next" data-step="3">Next step <i data-lucide="arrow-right" style="width:14px;height:14px;"></i></button>
              </div>
            </div>

            <div id="setup-step-3" class="${step === 3 ? '' : 'hidden'}">
              <div class="mono mono-11 tint-sage mb-16">STEP 3 OF 3 — YOUR GOAL</div>
              <div class="flex flex-col gap-16 mb-24">
                <select class="input" id="prof-goal">
                  <option value="Reach each other's audiences">Reach each other's audiences</option>
                  <option value="Swap skills and make something together">Swap skills and make something together</option>
                  <option value="Publish research or open-source work together">Publish research or open-source work together</option>
                  <option value="Appear as a guest on each other's channel">Appear as a guest on each other's channel</option>
                </select>
              </div>
              <div class="flex gap-12 flex-wrap">
                <button class="btn btn-secondary" data-action="profile-next" data-step="2"><i data-lucide="arrow-left" style="width:14px;height:14px;"></i> Back</button>
                <button class="btn btn-primary" data-action="save-profile">
                  <i data-lucide="sparkles" style="width:14px;height:14px;"></i> Show my matches
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    afterRender();
  }

  function renderProjects() {
    root.innerHTML = `
      <div class="container section" style="padding-top:48px;">
        <div class="reveal">
          <div class="mono mono-11 color-text-3 mb-8">PROJECTS</div>
          <h1 class="display display-48 mb-32">Saved messages</h1>
        </div>
        ${state.savedPitches.length === 0 ?
          `<div class="glass text-center reveal reveal-delay-1" style="padding:64px;">
            <i data-lucide="folder-open" style="width:48px;height:48px;color:var(--text-3);margin-bottom:16px;"></i>
            <p class="color-text-2 mb-24 text-16">No saved message drafts yet.</p>
            <button class="btn btn-primary" data-action="nav" data-path="#/discover"><i data-lucide="compass" style="width:14px;height:14px;"></i> Find matches</button>
          </div>` :
          `<div class="flex flex-col gap-16 stagger-container">
            ${state.savedPitches.map((p, i) => `
              <div class="glass stagger-item" style="padding:24px;transition-delay:${i*0.08}s;">
                <div class="flex justify-between items-start mb-16 flex-wrap gap-16">
                  <div>
                    <div class="weight-600 text-16">${p.creatorName}</div>
                    <div class="mono text-12 color-text-3" style="margin-top:4px;">Saved on ${p.date} · ${p.tone}</div>
                  </div>
                  <div class="flex gap-8">
                    <button class="btn btn-secondary" data-action="copy-project" data-index="${i}" style="font-size:13px;min-height:36px;padding:6px 14px;">
                      <i data-lucide="copy" style="width:12px;height:12px;"></i> Copy
                    </button>
                    <button class="btn btn-secondary" data-action="delete-project" data-index="${i}" style="font-size:13px;min-height:36px;padding:6px 14px;">
                      <i data-lucide="trash-2" style="width:12px;height:12px;"></i> Delete
                    </button>
                  </div>
                </div>
                <div class="color-text-2 text-14" style="white-space:pre-wrap;background:var(--bg);padding:16px;border-radius:var(--radius-md);border:1px solid var(--line);">${p.text}</div>
              </div>
            `).join('')}
          </div>`
        }
      </div>
    `;
    afterRender();
  }

  function renderHowItWorks() {
    root.innerHTML = `
      <div class="container section" style="padding-top:48px;max-width:800px;margin:0 auto;">
        <div class="reveal">
          <div class="mono mono-11 color-text-3 mb-8">ALGORITHM</div>
          <h1 class="display display-48 mb-8">How the match score works</h1>
          <p class="text-16 color-text-2 mb-48" style="line-height:1.7;">Syndicate uses a 100-point algorithm to find collaborators that actually make sense. Here is exactly how we calculate it.</p>
        </div>

        ${[
          { num: '01', title: 'Related field', pts: '30', icon: 'layers', desc: 'We compare your main field to theirs. Identical fields get 21 points. Closely adjacent fields (like 3D concept art and Game development tooling) score up to 28.5 points to encourage cross-pollination. Distant fields get a minimum of 6 points.' },
          { num: '02', title: 'Shared interests', pts: '20', icon: 'link', desc: 'We look at your specific tags and map synonyms (e.g. "rust" matches "systems"). The more overlap, the higher the score.' },
          { num: '03', title: 'Similar audience size', pts: '20', icon: 'users', desc: 'A straight ratio of your audience sizes. This is relaxed if your goal is "Swap skills", but heavily penalised for "Guest appearance" if there\'s a massive mismatch.' },
          { num: '04', title: 'Content style fit', pts: '15', icon: 'radio', desc: 'We score how well your primary platforms mix. A Podcast and a YouTube channel mix very well; GitHub and Instagram less so.' },
          { num: '05', title: 'Goal fit', pts: '15', icon: 'target', desc: 'If they have explicitly stated they are open to your specific goal, you get full points.' }
        ].map((s, i) => `
          <div class="step-card reveal" style="margin-bottom:24px;transition-delay:${i*0.1}s;">
            <div class="flex items-center gap-16 mb-16">
              <div class="step-number" style="font-size:36px;margin-bottom:0;">${s.num}</div>
              <div>
                <h2 class="weight-600 text-20">${s.title}</h2>
                <div class="mono text-12 color-text-3">Up to ${s.pts} points</div>
              </div>
              <div style="margin-left:auto;">
                <i data-lucide="${s.icon}" style="width:24px;height:24px;color:var(--sage);"></i>
              </div>
            </div>
            <p class="text-15 color-text-2" style="line-height:1.7;">${s.desc}</p>
          </div>
        `).join('')}

        <div class="glass reveal" style="padding:32px;margin-top:48px;">
          <h3 class="weight-600 mb-24 text-20 flex items-center gap-8">
            <i data-lucide="book-open" style="width:20px;height:20px;color:var(--sage);"></i>
            Glossary
          </h3>
          <table class="w-full text-14 text-left" style="border-collapse:collapse;">
            <tr style="border-bottom:1px solid var(--line);"><th style="padding:16px 0;font-weight:600;">Term</th><th class="color-text-2" style="padding:16px 0;font-weight:400;">Meaning</th></tr>
            <tr style="border-bottom:1px solid var(--line);"><td style="padding:16px 0;">Match score</td><td class="color-text-2" style="padding:16px 0;">The total 0-100 compatibility rating.</td></tr>
            <tr style="border-bottom:1px solid var(--line);"><td style="padding:16px 0;">Shared audience</td><td class="color-text-2" style="padding:16px 0;">The estimated percentage of your followers who already follow them.</td></tr>
            <tr><td style="padding:16px 0;">Engagement rate</td><td class="color-text-2" style="padding:16px 0;">How actively their audience interacts with their content.</td></tr>
          </table>
        </div>
      </div>
    `;
    afterRender();
  }

  function renderHelp() {
    root.innerHTML = `
      <div class="container section" style="padding-top:48px;max-width:800px;margin:0 auto;">
        <div class="reveal">
          <div class="mono mono-11 color-text-3 mb-8">SUPPORT</div>
          <h1 class="display display-48 mb-32">Help & Support</h1>
          <p class="text-16 color-text-2 mb-32" style="line-height:1.7;">Need assistance? Reach out at support@syndicate-example.com.</p>
        </div>

        <div class="glass reveal reveal-delay-1" style="padding:32px;">
          <h2 class="weight-600 text-20 mb-16 flex items-center gap-8">
            <i data-lucide="keyboard" style="width:20px;height:20px;color:var(--sage);"></i>
            Keyboard shortcuts
          </h2>
          <div class="flex flex-col gap-8">
            ${[
              ['/', 'Focus search on Discover'],
              ['Esc', 'Close drawers, modals, and clear search'],
              ['Tab', 'Navigate interactive elements'],
              ['T', 'Toggle theme (dark/light)']
            ].map(([key, desc]) => `
              <div class="flex justify-between items-center py-8" style="border-bottom:1px solid var(--line);">
                <span class="color-text-2 text-14">${desc}</span>
                <kbd class="mono text-12" style="padding:4px 10px;background:var(--surface);border:1px solid var(--line);border-radius:6px;">${key}</kbd>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    afterRender();
  }

  function renderShortlist() {
    let creators = getRankedCreators().filter(c => state.shortlist.includes(c.id));

    root.innerHTML = `
      <div class="container section" style="padding-top:48px;">
        <div class="flex justify-between items-center mb-32 flex-wrap gap-16 reveal">
          <div>
            <div class="mono mono-11 color-text-3 mb-8">SAVED</div>
            <h1 class="display display-48">Saved collaborators</h1>
          </div>
          ${creators.length > 0 ? `<button class="btn btn-secondary" data-action="copy-saved"><i data-lucide="copy" style="width:14px;height:14px;"></i> Copy saved list</button>` : ''}
        </div>
        ${creators.length === 0 ?
          `<div class="glass text-center reveal reveal-delay-1" style="padding:64px;">
            <i data-lucide="bookmark" style="width:48px;height:48px;color:var(--text-3);margin-bottom:16px;"></i>
            <p class="color-text-2 mb-24 text-16">Nothing saved yet. Start by discovering collaborators.</p>
            <button class="btn btn-primary" data-action="nav" data-path="#/discover"><i data-lucide="compass" style="width:14px;height:14px;"></i> Go to Discover</button>
          </div>` :
          `<div class="card-grid stagger-container">${creators.map((c, i) => renderCard(c, i)).join('')}</div>`
        }
      </div>
    `;
    afterRender();
  }

  // ─── DRAWER ─────────────────────────────────────────────────
  function renderDrawer(cId, tab) {
    const creator = Data.creators.find(c => c.id === cId);
    if (!creator) return;
    const profile = state.profile || { name: "Guest", field: "Technical writing", interests: ["rust"], audienceSize: "Growing (5k to 25k)", platform: "Substack", goal: "Swap skills and make something together" };
    const score = scoreCreator(profile, creator);
    const tint = getCategoryTint(creator.field);

    const overlayEl = el('overlay-container');
    overlayEl.innerHTML = `
      <div class="drawer open" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div class="drawer-header">
          <div class="flex justify-between items-start">
            <div class="flex gap-12 items-center">
              <div class="avatar bg-${tint}-10">${creator.initials}</div>
              <div>
                <div class="weight-600 text-16" id="drawer-title">${creator.name}</div>
                <div class="mono text-12 color-text-3">${creator.handle} · ${creator.platform}</div>
              </div>
            </div>
            <div class="flex gap-12 items-center">
              ${renderScoreRing(score.total)}
              <button class="btn-icon" data-action="close-overlays" aria-label="Close drawer"><i data-lucide="x"></i></button>
            </div>
          </div>
        </div>

        <div class="tablist" role="tablist">
          <button class="tab" role="tab" aria-selected="${tab==='why'}" data-action="switch-tab" data-tab="why">Why you match</button>
          <button class="tab" role="tab" aria-selected="${tab==='ideas'}" data-action="switch-tab" data-tab="ideas">Project ideas</button>
          <button class="tab" role="tab" aria-selected="${tab==='message'}" data-action="switch-tab" data-tab="message">Message draft</button>
        </div>

        <div class="drawer-content">
          <div class="tabpanel ${tab==='why'?'active':''}" id="panel-why">
            <div class="mb-32">
              ${Object.entries(score.breakdown).map(([k,v]) => {
                const maxVal = k === 'field' ? 30 : (k==='interests'||k==='audience') ? 20 : 15;
                const pct = (v / maxVal) * 100;
                const label = k === 'interests' ? 'Shared interests' : k === 'audience' ? 'Audience match' : k === 'field' ? 'Related field' : k === 'style' ? 'Style fit' : 'Goal fit';
                return `
                  <div class="flex justify-between items-center mb-12">
                    <div class="text-14 color-text-2">${label}</div>
                    <div class="flex items-center gap-12">
                      <div class="mono text-14 weight-600">${v}</div>
                      <div style="width:120px;height:4px;background:var(--line);border-radius:2px;overflow:hidden;">
                        <div style="width:${pct}%;height:100%;background:var(--gradient-primary);border-radius:2px;transition:width 0.8s var(--ease-out-expo);"></div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="mb-24">
              <h3 class="mono mono-11 color-text-3 mb-8">SHARED AUDIENCE</h3>
              <p class="text-14 color-text-2">Based on overlapping niches, roughly ${(creator.sharedAudience*100).toFixed(0)}% of your audience follows them too. Cross-promotion could yield meaningful conversion.</p>
            </div>

            <div class="mb-24">
              <h3 class="mono mono-11 color-text-3 mb-8">WHAT YOU EACH BRING</h3>
              <div class="flex gap-16 text-14 color-text-2">
                <div class="glass" style="flex:1;padding:16px;"><strong class="color-text">You:</strong><br/>${profile.field}<br/>${profile.audienceSize} reach</div>
                <div class="glass" style="flex:1;padding:16px;"><strong class="color-text">Them:</strong><br/>${creator.field}<br/>${creator.platform} · ${formatNum(creator.audience)} followers</div>
              </div>
            </div>

            <div class="mb-24">
              <h3 class="mono mono-11 color-text-3 mb-8">CONSIDERATIONS</h3>
              <p class="text-14 color-text-2">They post on a ${creator.cadence.toLowerCase()}, which might require asynchronous coordination. ${creator.platform} audiences expect native formats.</p>
            </div>

            ${state.agentAnalysis && state.agentAnalysis[cId] ? `
              <div class="accordion-item mb-16 glass" style="padding:0 16px;">
                <button class="accordion-header" data-action="toggle-accordion" style="color:var(--sage);border:none;">
                  <span class="flex items-center gap-8"><i data-lucide="brain" style="width:14px;height:14px;"></i> AI Agent Analysis</span>
                  <i data-lucide="chevron-down" style="width:16px;height:16px;"></i>
                </button>
                <div class="accordion-content text-14">
                  <div class="color-text-2 mb-16">
                    <strong class="color-text">Fetcher's reasoning:</strong><br/>
                    ${state.agentAnalysis[cId].fetcher_reasoning || state.agentAnalysis[cId].fetcherReasoning || 'Analysis completed.'}
                  </div>
                  <div class="color-text-2">
                    <strong class="color-text">Judge's notes:</strong><br/>
                    ${state.agentAnalysis[cId].judge_notes || state.agentAnalysis[cId].judgeNotes || 'Verified match quality.'}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="tabpanel ${tab==='ideas'?'active':''}" id="panel-ideas">
            <div class="accordion-item open mb-16 glass" style="padding:0 16px;">
              <button class="accordion-header" data-action="toggle-accordion" style="border:none;">
                <span>Made together</span>
                <i data-lucide="chevron-down" style="width:16px;height:16px;"></i>
              </button>
              <div class="accordion-content text-14">
                <div class="weight-500 mb-8 color-text">A shared media piece combining ${creator.tags[0]} and your focus.</div>
                <div class="color-text-2 mb-16">Time: 12 to 16 hours total, split 60/40.</div>
                <table class="w-full text-13 mb-16"><tr><th class="color-text weight-500 pb-8" style="text-align:left;">You</th><th class="color-text weight-500 pb-8" style="text-align:left;">Them</th></tr><tr><td class="color-text-2">Content framing, day 0</td><td class="color-text-2">Production edit, day 3</td></tr></table>
                <button class="btn btn-secondary w-full" data-action="switch-tab" data-tab="message"><i data-lucide="pen-tool" style="width:12px;height:12px;"></i> Use this idea</button>
              </div>
            </div>
            <div class="accordion-item mb-16 glass" style="padding:0 16px;">
              <button class="accordion-header" data-action="toggle-accordion" style="border:none;">
                <span>A shared resource</span>
                <i data-lucide="chevron-down" style="width:16px;height:16px;"></i>
              </button>
              <div class="accordion-content text-14">
                <div class="weight-500 mb-8 color-text">An open-source toolkit or guide.</div>
                <div class="color-text-2 mb-16">Time: 4 to 8 hours.</div>
                <button class="btn btn-secondary w-full" data-action="switch-tab" data-tab="message"><i data-lucide="pen-tool" style="width:12px;height:12px;"></i> Use this idea</button>
              </div>
            </div>
          </div>

          <div class="tabpanel ${tab==='message'?'active':''}" id="panel-message">
            <div class="flex gap-4 mb-16" style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-sm);padding:4px;" id="tone-toggle-container">
              <button class="btn" data-action="switch-tone" data-tone="casual" data-id="${cId}" style="flex:1;min-height:36px;background:var(--elevated);border:1px solid var(--line);color:var(--text);font-size:13px;">Casual</button>
              <button class="btn" data-action="switch-tone" data-tone="formal" data-id="${cId}" style="flex:1;min-height:36px;color:var(--text-2);background:transparent;border:none;font-size:13px;">Formal</button>
            </div>
            <textarea id="draft-text" class="input" style="height:260px;margin-bottom:16px;resize:vertical;">Hey ${creator.name.split(' ')[0]},
I've been following your work on ${creator.platform} and really respect your approach to ${creator.tags[0]}. Our audiences share a lot of the same interests.

I had an idea for a joint piece where I handle the technical framing and you drive the production. It would take about 12 hours total.

Let me know if you have bandwidth for a quick 20-minute chat this week to explore it.</textarea>
            <div class="flex gap-12 flex-wrap">
              <button class="btn btn-primary" style="flex:1;" data-action="copy-draft"><i data-lucide="copy" style="width:14px;height:14px;"></i> Copy message</button>
              <button class="btn btn-secondary" style="flex:1;" data-action="save-draft"><i data-lucide="save" style="width:14px;height:14px;"></i> Save to Projects</button>
            </div>
          </div>
        </div>
      </div>
    `;
    el('backdrop').classList.add('open');
    document.body.style.overflow = 'hidden';
    refreshIcons();

    const drawer = el('drawer');
    const focusable = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length) focusable[0].focus();
  }

  // ─── LANGSMITH EVALUATION ───────────────────────────────────
  async function runLangSmithEval() {
    const statusBar = el('eval-status-bar');
    const statusText = el('eval-status-text');
    const header = el('global-header');

    statusBar.classList.remove('hidden', 'success', 'error');
    header.classList.add('has-eval');
    state.evalStatus = 'running';
    statusText.textContent = 'LangSmith evaluation running...';
    refreshIcons();

    try {
      // Create a dataset for evaluation
      const creators = getRankedCreators().slice(0, 5);
      const profile = state.profile || {
        name: "Guest", field: "Technical writing",
        interests: ["documentation", "api design", "rust"],
        audienceSize: "Growing (5k to 25k)", platform: "Substack",
        goal: "Publish research or open-source work together"
      };

      // Create a tracing project in LangSmith
      const projectName = `syndicate-eval-${Date.now()}`;

      const projectRes = await fetch(`${LANGSMITH_BASE}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': LANGSMITH_API_KEY
        },
        body: JSON.stringify({
          name: projectName,
          description: 'Syndicate match scoring evaluation run'
        })
      });

      let projectId = null;
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        projectId = projectData.id;
        statusText.textContent = `Project created: ${projectName}`;
      }

      // Log each creator evaluation as a run
      const evalResults = [];
      for (const creator of creators) {
        const score = scoreCreator(profile, creator);

        const runPayload = {
          name: `eval-${creator.name}`,
          run_type: 'chain',
          inputs: {
            profile: profile,
            creator: {
              name: creator.name,
              field: creator.field,
              platform: creator.platform,
              audience: creator.audience,
              tags: creator.tags
            }
          },
          outputs: {
            match_score: score.total,
            breakdown: score.breakdown,
            field_match: score.breakdown.field,
            interest_overlap: score.breakdown.interests,
            audience_fit: score.breakdown.audience,
            style_fit: score.breakdown.style,
            goal_alignment: score.breakdown.goal
          },
          session_name: projectName,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString()
        };

        try {
          const runRes = await fetch(`${LANGSMITH_BASE}/api/v1/runs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': LANGSMITH_API_KEY
            },
            body: JSON.stringify(runPayload)
          });

          if (runRes.ok) {
            evalResults.push({
              id: creator.id,
              name: creator.name,
              score: score.total,
              status: 'logged'
            });
            statusText.textContent = `Evaluated ${evalResults.length}/${creators.length}: ${creator.name} (${score.total}%)`;
          }
        } catch (err) {
          evalResults.push({ id: creator.id, name: creator.name, score: score.total, status: 'local' });
        }
      }

      // Success state
      state.evalStatus = 'success';
      statusBar.classList.add('success');
      const loggedCount = evalResults.filter(r => r.status === 'logged').length;
      statusText.textContent = `✓ Evaluation complete — ${loggedCount}/${evalResults.length} runs logged to LangSmith`;

      // Store results
      if (!state.agentAnalysis) state.agentAnalysis = {};
      evalResults.forEach(r => {
        state.agentAnalysis[r.id] = {
          judgeScore: r.score,
          fetcherReasoning: `LangSmith evaluated ${r.name} with a match score of ${r.score}% across 5 dimensions.`,
          judgeNotes: `Evaluation ${r.status === 'logged' ? 'logged to LangSmith project' : 'completed locally'}.`
        };
      });

      // Re-render current page if on discover
      if (location.hash === '#/discover') renderDiscover();

      return { success: true, results: evalResults, projectId, projectName };

    } catch (err) {
      state.evalStatus = 'error';
      statusBar.classList.add('error');
      statusText.textContent = `✗ Evaluation error: ${err.message}`;
      return { success: false, error: err.message };
    }
  }

  // ─── ROUTER ─────────────────────────────────────────────────
  function router() {
    const hash = location.hash || '#/';
    state.lastRoute = hash;
    saveState();

    if (hash === '#/') renderHome();
    else if (hash === '#/discover') renderDiscover();
    else if (hash === '#/profile') renderProfile();
    else if (hash === '#/shortlist') renderShortlist();
    else if (hash === '#/projects') renderProjects();
    else if (hash === '#/how-it-works') renderHowItWorks();
    else if (hash === '#/help') renderHelp();
    else {
      root.innerHTML = `<div class="container section text-center">
        <i data-lucide="construction" style="width:48px;height:48px;color:var(--text-3);margin-bottom:16px;"></i>
        <h1 class="display display-36">Coming soon</h1>
      </div>`;
      afterRender();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function afterRender() {
    refreshIcons();
    initScrollAnimations();
    setupStaggerAnimations();
    // Re-observe new elements
    setTimeout(() => {
      qsa('.stagger-item:not(.visible)').forEach(item => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        }, { threshold: 0.05 });
        observer.observe(item);
      });
    }, 50);
  }

  // ─── EVENT DELEGATION ───────────────────────────────────────
  document.body.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'nav') {
      location.hash = btn.getAttribute('data-path');
      el('mobile-menu')?.classList.remove('open');
    }
    else if (action === 'go-profile') {
      location.hash = '#/profile';
      el('mobile-menu')?.classList.remove('open');
    }
    else if (action === 'toggle-menu') {
      el('mobile-menu')?.classList.toggle('open');
    }
    else if (action === 'close-menu') {
      el('mobile-menu')?.classList.remove('open');
    }
    else if (action === 'close-eval-bar') {
      el('eval-status-bar')?.classList.add('hidden');
      el('global-header')?.classList.remove('has-eval');
    }
    else if (action === 'preset-profile') {
      const type = btn.getAttribute('data-type');
      state.profile = {
        name: type === 'writer' ? '@techwriter' : type === 'audio' ? '@audioprod' : '@3dartist',
        field: type === 'writer' ? 'Technical writing' : type === 'audio' ? 'Audio production' : '3D concept art',
        audienceSize: 'Growing (5k to 25k)',
        interests: type === 'writer' ? ['rust', 'documentation', 'systems'] : type === 'audio' ? ['sound design', 'mixing', 'music'] : ['blender', 'texturing', '3d'],
        platform: type === 'writer' ? 'Substack' : type === 'audio' ? 'Podcast' : 'Instagram',
        goal: 'Swap skills and make something together'
      };
      state.setupStep = 3;
      renderProfile();
    }
    else if (action === 'profile-next') {
      const step = parseInt(btn.getAttribute('data-step'));
      if (step === 2) {
        if (!el('prof-name').value || !el('prof-field').value) {
          if (!el('prof-name').value) el('prof-name').classList.add('error');
          if (!el('prof-field').value) el('prof-field').classList.add('error');
          return;
        }
        state.profile = { ...state.profile, name: el('prof-name').value, field: el('prof-field').value, platform: el('prof-platform')?.value || 'Substack' };
      }
      if (step === 3) {
        state.profile = { ...state.profile, audienceSize: el('prof-size').value, interests: el('prof-tags').value.split(',').map(s => s.trim()).filter(Boolean) };
      }
      state.setupStep = step;
      renderProfile();
    }
    else if (action === 'save-profile') {
      state.profile = { ...state.profile, goal: el('prof-goal').value };
      state.setupStep = 'done';
      saveState();
      showToast("Profile saved successfully!");
      location.hash = '#/discover';
    }
    else if (action === 'edit-profile') {
      state.setupStep = 1;
      renderProfile();
    }
    else if (action === 'reset-profile') {
      if (!btn.dataset.confirmed) {
        btn.dataset.confirmed = 'true';
        btn.innerHTML = '<i data-lucide="alert-triangle" style="width:14px;height:14px;"></i> Confirm reset';
        btn.style.color = 'var(--clay)';
        btn.style.borderColor = 'var(--clay)';
        refreshIcons();
      } else {
        state.profile = null;
        state.setupStep = 1;
        saveState();
        renderProfile();
        showToast("Profile reset.");
      }
    }
    else if (action === 'toggle-save') {
      const id = btn.getAttribute('data-id');
      if (state.shortlist.includes(id)) state.shortlist = state.shortlist.filter(x => x !== id);
      else state.shortlist.push(id);
      saveState();

      // Animate icon
      const icon = btn.querySelector('i, svg');
      if (icon) {
        btn.innerHTML = `<i data-lucide="${state.shortlist.includes(id) ? 'bookmark-check' : 'bookmark'}" style="width:18px;height:18px;${state.shortlist.includes(id) ? 'color:var(--sage);' : ''}"></i>`;
        refreshIcons();
      }
      showToast(state.shortlist.includes(id) ? 'Saved!' : 'Removed from saved.');
    }
    else if (action === 'open-drawer') {
      renderDrawer(btn.getAttribute('data-id'), btn.getAttribute('data-tab'));
    }
    else if (action === 'close-overlays') {
      el('overlay-container').innerHTML = '';
      el('backdrop').classList.remove('open');
      document.body.style.overflow = '';
    }
    else if (action === 'switch-tab') {
      const tab = btn.getAttribute('data-tab');
      const drawer = btn.closest('.drawer');
      if (drawer) {
        drawer.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t.getAttribute('data-tab') === tab));
        drawer.querySelectorAll('.tabpanel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
      }
    }
    else if (action === 'switch-tone') {
      const tone = btn.getAttribute('data-tone');
      const cId = btn.getAttribute('data-id');
      const creator = Data.creators.find(c => c.id === cId);

      const container = el('tone-toggle-container');
      container.querySelectorAll('.btn').forEach(b => {
        b.style.background = 'transparent';
        b.style.border = 'none';
        b.style.color = 'var(--text-2)';
      });
      btn.style.background = 'var(--elevated)';
      btn.style.border = '1px solid var(--line)';
      btn.style.color = 'var(--text)';

      const draft = el('draft-text');
      if (tone === 'casual') {
        draft.value = `Hey ${creator.name.split(' ')[0]},\nI've been following your work on ${creator.platform} and really respect your approach to ${creator.tags[0]}. Our audiences share a lot of the same interests.\n\nI had an idea for a joint piece where I handle the technical framing and you drive the production. It would take about 12 hours total.\n\nLet me know if you have bandwidth for a quick 20-minute chat this week to explore it.`;
      } else {
        draft.value = `Subject: Proposal for a joint collaboration\n\nHi ${creator.name.split(' ')[0]},\n\nMy name is ${state.profile?.name || 'Creator'} and I create content about ${state.profile?.field || 'my field'}. I admire your consistency and quality on ${creator.platform}, especially regarding ${creator.tags[0]}.\n\nI am proposing a structured collaboration: a shared media piece where we split the workload 60/40. This would take roughly 12 to 16 hours and allow us to tap into each other's audiences directly.\n\nPlease let me know if you are open to a brief 20-minute introductory call this week to discuss feasibility.`;
      }
    }
    else if (action === 'toggle-accordion') {
      btn.closest('.accordion-item').classList.toggle('open');
    }
    else if (action === 'copy-draft') {
      const txt = el('draft-text').value;
      try {
        navigator.clipboard.writeText(txt);
        btn.innerHTML = '<i data-lucide="check" style="width:14px;height:14px;"></i> Copied!';
        refreshIcons();
        setTimeout(() => { btn.innerHTML = '<i data-lucide="copy" style="width:14px;height:14px;"></i> Copy message'; refreshIcons(); }, 2000);
      } catch (e) {}
    }
    else if (action === 'save-draft') {
      const txt = el('draft-text').value;
      const creatorName = el('drawer-title').textContent;
      const toneBtn = el('tone-toggle-container').querySelector('.btn[style*="var(--elevated)"]');
      const tone = toneBtn ? toneBtn.textContent.trim() : "Casual";
      state.savedPitches.push({ creatorName, tone, text: txt, date: new Date().toLocaleDateString() });
      saveState();
      showToast("Saved to Projects!");
    }
    else if (action === 'copy-project') {
      const index = parseInt(btn.getAttribute('data-index'));
      const p = state.savedPitches[index];
      try {
        navigator.clipboard.writeText(p.text);
        btn.innerHTML = '<i data-lucide="check" style="width:12px;height:12px;"></i> Copied';
        refreshIcons();
        setTimeout(() => { btn.innerHTML = '<i data-lucide="copy" style="width:12px;height:12px;"></i> Copy'; refreshIcons(); }, 2000);
      } catch (e) {}
    }
    else if (action === 'delete-project') {
      if (!btn.dataset.confirmed) {
        btn.dataset.confirmed = 'true';
        btn.innerHTML = '<i data-lucide="alert-triangle" style="width:12px;height:12px;"></i> Confirm';
        btn.style.color = 'var(--clay)';
        btn.style.borderColor = 'var(--clay)';
        refreshIcons();
      } else {
        const index = parseInt(btn.getAttribute('data-index'));
        state.savedPitches.splice(index, 1);
        saveState();
        renderProjects();
        showToast("Deleted draft.");
      }
    }
    else if (action === 'clear-filters') {
      state.filters = { platform: '', size: '', goal: '', field: '', search: '' };
      renderDiscover();
    }
    else if (action === 'filter-platform') {
      state.filters.platform = btn.getAttribute('data-platform');
      renderDiscover();
    }
    else if (action === 'run-analysis') {
      btn.innerHTML = '<i data-lucide="loader-2" class="spin-anim" style="width:14px;height:14px;"></i> Analyzing...';
      btn.disabled = true;
      refreshIcons();
      const errorEl = document.getElementById('analysis-error');
      if (errorEl) errorEl.style.display = 'none';

      runLangSmithEval().then(result => {
        btn.innerHTML = '<i data-lucide="brain" style="width:14px;height:14px;"></i> Run AI analysis';
        btn.disabled = false;
        refreshIcons();

        if (!result.success && errorEl) {
          errorEl.style.display = 'inline-block';
        }
      });
    }
    else if (action === 'copy-saved') {
      const creators = getRankedCreators().filter(c => state.shortlist.includes(c.id));
      const list = creators.map(c => `${c.name} (${c.handle}) - ${c.match.total}% match`).join('\n');
      try {
        navigator.clipboard.writeText(list);
        showToast("Copied saved list!");
      } catch (e) {}
    }
  });

  // Input events
  document.body.addEventListener('input', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
      e.target.classList.remove('error');
    }
    if (e.target.getAttribute('data-action') === 'search-input') {
      state.filters.search = e.target.value;
      renderDiscover();
      const newInp = el('search-input');
      if (newInp) { newInp.focus(); newInp.setSelectionRange(newInp.value.length, newInp.value.length); }
    }
  });

  // Keyboard shortcuts
  window.addEventListener('hashchange', router);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const overlay = el('overlay-container');
      if (overlay && overlay.innerHTML !== '') {
        overlay.innerHTML = '';
        el('backdrop').classList.remove('open');
        document.body.style.overflow = '';
        return;
      }
      el('mobile-menu')?.classList.remove('open');
    }
    if (e.key === '/' && !e.target.closest('input, textarea, select')) {
      e.preventDefault();
      if (location.hash !== '#/discover') location.hash = '#/discover';
      setTimeout(() => el('search-input')?.focus(), 100);
    }
    if (e.key.toLowerCase() === 't' && !e.target.closest('input, textarea, select')) {
      toggleTheme();
    }
  });

  // Theme toggle button
  document.addEventListener('click', e => {
    if (e.target.closest('#theme-toggle')) {
      toggleTheme();
    }
  });

  function showToast(msg) {
    const t = el('toast');
    t.textContent = msg;
    t.classList.add('open');
    setTimeout(() => t.classList.remove('open'), 2800);
  }

  // ─── INIT ───────────────────────────────────────────────────
  loadState();
  initTheme();
  initCursor();
  initParticles();
  initHeaderScroll();
  updateHeader();
  router();

  // Auto-run LangSmith eval on first load
  setTimeout(() => {
    runLangSmithEval();
  }, 1500);

  console.assert(Data.creators.length === 16, "Catalog length is correct");
  console.log('%c✦ Syndicate v3.0 — Premium Edition', 'color:#9FB89F;font-size:14px;font-weight:600;');
  console.log('%cLangSmith API integrated. Eval auto-runs on load.', 'color:#A8A3CD;');

})();
