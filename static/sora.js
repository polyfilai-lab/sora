/* ──────────────────────────────────────────────────────────────
   Sora — frontend logic
   ────────────────────────────────────────────────────────────── */
(function () {
  const Sora = {};

  // ── api ──────────────────────────────────────────────────
  async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    if (!res.ok) {
      let msg = 'Request failed';
      try { msg = (await res.json()).error || msg; } catch (_) {}
      throw new Error(msg);
    }
    return res.json();
  }

  // ── helpers ──────────────────────────────────────────────
  function openModal(id) { document.getElementById(id)?.classList.add('is-open'); }
  function closeModal(id) { document.getElementById(id)?.classList.remove('is-open'); }
  Sora.closeModal = closeModal;

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── time-of-day greeting ─────────────────────────────────
  function setGreeting() {
    const el = document.getElementById('greeting-line');
    if (!el) return;
    const hr = new Date().getHours();
    const word = hr < 5  ? 'Late night'
              : hr < 12 ? 'Good morning'
              : hr < 17 ? 'Good afternoon'
              : hr < 21 ? 'Good evening'
              : 'Good evening';
    el.textContent = word + ', Jordan.';
  }

  // ── quick idea ───────────────────────────────────────────
  Sora.quickIdea = async function () {
    const input = document.getElementById('quick-idea');
    if (!input) return;
    const text = (input.value || '').trim();
    if (!text) { input.focus(); return; }
    try { await api('POST', '/api/ideas', { text }); input.value = ''; location.reload(); }
    catch (e) { alert(e.message); }
  };

  // ── new project ──────────────────────────────────────────
  Sora.openNewProject = function (companyId) {
    if (companyId && document.getElementById('np-company')) {
      document.getElementById('np-company').value = companyId;
    }
    openModal('modal-project');
    setTimeout(() => document.getElementById('np-name')?.focus(), 60);
  };
  Sora.saveNewProject = async function () {
    const body = {
      name:       document.getElementById('np-name').value.trim(),
      tagline:    document.getElementById('np-tagline').value.trim(),
      company_id: document.getElementById('np-company').value || null,
      status:     document.getElementById('np-status').value,
      url:        document.getElementById('np-url').value.trim(),
      notes:      document.getElementById('np-notes').value.trim(),
    };
    if (!body.name) { alert('Name is required'); return; }
    try { await api('POST', '/api/projects', body); location.reload(); }
    catch (e) { alert(e.message); }
  };

  // ── new company ──────────────────────────────────────────
  Sora.openNewCompany = function () {
    openModal('modal-company');
    setTimeout(() => document.getElementById('nc-name')?.focus(), 60);
  };
  Sora.saveNewCompany = async function () {
    const body = {
      name:    document.getElementById('nc-name').value.trim(),
      tagline: document.getElementById('nc-tagline').value.trim(),
      color:   document.getElementById('nc-color').value || '#0284c7',
      notes:   document.getElementById('nc-notes').value.trim(),
    };
    if (!body.name) { alert('Name is required'); return; }
    try { await api('POST', '/api/companies', body); location.reload(); }
    catch (e) { alert(e.message); }
  };
  Sora.editCompany = function (id) {
    const newName = prompt('Rename company:');
    if (!newName) return;
    api('PUT', '/api/companies/' + id, { name: newName }).then(() => location.reload());
  };

  // Quick-set the live URL for a project (used by "+ URL" buttons)
  Sora.promptSetUrl = async function (projectId) {
    const url = prompt('Live URL for this project (https://…):');
    if (!url || !url.trim()) return;
    let clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) clean = 'https://' + clean;
    try {
      await api('PUT', '/api/projects/' + projectId, { url: clean });
      location.reload();
    } catch (e) { alert(e.message); }
  };

  // ── ideas list ───────────────────────────────────────────
  Sora.promoteIdea = async function (id) {
    try { await api('POST', '/api/ideas/' + id + '/promote', {}); location.reload(); }
    catch (e) { alert(e.message); }
  };
  Sora.deleteIdea = async function (id) {
    if (!confirm('Dismiss this idea?')) return;
    try { await api('DELETE', '/api/ideas/' + id); location.reload(); }
    catch (e) { alert(e.message); }
  };

  // ── project detail page ──────────────────────────────────
  Sora.editProject = function () { openModal('modal-edit'); };
  Sora.saveEditProject = async function (id) {
    const body = {
      name:       document.getElementById('ep-name').value.trim(),
      tagline:    document.getElementById('ep-tagline').value.trim(),
      company_id: document.getElementById('ep-company').value || null,
      status:     document.getElementById('ep-status').value,
      url:        document.getElementById('ep-url').value.trim(),
    };
    try { await api('PUT', '/api/projects/' + id, body); location.reload(); }
    catch (e) { alert(e.message); }
  };
  Sora.deleteProject = async function () {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await api('DELETE', '/api/projects/' + window.SORA_PROJECT_ID);
      location.href = '/';
    } catch (e) { alert(e.message); }
  };
  Sora.saveNotes = async function () {
    const notes = document.getElementById('proj-notes').value;
    try {
      await api('PUT', '/api/projects/' + window.SORA_PROJECT_ID, { notes });
      flash('Notes saved');
    } catch (e) { alert(e.message); }
  };
  Sora.addChangelog = async function () {
    const el = document.getElementById('cl-text');
    const text = el.value.trim();
    if (!text) return;
    try {
      await api('POST', '/api/projects/' + window.SORA_PROJECT_ID + '/changelog', { text });
      location.reload();
    } catch (e) { alert(e.message); }
  };
  Sora.addProjectIdea = async function () {
    const el = document.getElementById('pi-text');
    const text = el.value.trim();
    if (!text) return;
    try {
      await api('POST', '/api/projects/' + window.SORA_PROJECT_ID + '/ideas', { text });
      location.reload();
    } catch (e) { alert(e.message); }
  };
  Sora.addTokens = async function () {
    const el = document.getElementById('tokens-delta');
    const delta = parseInt(el.value || '0', 10);
    if (!delta) return;
    try {
      const p = await api('POST', '/api/projects/' + window.SORA_PROJECT_ID + '/tokens', { delta });
      document.getElementById('tokens-val').textContent = (p.tokens_used || 0).toLocaleString();
      el.value = '';
      flash('+' + delta.toLocaleString() + ' tokens');
    } catch (e) { alert(e.message); }
  };

  // ── company expand/collapse ──────────────────────────────
  Sora.toggleCompany = function (cid, btn) {
    const card = btn.closest('.company');
    if (!card) return;
    const extras = card.querySelectorAll('.project-row.is-extra');
    const expanded = !extras[0]?.classList.contains('is-hidden');
    extras.forEach(el => el.classList.toggle('is-hidden', expanded));
    btn.textContent = expanded
      ? `Show all ${extras.length + 3} →`
      : 'Show fewer ↑';
  };

  // ── toast ────────────────────────────────────────────────
  function flash(text) {
    let t = document.getElementById('sora-toast');
    if (!t) { t = document.createElement('div'); t.id = 'sora-toast'; document.body.appendChild(t); }
    t.textContent = text;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 1800);
  }

  // ── URL health pings (used on Frame page) ────────────────
  async function pingAll() {
    const dots = document.querySelectorAll('[data-ping]');
    for (const d of dots) {
      const url = d.getAttribute('data-ping');
      if (!url) continue;
      try {
        const r = await fetch('/api/ping?url=' + encodeURIComponent(url));
        const j = await r.json();
        d.classList.add(j.ok ? 'up' : 'down');
      } catch (_) { d.classList.add('down'); }
    }
  }

  // ── Railway sync ─────────────────────────────────────────
  Sora.syncRailway = async function () {
    const panel = document.getElementById('sync-panel');
    if (panel) {
      panel.style.display = 'block';
      panel.innerHTML = '<div style="font-size: 13px; color: var(--ink-3);">Syncing from Railway…</div>';
    }
    try {
      const r = await fetch('/api/sync-railway', { method: 'POST' });
      const j = await r.json();
      if (!j.ok) {
        if (panel) panel.innerHTML = renderSyncError(j.error || 'Unknown error');
        return;
      }
      if (panel) panel.innerHTML = renderSyncResult(j);
      setTimeout(() => location.reload(), 2200);
    } catch (e) {
      if (panel) panel.innerHTML = renderSyncError(e.message);
    }
  };
  function renderSyncResult(j) {
    const u = j.updated || [], a = j.added || [];
    let html = '<div style="font-weight: 600; color: var(--ink); font-size: 13px; margin-bottom: 8px;">Sync complete · ' + u.length + ' updated · ' + a.length + ' added</div>';
    u.forEach(x => { html += '<div style="font-size: 12.5px; color: var(--ink-3);">↻ ' + escapeHtml(x.name) + ' → ' + escapeHtml(x.new_url) + '</div>'; });
    a.forEach(x => { html += '<div style="font-size: 12.5px; color: var(--ink-3);">＋ ' + escapeHtml(x.name) + ' → ' + escapeHtml(x.url) + '</div>'; });
    return html;
  }
  function renderSyncError(msg) {
    return '<div style="font-weight: 600; color: #b91c1c; font-size: 13px; margin-bottom: 6px;">Sync failed</div>' +
           '<div style="font-size: 12.5px; color: var(--ink-3);">' + escapeHtml(msg) + '</div>' +
           '<div style="font-size: 11.5px; color: var(--ink-4); margin-top: 6px;">Make sure RAILWAY_API_TOKEN is set in Sora&rsquo;s Variables.</div>';
  }

  // ── Modal backdrop / Esc handling ────────────────────────
  document.addEventListener('click', (e) => {
    if (e.target.classList?.contains('sora-modal-bg')) {
      e.target.classList.remove('is-open');
    }
    if (e.target.id === 'palette' || e.target.classList?.contains('palette-bg')) {
      closePalette();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.sora-modal-bg.is-open').forEach(m => m.classList.remove('is-open'));
      closePalette();
    }
    // ⌘K / Ctrl+K opens the palette
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      Sora.openPalette();
    }
  });

  /* ──────────────────────────────────────────────────────────
     COMMAND PALETTE — search projects, companies, tools
     ────────────────────────────────────────────────────────── */
  let paletteIndex = null;
  let paletteActive = 0;
  let paletteItems = [];

  function loadIndex() {
    if (paletteIndex) return paletteIndex;
    const el = document.getElementById('search-index');
    if (!el) return null;
    try { paletteIndex = JSON.parse(el.textContent); } catch (_) { return null; }
    return paletteIndex;
  }

  Sora.openPalette = function () {
    const idx = loadIndex();
    if (!idx) return;
    const bg = document.getElementById('palette');
    if (!bg) return;
    bg.classList.add('is-open');
    const input = document.getElementById('palette-input');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 30);
    }
    renderPalette('');
  };

  function closePalette() {
    document.getElementById('palette')?.classList.remove('is-open');
  }

  function fuzzyMatch(query, target) {
    if (!query) return true;
    return target.toLowerCase().includes(query.toLowerCase());
  }

  function renderPalette(query) {
    const idx = loadIndex();
    if (!idx) return;
    const out = document.getElementById('palette-results');
    if (!out) return;
    const q = query.trim();

    const projects = (idx.projects || []).filter(p =>
      fuzzyMatch(q, p.name) || fuzzyMatch(q, p.tagline) || fuzzyMatch(q, p.company));
    const companies = (idx.companies || []).filter(c =>
      fuzzyMatch(q, c.name) || fuzzyMatch(q, c.tagline));

    paletteItems = [];
    let html = '';
    if (projects.length) {
      html += '<div class="palette-group-label">Projects</div>';
      projects.forEach((p, i) => {
        paletteItems.push(p.href);
        html += `<a class="palette-item" data-i="${paletteItems.length - 1}" href="${escapeHtml(p.href)}">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--s-${p.status})"></span>
          <span>
            <span class="name">${escapeHtml(p.name)}</span>
            <span class="sub">${escapeHtml(p.company || p.tagline || '')}</span>
          </span>
          <span class="meta">${p.status}</span>
        </a>`;
      });
    }
    if (companies.length) {
      html += '<div class="palette-group-label">Companies</div>';
      companies.forEach(c => {
        paletteItems.push(c.url);
        html += `<a class="palette-item" data-i="${paletteItems.length - 1}" href="${escapeHtml(c.url)}">
          <span style="width:8px;height:8px;border-radius:50%;background:#94a3b8"></span>
          <span>
            <span class="name">${escapeHtml(c.name)}</span>
            <span class="sub">${escapeHtml(c.tagline || '')}</span>
          </span>
          <span class="meta">channel</span>
        </a>`;
      });
    }
    if (!projects.length && !companies.length) {
      html = '<div class="palette-empty">No matches. Try a different word.</div>';
    }
    out.innerHTML = html;
    paletteActive = 0;
    refreshPaletteActive();
  }

  function refreshPaletteActive() {
    const items = document.querySelectorAll('.palette-item');
    items.forEach((el, i) => el.classList.toggle('is-active', i === paletteActive));
    const active = items[paletteActive];
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  // Palette keyboard handling
  document.addEventListener('input', (e) => {
    if (e.target.id === 'palette-input') renderPalette(e.target.value);
  });
  document.addEventListener('keydown', (e) => {
    const pal = document.getElementById('palette');
    if (!pal || !pal.classList.contains('is-open')) return;
    const items = document.querySelectorAll('.palette-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      paletteActive = Math.min(items.length - 1, paletteActive + 1);
      refreshPaletteActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      paletteActive = Math.max(0, paletteActive - 1);
      refreshPaletteActive();
    } else if (e.key === 'Enter') {
      const href = paletteItems[paletteActive];
      if (href) { e.preventDefault(); location.href = href; }
    }
  });

  /* ──────────────────────────────────────────────────────────
     Company logos — original SVG marks, one per company.
     All use currentColor so they pick up each chip's accent color.
     ────────────────────────────────────────────────────────── */
  const COMPANY_LOGOS = {
    // Fairfield Processing — soft pillow with two tufting points
    fairfield: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="9" width="24" height="14" rx="6"
            fill="currentColor" fill-opacity="0.16"
            stroke="currentColor" stroke-width="1.8"/>
      <circle cx="11" cy="16" r="0.9" fill="currentColor"/>
      <circle cx="21" cy="16" r="0.9" fill="currentColor"/>
    </svg>`,

    // Hillbrook Labs — three-node agent network (triangle of connected dots)
    hillbrook: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="9"  y1="22" x2="16" y2="9"/>
        <line x1="16" y1="9"  x2="23" y2="22"/>
        <line x1="9"  y1="22" x2="23" y2="22"/>
      </g>
      <circle cx="16" cy="9"  r="3.2" fill="currentColor"/>
      <circle cx="9"  cy="22" r="3.2" fill="currentColor"/>
      <circle cx="23" cy="22" r="3.2" fill="currentColor"/>
      <circle cx="15.4" cy="8.3"  r="0.9" fill="white" opacity="0.55"/>
      <circle cx="8.4"  cy="21.3" r="0.9" fill="white" opacity="0.55"/>
      <circle cx="22.4" cy="21.3" r="0.9" fill="white" opacity="0.55"/>
    </svg>`,

    // Verify — stylized tooth with a checkmark inside
    verify: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 5 C9 5 8 7 8 10 L8 19 C8 24 10 27 12 27 C13 27 14 25 14 22 C14 20 14 19 16 19 C18 19 18 20 18 22 C18 25 19 27 20 27 C22 27 24 24 24 19 L24 10 C24 7 23 5 21 5 C19 5 18 6 16 6 C14 6 13 5 11 5 Z"
            fill="currentColor" fill-opacity="0.18"
            stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M11 15 L14 18 L20 12"
            stroke="currentColor" stroke-width="2.2"
            stroke-linecap="round" stroke-linejoin="round"
            fill="none"/>
    </svg>`,

    // CurbAppeal — house with sparkles (post-wash sheen)
    curbappeal: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 26 L4 17 L15 8 L26 17 L26 26 Z"
            fill="currentColor" fill-opacity="0.15"
            stroke="currentColor" stroke-width="1.7"
            stroke-linejoin="round"/>
      <rect x="12" y="19" width="6" height="7" rx="1" fill="currentColor" opacity="0.45"/>
      <rect x="6"  y="19" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.32"/>
      <g stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="23" y1="5"  x2="23" y2="9"/>
        <line x1="21" y1="7"  x2="25" y2="7"/>
      </g>
      <g stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.7">
        <line x1="28" y1="11" x2="28" y2="14"/>
        <line x1="26.5" y1="12.5" x2="29.5" y2="12.5"/>
      </g>
    </svg>`,

    // Good Kid Tech — tablet with a heart on screen
    goodkidtech: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="20" height="24" rx="3"
            stroke="currentColor" stroke-width="1.8"
            fill="currentColor" fill-opacity="0.1"/>
      <line x1="13" y1="7" x2="19" y2="7"
            stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <circle cx="16" cy="25" r="0.9" stroke="currentColor" stroke-width="1" fill="none"/>
      <path d="M16 21 C12 17.5 11 14.5 13 12.5 C14.2 11.3 15.5 11.8 16 13.2 C16.5 11.8 17.8 11.3 19 12.5 C21 14.5 20 17.5 16 21 Z"
            fill="currentColor"/>
    </svg>`,

    // PolyPets — friendly bear face (plush)
    polypets: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9"  cy="11" r="3.5"
              fill="currentColor" fill-opacity="0.2"
              stroke="currentColor" stroke-width="1.5"/>
      <circle cx="23" cy="11" r="3.5"
              fill="currentColor" fill-opacity="0.2"
              stroke="currentColor" stroke-width="1.5"/>
      <circle cx="9"  cy="11" r="1.4" fill="currentColor" opacity="0.45"/>
      <circle cx="23" cy="11" r="1.4" fill="currentColor" opacity="0.45"/>
      <circle cx="16" cy="18" r="9"
              fill="currentColor" fill-opacity="0.16"
              stroke="currentColor" stroke-width="1.8"/>
      <circle cx="13" cy="16.5" r="1.2" fill="currentColor"/>
      <circle cx="19" cy="16.5" r="1.2" fill="currentColor"/>
      <ellipse cx="16" cy="20" rx="3" ry="2.2" fill="currentColor" opacity="0.42"/>
      <ellipse cx="16" cy="18.8" rx="1" ry="0.7" fill="currentColor"/>
      <path d="M14.5 21 Q16 22 17.5 21"
            stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    </svg>`,
  };

  function logoFor(name) {
    const k = String(name || '').toLowerCase().replace(/[^a-z]/g, '');
    if (k.includes('fairfield'))                       return COMPANY_LOGOS.fairfield;
    if (k.includes('hillbrook'))                       return COMPANY_LOGOS.hillbrook;
    if (k.includes('verify'))                          return COMPANY_LOGOS.verify;
    if (k.includes('curb') || k.includes('appeal'))    return COMPANY_LOGOS.curbappeal;
    if (k.includes('goodkid') || k.includes('kidtech'))return COMPANY_LOGOS.goodkidtech;
    if (k.includes('poly') || k.includes('pets'))      return COMPANY_LOGOS.polypets;
    return null;
  }

  /* ──────────────────────────────────────────────────────────
     BRAIN HUB — generates neural mesh, places chips, wires hover
     ────────────────────────────────────────────────────────── */
  const BRAIN_CX = 500, BRAIN_CY = 390;
  const BRAIN_R = 72;
  const ORBIT_R = 290;
  let hubData = null;
  let revealTimer = null;
  let activeChipId = null;

  function loadHubData() {
    const el = document.getElementById('hub-data');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (_) { return null; }
  }

  // Seeded RNG so neural mesh is stable per page
  function rng(seed) {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= (h >>> 16)) >>> 0) / 4294967295;
    };
  }

  // 3D Libra constellation — the actual balance/scales shape, rotating in
  // 3-space with perspective projection. Each star carries (x, y, z) coords
  // relative to the brain center, plus its base brightness.
  //
  //   ▲     β            <- top of crossbar
  //   │   ╱   ╲
  //   │  α─────γ          <- crossbar (α – β – γ)
  //   │  │     │
  //   │  L     R          <- chains hanging from the bar ends
  //   │ ╱╲   ╱╲
  //   │(  σ)(  τ)         <- balance pans
  //   ▼
  let constellation = null;          // { stars: [...], lines: [...] }
  let constellationRotY = 0;
  const CONSTELLATION_TILT = 0.18;
  const CONSTELLATION_FOCAL = 260;

  function setupConstellation3D() {
    const g = document.getElementById('neural-mesh');
    if (!g) return;

    // ── stars (x, y, z) — y is *down* in SVG, so negative y is up ───
    const S = [
      // ── crossbar (the rod of the scale) ──────────────────
      { id: 'alpha',   x: -56, y: -42, z:  18, r: 2.6, bright: true,  b: 2 }, // α Librae
      { id: 'beta',    x:   0, y: -56, z:  24, r: 3.0, bright: true,  b: 1 }, // β Librae (brightest)
      { id: 'gamma',   x:  56, y: -42, z:  18, r: 2.2, bright: true,  b: 3 }, // γ Librae
      { id: 'pivot',   x:   0, y: -28, z:  12, r: 1.8, bright: true,  b: 4 }, // center pivot

      // ── chains hanging off each end ─────────────────────
      { id: 'L_top',   x: -50, y: -14, z:  10, r: 1.2 },
      { id: 'L_mid',   x: -48, y:   6, z:   6, r: 1.1 },
      { id: 'R_top',   x:  50, y: -14, z:  10, r: 1.2 },
      { id: 'R_mid',   x:  48, y:   6, z:   6, r: 1.1 },

      // ── left balance pan (curve open upward, ⌣) ─────────
      { id: 'LP_nw',   x: -72, y:  16, z:  -4, r: 1.6 },
      { id: 'LP_w',    x: -78, y:  30, z:  -8, r: 1.5 },
      { id: 'LP_sw',   x: -74, y:  46, z:  -8, r: 1.4 },
      { id: 'sigma',   x: -54, y:  54, z:  -4, r: 2.2, bright: true,  b: 5 }, // σ Librae
      { id: 'LP_se',   x: -34, y:  46, z:   0, r: 1.4 },
      { id: 'LP_e',    x: -28, y:  30, z:   2, r: 1.4 },
      { id: 'LP_ne',   x: -32, y:  16, z:   2, r: 1.3 },

      // ── right balance pan (mirror) ──────────────────────
      { id: 'RP_ne',   x:  72, y:  16, z:  -4, r: 1.6 },
      { id: 'RP_e',    x:  78, y:  30, z:  -8, r: 1.5 },
      { id: 'RP_se',   x:  74, y:  46, z:  -8, r: 1.4 },
      { id: 'tau',     x:  54, y:  54, z:  -4, r: 2.0, bright: true,  b: 6 }, // τ Librae
      { id: 'RP_sw',   x:  34, y:  46, z:   0, r: 1.4 },
      { id: 'RP_w',    x:  28, y:  30, z:   2, r: 1.4 },
      { id: 'RP_nw',   x:  32, y:  16, z:   2, r: 1.3 },
    ];

    // ── lines (id pairs) ──────────────────────────────────
    const L = [
      // crossbar
      ['alpha', 'beta', true],   // pulse
      ['beta',  'gamma', true],  // pulse
      // pivot
      ['beta',  'pivot'],
      // chains
      ['alpha', 'L_top'],
      ['L_top', 'L_mid'],
      ['L_mid', 'LP_ne'],
      ['gamma', 'R_top'],
      ['R_top', 'R_mid'],
      ['R_mid', 'RP_nw'],
      // left pan (closed loop)
      ['LP_nw', 'LP_w'],
      ['LP_w',  'LP_sw'],
      ['LP_sw', 'sigma'],
      ['sigma', 'LP_se'],
      ['LP_se', 'LP_e'],
      ['LP_e',  'LP_ne'],
      ['LP_ne', 'LP_nw'],
      // right pan (closed loop)
      ['RP_ne', 'RP_e'],
      ['RP_e',  'RP_se'],
      ['RP_se', 'tau'],
      ['tau',   'RP_sw'],
      ['RP_sw', 'RP_w'],
      ['RP_w',  'RP_nw'],
      ['RP_nw', 'RP_ne'],
    ];

    // ── ambient dim background stars (a static field behind Libra) ──
    const ambient = [];
    const rand = rng('libra-ambient-v3');
    for (let i = 0; i < 24; i++) {
      // Random 3D point inside the brain core sphere
      let x, y, z;
      while (true) {
        x = (rand() - 0.5) * 150;
        y = (rand() - 0.5) * 150;
        z = (rand() - 0.5) * 60;
        if (Math.sqrt(x*x + y*y) < 75) break;
      }
      ambient.push({ x, y, z, r: 0.4 + rand() * 0.6 });
    }

    // ── render initial SVG ──────────────────────────────────
    const starById = {};
    S.forEach(s => starById[s.id] = s);

    let html = '';
    // Ambient first (dim background)
    ambient.forEach((a, i) => {
      html += `<circle class="libra-ambient" data-amb="${i}" cx="0" cy="0" r="${a.r.toFixed(1)}"/>`;
    });
    // Lines
    L.forEach((ln, i) => {
      const cls = 'libra-line' + (ln[2] ? ' pulse' + (i === 0 ? '' : ' p2') : '');
      html += `<line class="${cls}" data-line="${i}" x1="0" y1="0" x2="0" y2="0"/>`;
    });
    // Stars on top
    S.forEach((s, i) => {
      const cls = 'libra-star' + (s.bright ? ' bright b' + s.b : '');
      html += `<circle class="${cls}" data-star="${i}" cx="0" cy="0" r="${s.r}"/>`;
    });
    g.innerHTML = html;

    // Cache element refs + line endpoints by id
    S.forEach((s, i) => {
      s.el = g.querySelector('[data-star="' + i + '"]');
    });
    ambient.forEach((a, i) => {
      a.el = g.querySelector('[data-amb="' + i + '"]');
    });
    const lines = L.map((ln, i) => ({
      s1: starById[ln[0]],
      s2: starById[ln[1]],
      el: g.querySelector('[data-line="' + i + '"]'),
    }));

    constellation = { stars: S, ambient, lines };
  }

  function projectPoint(p, rotY, tiltX) {
    // Rotate around Y (vertical) → swings constellation side-to-side
    const cY = Math.cos(rotY), sY = Math.sin(rotY);
    const x1 = p.x * cY + p.z * sY;
    const z1 = -p.x * sY + p.z * cY;
    const y1 = p.y;
    // Tilt around X (slight pitch, see from a bit above)
    const cX = Math.cos(tiltX), sX = Math.sin(tiltX);
    const y2 = y1 * cX - z1 * sX;
    const z2 = y1 * sX + z1 * cX;
    // Perspective project
    const scale = CONSTELLATION_FOCAL / (CONSTELLATION_FOCAL - z2);
    return {
      x: BRAIN_CX + x1 * scale,
      y: BRAIN_CY + y2 * scale,
      scale,
      z: z2,
    };
  }

  function animateConstellation() {
    if (!constellation) return;
    constellationRotY += 0.0042;            // ~ one full turn / 25s
    const tilt = CONSTELLATION_TILT
               + Math.sin(Date.now() / 4200) * 0.07;  // slight gentle wobble

    constellation.stars.forEach(s => {
      const p = projectPoint(s, constellationRotY, tilt);
      if (!s.el) return;
      s.el.setAttribute('cx', p.x.toFixed(1));
      s.el.setAttribute('cy', p.y.toFixed(1));
      const sizeMul = Math.max(0.55, Math.min(1.35, p.scale));
      s.el.setAttribute('r', (s.r * sizeMul).toFixed(2));
      // Closer (z > 0) is brighter; farther is dimmer
      const op = Math.max(0.25, Math.min(1, 0.55 + p.z * 0.012));
      s.el.style.opacity = op.toFixed(2);
    });

    constellation.ambient.forEach(a => {
      const p = projectPoint(a, constellationRotY, tilt);
      if (!a.el) return;
      a.el.setAttribute('cx', p.x.toFixed(1));
      a.el.setAttribute('cy', p.y.toFixed(1));
      const op = Math.max(0.18, Math.min(0.6, 0.32 + p.z * 0.008));
      a.el.style.opacity = op.toFixed(2);
    });

    constellation.lines.forEach(ln => {
      if (!ln.s1 || !ln.s2 || !ln.el) return;
      const p1 = projectPoint(ln.s1, constellationRotY, tilt);
      const p2 = projectPoint(ln.s2, constellationRotY, tilt);
      ln.el.setAttribute('x1', p1.x.toFixed(1));
      ln.el.setAttribute('y1', p1.y.toFixed(1));
      ln.el.setAttribute('x2', p2.x.toFixed(1));
      ln.el.setAttribute('y2', p2.y.toFixed(1));
      const avgZ = (p1.z + p2.z) / 2;
      const op = Math.max(0.15, Math.min(0.7, 0.4 + avgZ * 0.006));
      ln.el.style.opacity = op.toFixed(2);
    });

    requestAnimationFrame(animateConstellation);
  }

  // ── Shooting stars — confined to the blue brain core ──────
  let shootingStarsTimer = null;
  function spawnShootingStar() {
    const c = document.getElementById('shooting-stars');
    if (!c) return;
    const star = document.createElement('div');
    star.className = 'shooting-star';

    // Random start anywhere in the container (it's already clipped to a circle)
    const startX = Math.random() * 95;
    const startY = Math.random() * 95;
    // Random direction — full 360°
    const angle = Math.random() * 360;
    const dist  = 90 + Math.random() * 80;  // 90–170 px (container ~220px)
    const rad = angle * Math.PI / 180;
    const dx = Math.cos(rad) * dist;
    const dy = Math.sin(rad) * dist;

    star.style.left = startX + '%';
    star.style.top  = startY + '%';
    star.style.setProperty('--rot', angle + 'deg');
    star.style.setProperty('--dx', dx.toFixed(0) + 'px');
    star.style.setProperty('--dy', dy.toFixed(0) + 'px');
    star.style.animationDuration = (0.7 + Math.random() * 0.45).toFixed(2) + 's';
    star.style.width = (40 + Math.random() * 35).toFixed(0) + 'px';

    c.appendChild(star);
    setTimeout(() => star.remove(), 1400);
  }

  function startShootingStars() {
    function loop() {
      spawnShootingStar();
      // Roughly half the time, spawn a second one shortly after
      if (Math.random() < 0.45) setTimeout(spawnShootingStar, 120 + Math.random() * 180);
      shootingStarsTimer = setTimeout(loop, 500 + Math.random() * 700);
    }
    loop();
  }

  function placeChipsAndConnectors() {
    hubData = loadHubData();
    if (!hubData) return;
    const companies = hubData.companies || [];
    if (!companies.length) return;

    const N = companies.length;
    const chipLayer = document.getElementById('chip-layer');
    const connectors = document.getElementById('brain-connectors');
    if (!chipLayer || !connectors) return;

    let chipHtml = '';
    let connHtml = '';

    companies.forEach((c, i) => {
      // Distribute around the brain. Start at top, go clockwise.
      const angle = -Math.PI / 2 + (i / N) * Math.PI * 2;
      const ax = BRAIN_CX + Math.cos(angle) * (BRAIN_R + 12);
      const ay = BRAIN_CY + Math.sin(angle) * (BRAIN_R + 12);
      const tx = BRAIN_CX + Math.cos(angle) * ORBIT_R;
      const ty = BRAIN_CY + Math.sin(angle) * ORBIT_R;

      const pctX = (tx / 1000) * 100;
      const pctY = (ty / 780) * 100;

      // Capsule side: chip on right half of brain → capsule grows right; left → left
      const side = pctX >= 50 ? 'on-right' : 'on-left';

      const projCount = (c.projects || []).length;
      const liveCount = (c.projects || []).filter(p => p.status === 'live').length;

      // Build the capsule project list HTML.
      // Primary click on the row = open the LIVE URL in a new tab when one exists.
      // Trailing icons: ⊕ Frame (in-app embed), ⓘ Notes/settings.
      // No URL yet? Replace ⊕ with a "+ URL" prompt to add one in one click.
      const projectsHtml = (c.projects || []).length
        ? (c.projects || []).map(p => {
            const hasUrl = !!p.url;
            const rowTag = hasUrl ? 'a' : 'div';
            const rowAttrs = hasUrl
              ? `href="${escapeHtml(p.url)}" target="_blank" rel="noopener" title="Open ${escapeHtml(p.url)}"`
              : `title="No live URL yet — click + URL to set one"`;
            const liveBtn = hasUrl
              ? `<a class="info ext" href="/frame?p=${p.id}" onclick="event.stopPropagation()" title="Open in Frame view">⊕</a>`
              : `<button class="info add-url" onclick="event.preventDefault();event.stopPropagation();Sora.promptSetUrl('${p.id}')" title="Set the live URL for this project">+ URL</button>`;
            return `
              <${rowTag} class="chip-capsule-item ${hasUrl ? 'is-live' : 'is-pending'}" ${rowAttrs}>
                <span class="dot s-${p.status}"></span>
                <span class="name">${escapeHtml(p.name)}</span>
                ${liveBtn}
                <a class="info" href="/project/${p.id}" onclick="event.stopPropagation()" title="Notes &amp; settings">ⓘ</a>
              </${rowTag}>`;
          }).join('')
        : '<div class="chip-capsule-empty">No projects under this company yet.</div>';

      const logo = logoFor(c.name);
      const chipMark   = logo
        ? `<div class="company-chip-logo">${logo}</div>`
        : `<div class="company-chip-dot"></div>`;
      const capsuleMark = logo
        ? `<div class="chip-capsule-logo">${logo}</div>`
        : `<div class="chip-capsule-band"></div>`;

      chipHtml += `
        <div class="company-chip" data-cid="${c.id}"
             style="left: ${pctX}%; top: ${pctY}%; --c: ${c.color};">
          ${chipMark}
          <div class="company-chip-text">
            <div class="company-chip-name">${escapeHtml(c.name)}</div>
            <div class="company-chip-count">${projCount} project${projCount === 1 ? '' : 's'}</div>
          </div>
        </div>
        <div class="chip-capsule ${side}" data-cid="${c.id}"
             style="left: ${pctX}%; top: ${pctY}%; --c: ${c.color};">
          <div class="chip-capsule-head">
            ${capsuleMark}
            <div class="chip-capsule-titles">
              <div class="chip-capsule-name">${escapeHtml(c.name)}</div>
              ${c.tagline ? `<div class="chip-capsule-tag">${escapeHtml(c.tagline)}</div>` : ''}
            </div>
            <div class="chip-capsule-count">${projCount}${liveCount ? ` · ${liveCount} live` : ''}</div>
          </div>
          <div class="chip-capsule-list">
            ${projectsHtml}
          </div>
        </div>`;

      // Bezier connector from brain edge to just inside the chip
      const cmx = (ax + tx) / 2, cmy = (ay + ty) / 2;
      const perpX = -Math.sin(angle) * 30, perpY = Math.cos(angle) * 30;
      const ctrlX = cmx + perpX, ctrlY = cmy + perpY;
      const px = BRAIN_CX + Math.cos(angle) * (ORBIT_R - 38);
      const py = BRAIN_CY + Math.sin(angle) * (ORBIT_R - 38);
      connHtml += `<path class="brain-connector" data-cid="${c.id}"
                   d="M${ax.toFixed(1)},${ay.toFixed(1)} Q${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}"/>`;
    });

    chipLayer.innerHTML = chipHtml;
    connectors.innerHTML = connHtml;

    // Hover wiring (chip + capsule share the data-cid so they coordinate)
    chipLayer.querySelectorAll('.company-chip').forEach(chip => {
      const cid = chip.dataset.cid;
      const capsule = chipLayer.querySelector('.chip-capsule[data-cid="' + cid + '"]');
      const onEnter = () => openCapsule(cid);
      const onLeave = () => scheduleCloseCapsule(cid);
      chip.addEventListener('mouseenter', onEnter);
      chip.addEventListener('mouseleave', onLeave);
      chip.addEventListener('focus',      onEnter);
      chip.addEventListener('blur',       onLeave);
      if (capsule) {
        capsule.addEventListener('mouseenter', onEnter);
        capsule.addEventListener('mouseleave', onLeave);
      }
    });
  }

  function openCapsule(cid) {
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
    activeChipId = cid;
    document.querySelectorAll('.company-chip').forEach(el => {
      el.classList.toggle('is-active', el.dataset.cid === cid);
    });
    document.querySelectorAll('.brain-connector').forEach(el => {
      el.classList.toggle('is-hot', el.dataset.cid === cid);
    });
    document.querySelectorAll('.chip-capsule').forEach(el => {
      el.classList.toggle('is-open', el.dataset.cid === cid);
    });

    // Position the now-visible capsule with viewport clamping.
    const chip    = document.querySelector('.company-chip[data-cid="' + cid + '"]');
    const capsule = document.querySelector('.chip-capsule[data-cid="' + cid + '"]');
    if (!chip || !capsule) return;

    const cr = chip.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Measure capsule (needs to be visible already — is-open was set above)
    const CW = capsule.offsetWidth || 280;
    const CH = capsule.offsetHeight || 320;

    const GAP        = 14;   // distance from chip
    const PAD        = 12;   // min distance from viewport edge
    const TOP_BUFFER = 76;   // keep below the top nav

    // Choose the side with more room
    const roomRight = vw - cr.right - GAP - PAD;
    const roomLeft  = cr.left - GAP - PAD;

    let left, origin;
    if (roomRight >= CW || roomRight >= roomLeft) {
      left = cr.right + GAP;
      origin = 'left center';
    } else {
      left = cr.left - GAP - CW;
      origin = 'right center';
    }
    if (left + CW > vw - PAD) left = vw - PAD - CW;
    if (left < PAD)            left = PAD;

    // Vertical: centered on chip, but never above the nav or past the bottom
    let top = cr.top + cr.height / 2 - CH / 2;
    if (top < TOP_BUFFER)         top = TOP_BUFFER;
    if (top + CH > vh - PAD)      top = vh - PAD - CH;

    capsule.style.left = left + 'px';
    capsule.style.top  = top  + 'px';
    capsule.style.setProperty('--co', origin);
  }

  function scheduleCloseCapsule(cid) {
    if (revealTimer) clearTimeout(revealTimer);
    revealTimer = setTimeout(() => {
      // Only close if this chip is still the active one
      if (activeChipId === cid) {
        document.querySelectorAll('.company-chip').forEach(el => el.classList.remove('is-active'));
        document.querySelectorAll('.brain-connector').forEach(el => el.classList.remove('is-hot'));
        document.querySelectorAll('.chip-capsule').forEach(el => el.classList.remove('is-open'));
        activeChipId = null;
      }
      revealTimer = null;
    }, 220);
  }

  // ── init ─────────────────────────────────────────────────
  function init() {
    setGreeting();
    pingAll();
    setupConstellation3D();
    animateConstellation();
    placeChipsAndConnectors();
    startShootingStars();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  window.Sora = Sora;
})();
