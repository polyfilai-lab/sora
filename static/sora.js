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

  function renderNeuralMesh() {
    const g = document.getElementById('neural-mesh');
    if (!g) return;
    const rand = rng('sora-brain-v1');
    const N = 32;
    const dots = [];
    for (let i = 0; i < N; i++) {
      // Cluster inside the brain core circle (R = 72 around cx, cy)
      let x, y, ok = false;
      let tries = 0;
      while (!ok && tries < 12) {
        x = BRAIN_CX + (rand() - 0.5) * 130;
        y = BRAIN_CY + (rand() - 0.5) * 130;
        const dx = x - BRAIN_CX, dy = y - BRAIN_CY;
        if (Math.sqrt(dx*dx + dy*dy) < BRAIN_R - 6) ok = true;
        tries++;
      }
      dots.push({ x, y, active: i < 5 });
    }

    let html = '';
    // Lines between nearby dots
    let lineIdx = 0;
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < 38 && rand() < 0.5) {
          const isPulse = lineIdx < 3;
          const cls = 'neural-line' + (isPulse ? ' pulse p' + (lineIdx + 1) : '');
          html += `<line class="${cls}" x1="${dots[i].x.toFixed(1)}" y1="${dots[i].y.toFixed(1)}" x2="${dots[j].x.toFixed(1)}" y2="${dots[j].y.toFixed(1)}"/>`;
          lineIdx++;
        }
      }
    }
    // Dots on top
    dots.forEach((d, i) => {
      const r = d.active ? 1.8 : 1.3;
      const cls = 'neural-dot' + (d.active ? ' active d' + (i % 5 + 1) : '');
      html += `<circle class="${cls}" cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${r}"/>`;
    });
    g.innerHTML = html;
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

      // Build the capsule project list HTML
      const projectsHtml = (c.projects || []).length
        ? (c.projects || []).map(p => {
            const href = p.url ? `/frame?p=${p.id}` : `/project/${p.id}`;
            return `
              <a class="chip-capsule-item" href="${href}" title="${escapeHtml(p.name)}${p.url ? ' — open in Frame' : ''}">
                <span class="dot s-${p.status}"></span>
                <span class="name">${escapeHtml(p.name)}</span>
                <a class="info" href="/project/${p.id}" onclick="event.stopPropagation()" title="Notes &amp; settings">ⓘ</a>
              </a>`;
          }).join('')
        : '<div class="chip-capsule-empty">No projects under this company yet.</div>';

      chipHtml += `
        <div class="company-chip" data-cid="${c.id}"
             style="left: ${pctX}%; top: ${pctY}%; --c: ${c.color};">
          <div class="company-chip-dot"></div>
          <div class="company-chip-text">
            <div class="company-chip-name">${escapeHtml(c.name)}</div>
            <div class="company-chip-count">${projCount} project${projCount === 1 ? '' : 's'}</div>
          </div>
        </div>
        <div class="chip-capsule ${side}" data-cid="${c.id}"
             style="left: ${pctX}%; top: ${pctY}%; --c: ${c.color};">
          <div class="chip-capsule-head">
            <div class="chip-capsule-band"></div>
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
    renderNeuralMesh();
    placeChipsAndConnectors();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  window.Sora = Sora;
})();
