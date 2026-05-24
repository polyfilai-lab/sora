/* ──────────────────────────────────────────────────────────────
   Sora — frontend logic + SVG hub-and-spoke renderer.
   ────────────────────────────────────────────────────────────── */
(function () {
  const Sora = {};

  // ── api helper ────────────────────────────────────────────
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

  // ── modal helpers ─────────────────────────────────────────
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('is-open');
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('is-open');
  }
  Sora.closeModal = closeModal;

  // ── quick idea ────────────────────────────────────────────
  Sora.quickIdea = async function () {
    const input = document.getElementById('quick-idea');
    const text = (input.value || '').trim();
    if (!text) { input.focus(); return; }
    try {
      await api('POST', '/api/ideas', { text });
      input.value = '';
      location.reload();
    } catch (e) { alert(e.message); }
  };

  // ── new project ───────────────────────────────────────────
  Sora.openNewProject = function (companyId) {
    if (companyId && document.getElementById('np-company')) {
      document.getElementById('np-company').value = companyId;
    }
    openModal('modal-project');
    setTimeout(() => {
      const n = document.getElementById('np-name'); if (n) n.focus();
    }, 50);
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

  // ── new company ───────────────────────────────────────────
  Sora.openNewCompany = function () {
    openModal('modal-company');
    setTimeout(() => {
      const n = document.getElementById('nc-name'); if (n) n.focus();
    }, 50);
  };
  Sora.saveNewCompany = async function () {
    const body = {
      name:    document.getElementById('nc-name').value.trim(),
      tagline: document.getElementById('nc-tagline').value.trim(),
      color:   document.getElementById('nc-color').value || '#0ea5e9',
      notes:   document.getElementById('nc-notes').value.trim(),
    };
    if (!body.name) { alert('Name is required'); return; }
    try { await api('POST', '/api/companies', body); location.reload(); }
    catch (e) { alert(e.message); }
  };
  // ── Railway auto-sync ─────────────────────────────────────
  Sora.syncRailway = async function () {
    const panel = document.getElementById('sync-panel');
    if (panel) {
      panel.style.display = 'block';
      panel.innerHTML = '<div style="font-family: \'JetBrains Mono\', monospace; font-size: 11px; letter-spacing: 0.18em; color: var(--accent-strong); text-transform: uppercase;">Syncing from Railway…</div>';
    }
    try {
      const r = await fetch('/api/sync-railway', { method: 'POST' });
      const j = await r.json();
      if (!j.ok) {
        if (panel) panel.innerHTML = renderSyncError(j.error || 'Unknown error');
        return;
      }
      if (panel) panel.innerHTML = renderSyncResult(j);
      // Reload after 2s so the new URLs/projects appear in the page
      setTimeout(() => location.reload(), 2200);
    } catch (e) {
      if (panel) panel.innerHTML = renderSyncError(e.message);
    }
  };

  function renderSyncResult(j) {
    const u = j.updated || [], a = j.added || [], s = j.skipped || [];
    let html = '<div style="font-family: \'JetBrains Mono\', monospace; font-size: 11px; letter-spacing: 0.18em; color: #15803d; text-transform: uppercase; margin-bottom: 12px;">Sync complete · ' + u.length + ' updated · ' + a.length + ' added · ' + s.length + ' unchanged</div>';
    if (u.length) {
      html += '<div style="margin: 10px 0;"><strong style="font-family: \'Space Grotesk\', sans-serif; font-size: 13px;">Updated</strong>';
      u.forEach(x => {
        html += '<div style="font-size: 12.5px; margin: 4px 0; color: var(--ink-dim);">↻ <strong>' + escapeHtml(x.name) + '</strong> → <span style="font-family: monospace; color: var(--accent-strong);">' + escapeHtml(x.new_url) + '</span></div>';
      });
      html += '</div>';
    }
    if (a.length) {
      html += '<div style="margin: 10px 0;"><strong style="font-family: \'Space Grotesk\', sans-serif; font-size: 13px;">Added</strong>';
      a.forEach(x => {
        html += '<div style="font-size: 12.5px; margin: 4px 0; color: var(--ink-dim);">＋ <strong>' + escapeHtml(x.name) + '</strong> → <span style="font-family: monospace; color: var(--accent-strong);">' + escapeHtml(x.url) + '</span></div>';
      });
      html += '</div>';
    }
    return html;
  }
  function renderSyncError(msg) {
    return '<div style="font-family: \'JetBrains Mono\', monospace; font-size: 11px; letter-spacing: 0.18em; color: #b91c1c; text-transform: uppercase; margin-bottom: 8px;">Sync failed</div>' +
           '<div style="font-size: 13px; color: var(--ink-dim);">' + escapeHtml(msg) + '</div>' +
           '<div style="font-size: 12px; color: var(--ink-mute); margin-top: 8px;">Make sure <code>RAILWAY_API_TOKEN</code> is set in Sora&rsquo;s Railway Variables.</div>';
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  Sora.editCompany = function (id) {
    const newName = prompt('Rename company:');
    if (!newName) return;
    api('PUT', '/api/companies/' + id, { name: newName }).then(() => location.reload());
  };

  // ── ideas list actions ────────────────────────────────────
  Sora.promoteIdea = async function (id) {
    try { await api('POST', '/api/ideas/' + id + '/promote', {}); location.reload(); }
    catch (e) { alert(e.message); }
  };
  Sora.deleteIdea = async function (id) {
    if (!confirm('Delete this idea?')) return;
    try { await api('DELETE', '/api/ideas/' + id); location.reload(); }
    catch (e) { alert(e.message); }
  };

  // ── project detail page ───────────────────────────────────
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

  // ── toast ─────────────────────────────────────────────────
  function flash(text) {
    let t = document.getElementById('sora-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'sora-toast';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 1800);
  }

  // ── URL health pings (list-view dots) ─────────────────────
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

  // ── modal backdrop / esc handling ─────────────────────────
  document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('sora-modal-bg')) {
      e.target.classList.remove('is-open');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.sora-modal-bg.is-open').forEach(m => m.classList.remove('is-open'));
    }
  });

  /* ──────────────────────────────────────────────────────────
     HUB & SPOKE — SVG renderer with focus mode
     ────────────────────────────────────────────────────────── */
  const STATUS_COLORS = {
    idea:     '#a78bfa',
    building: '#0ea5e9',
    live:     '#22c55e',
    paused:   '#f59e0b',
    shipped:  '#f43f5e',
  };

  // ── hub state ───────────────────────────────────────────────
  let hubData = null;
  let hubFocused = null;        // company id, or null = portfolio view
  let hubSvg = null;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function trunc(s, n) {
    s = String(s);
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  // ── shared SVG defs ─────────────────────────────────────────
  function hubDefs() {
    return `<defs>
      <radialGradient id="hub-core-grad" cx="35%" cy="30%">
        <stop offset="0%"   stop-color="#bae6fd"/>
        <stop offset="40%"  stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#0369a1"/>
      </radialGradient>
      <linearGradient id="spoke-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="#0ea5e9" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="#7dd3fc" stop-opacity="0.25"/>
      </linearGradient>
      <filter id="hub-core-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="hub-card-shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/>
        <feOffset dy="2"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.22"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;
  }

  // ── entry point ─────────────────────────────────────────────
  function renderHub() {
    hubSvg = document.getElementById('sora-hub');
    const dataEl = document.getElementById('sora-hub-data');
    if (!hubSvg || !dataEl) return;
    try { hubData = JSON.parse(dataEl.textContent); } catch (_) { return; }

    if (!hubData.companies.length) {
      hubSvg.innerHTML = '<text x="600" y="360" text-anchor="middle" fill="#64748b" font-family="Space Grotesk" font-size="16">No companies yet — add one to see the hub light up.</text>';
      return;
    }
    drawHub(false);
  }

  // Re-render the hub (animated when toggling focus)
  function drawHub(animate) {
    if (animate) {
      hubSvg.classList.add('is-transitioning');
      setTimeout(() => {
        hubSvg.innerHTML = hubFocused ? renderFocused() : renderPortfolio();
        attachHubInteractions();
        requestAnimationFrame(() => hubSvg.classList.remove('is-transitioning'));
      }, 180);
    } else {
      hubSvg.innerHTML = hubFocused ? renderFocused() : renderPortfolio();
      attachHubInteractions();
    }
  }

  // ── PORTFOLIO MODE (default) ────────────────────────────────
  function renderPortfolio() {
    const W = 1200, H = 720;
    const cx = W / 2, cy = H / 2;
    const orbit = 270;
    const coreR = 70;
    const compR = 56;
    const N = hubData.companies.length;

    const positions = hubData.companies.map((c, i) => {
      const angle = -Math.PI / 2 + (i / N) * Math.PI * 2;
      return Object.assign({}, c, {
        x: cx + Math.cos(angle) * orbit,
        y: cy + Math.sin(angle) * orbit,
        angle: angle,
      });
    });

    let html = hubDefs();

    // decorative rings
    [orbit - 60, orbit, orbit + 70].forEach((r, i) => {
      html += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                stroke="rgba(14,165,233,${0.12 - i * 0.03})"
                stroke-width="1" stroke-dasharray="2 6"/>`;
    });

    // spokes
    positions.forEach(p => {
      const dx = p.x - cx, dy = p.y - cy;
      const mx = (cx + p.x) / 2, my = (cy + p.y) / 2;
      const len = Math.sqrt(dx * dx + dy * dy);
      const perpX = -dy / len, perpY = dx / len;
      const c1x = mx + perpX * 22, c1y = my + perpY * 22;
      html += `<path class="hub-spoke" data-cid="${p.id}"
                d="M${cx},${cy} Q${c1x},${c1y} ${p.x},${p.y}"/>`;
    });

    // small project satellites + sub-links (hint at projects per company)
    positions.forEach(p => {
      const projects = p.projects || [];
      if (!projects.length) return;
      const baseAngle = p.angle;
      const spread = Math.min(Math.PI * 0.62, Math.max(0.55, projects.length * 0.34));
      const startAngle = projects.length === 1 ? baseAngle : baseAngle - spread / 2;
      const subRadius = 96 + Math.min(projects.length * 3, 18);
      projects.forEach((proj, i) => {
        const subAngle = projects.length === 1
          ? baseAngle
          : startAngle + (i / (projects.length - 1)) * spread;
        const px = p.x + Math.cos(subAngle) * subRadius;
        const py = p.y + Math.sin(subAngle) * subRadius;
        const color = STATUS_COLORS[proj.status] || '#94a3b8';
        html += `<line class="hub-sublink" style="--c:${p.color}"
                  x1="${p.x}" y1="${p.y}" x2="${px}" y2="${py}"/>`;
        const labelOffset = py > p.y ? 22 : -14;
        html += `<g class="hub-project" style="--ps:${color}" data-pid="${proj.id}">
          <circle class="hub-project-bg" cx="${px}" cy="${py}" r="11"/>
          <circle class="hub-project-dot" cx="${px}" cy="${py}" r="4.5"/>
          <text class="hub-project-name" x="${px}" y="${py + labelOffset}" text-anchor="middle">${esc(trunc(proj.name, 22))}</text>
        </g>`;
      });
    });

    // company nodes
    positions.forEach(p => {
      const count = (p.projects || []).length;
      html += `<g class="hub-company hub-company-clickable" style="--c:${p.color}" data-cid="${p.id}">
        <circle class="hub-company-glow" cx="${p.x}" cy="${p.y}" r="${compR + 18}"/>
        <circle class="hub-company-bg"   cx="${p.x}" cy="${p.y}" r="${compR}"/>
        <text class="hub-company-name"  x="${p.x}" y="${p.y - 2}">${esc(trunc(p.name, 16))}</text>
        <text class="hub-company-count" x="${p.x}" y="${p.y + 16}">${count} · click to focus</text>
      </g>`;
    });

    // center core
    const totalProj = hubData.companies.reduce((s, c) => s + (c.projects || []).length, 0)
                    + (hubData.orphans || []).length;
    html += `<g class="hub-core">
      <circle class="hub-core-shell" cx="${cx}" cy="${cy}" r="${coreR + 32}"/>
      <circle class="hub-core-ring"  cx="${cx}" cy="${cy}" r="${coreR + 18}"/>
      <circle class="hub-core-bg" cx="${cx}" cy="${cy}" r="${coreR}"/>
      <text class="hub-core-sub"   x="${cx}" y="${cy - 20}">Portfolio</text>
      <text class="hub-core-label" x="${cx}" y="${cy + 8}">Sora</text>
      <text class="hub-core-stat"  x="${cx}" y="${cy + 28}">${N} companies · ${totalProj} projects</text>
    </g>`;

    return html;
  }

  // ── FOCUSED MODE (one company at center, projects fanned big) ────
  function renderFocused() {
    const W = 1200, H = 720;
    const cx = W / 2, cy = H / 2;
    const fc = hubData.companies.find(c => c.id === hubFocused);
    if (!fc) return renderPortfolio();

    const projects = fc.projects || [];
    const N = projects.length;

    // Pick a project orbit radius that scales with count
    const PROJ_R = N <= 4 ? 220 : N <= 8 ? 250 : 270;
    const FOCUS_R = 88;
    const OTHER_R = 26;

    let html = hubDefs();

    // Concentric rings around focused company
    [PROJ_R - 50, PROJ_R, PROJ_R + 50].forEach((r, i) => {
      html += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                stroke="rgba(14,165,233,${0.16 - i * 0.04})"
                stroke-width="1" stroke-dasharray="2 6"/>`;
    });

    // Other companies (small dots arranged at top of canvas as a "switcher")
    const others = hubData.companies.filter(c => c.id !== hubFocused);
    const switcherY = 56;
    const switcherSpacing = Math.min(140, (W - 200) / Math.max(1, others.length));
    const switcherStartX = cx - ((others.length - 1) * switcherSpacing) / 2;
    others.forEach((other, i) => {
      const ox = switcherStartX + i * switcherSpacing;
      html += `<g class="hub-other-company" style="--c:${other.color}" data-cid="${other.id}">
        <circle cx="${ox}" cy="${switcherY}" r="${OTHER_R}" fill="white" stroke="${other.color}" stroke-width="1.8" opacity="0.7"/>
        <text x="${ox}" y="${switcherY + 4}" text-anchor="middle"
              font-family="Space Grotesk" font-size="10" font-weight="600" fill="#0b1730">${esc(trunc(other.name.split(' ')[0], 10))}</text>
        <text x="${ox}" y="${switcherY + 46}" text-anchor="middle"
              font-family="JetBrains Mono" font-size="9" fill="#94a3b8" letter-spacing="0.12em">${(other.projects || []).length} proj</text>
      </g>`;
    });

    // "Back to portfolio" pill (top-left)
    html += `<g class="hub-back" data-back="1">
      <rect x="20" y="38" rx="18" ry="18" width="148" height="36"
            fill="white" stroke="#0ea5e9" stroke-width="1.5" filter="url(#hub-card-shadow)"/>
      <text x="44" y="62" font-family="Space Grotesk" font-weight="700"
            font-size="16" fill="#0369a1">←</text>
      <text x="62" y="61" font-family="Space Grotesk" font-weight="600"
            font-size="12" letter-spacing="0.08em" fill="#0369a1">BACK TO SORA</text>
    </g>`;

    // Project orbits with sub-links
    if (N === 0) {
      html += `<text x="${cx}" y="${cy + 200}" text-anchor="middle"
                font-family="Space Grotesk" font-size="14" fill="#94a3b8">No projects under this company yet.</text>`;
    }

    projects.forEach((proj, i) => {
      const angle = -Math.PI / 2 + (i / N) * Math.PI * 2;
      const px = cx + Math.cos(angle) * PROJ_R;
      const py = cy + Math.sin(angle) * PROJ_R;
      const color = STATUS_COLORS[proj.status] || '#94a3b8';

      // Sub-link from center to project
      html += `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}"
                stroke="${fc.color}" stroke-width="1.4" opacity="0.4"/>`;

      // Label position outside the orbit
      const labelR = PROJ_R + 38;
      const labelX = cx + Math.cos(angle) * labelR;
      const labelY = cy + Math.sin(angle) * labelR;
      const cosA = Math.cos(angle);
      const anchor = cosA > 0.3 ? 'start' : (cosA < -0.3 ? 'end' : 'middle');

      html += `<g class="hub-project hub-project-large" style="--ps:${color}" data-pid="${proj.id}">
        <circle cx="${px}" cy="${py}" r="20" fill="white" stroke="${color}" stroke-width="2.5" filter="url(#hub-card-shadow)"/>
        <circle cx="${px}" cy="${py}" r="9" fill="${color}"/>
        <text x="${labelX}" y="${labelY}" text-anchor="${anchor}"
              font-family="Space Grotesk" font-size="13.5" font-weight="600"
              fill="#0b1730" letter-spacing="-0.01em">${esc(trunc(proj.name, 28))}</text>
        <text x="${labelX}" y="${labelY + 17}" text-anchor="${anchor}"
              font-family="JetBrains Mono" font-size="9.5" fill="${color}"
              letter-spacing="0.2em">${proj.status.toUpperCase()}</text>
      </g>`;
    });

    // Focused company at center (clickable to unfocus)
    const nameSize = fc.name.length > 18 ? 16 : (fc.name.length > 12 ? 19 : 22);
    html += `<g class="hub-focused-core" data-back="1">
      <circle cx="${cx}" cy="${cy}" r="${FOCUS_R + 36}" fill="${fc.color}" opacity="0.08"/>
      <circle cx="${cx}" cy="${cy}" r="${FOCUS_R + 20}" fill="none" stroke="${fc.color}"
              stroke-width="1" stroke-dasharray="3 5" opacity="0.45"/>
      <circle cx="${cx}" cy="${cy}" r="${FOCUS_R}" fill="white" stroke="${fc.color}"
              stroke-width="3" filter="url(#hub-card-shadow)"/>
      <text x="${cx}" y="${cy - 28}" text-anchor="middle"
            font-family="JetBrains Mono" font-size="9.5" letter-spacing="0.28em"
            font-weight="600" fill="#94a3b8">FOCUSED</text>
      <text x="${cx}" y="${cy - 2}" text-anchor="middle"
            font-family="Space Grotesk" font-size="${nameSize}" font-weight="600"
            letter-spacing="-0.02em" fill="#0b1730">${esc(trunc(fc.name, 22))}</text>
      <text x="${cx}" y="${cy + 22}" text-anchor="middle"
            font-family="JetBrains Mono" font-size="10" fill="${fc.color}"
            letter-spacing="0.2em">${N} PROJECT${N === 1 ? '' : 'S'}</text>
      <text x="${cx}" y="${cy + 50}" text-anchor="middle"
            font-family="Space Grotesk" font-size="10" fill="#cbd5e1">↺ click to return</text>
    </g>`;

    return html;
  }

  // ── interactions wired after every (re)render ───────────────
  function attachHubInteractions() {
    // Portfolio: click a company to focus it
    hubSvg.querySelectorAll('.hub-company-clickable').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        hubFocused = node.dataset.cid;
        drawHub(true);
        // Smooth scroll the hub into view so user sees the transition
        document.querySelector('.sora-hub-wrap')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      // Hover: brighten the spoke
      const cid = node.dataset.cid;
      node.addEventListener('mouseenter', () => {
        hubSvg.querySelectorAll('.hub-spoke[data-cid="' + cid + '"]')
              .forEach(s => s.classList.add('is-hot'));
      });
      node.addEventListener('mouseleave', () => {
        hubSvg.querySelectorAll('.hub-spoke.is-hot')
              .forEach(s => s.classList.remove('is-hot'));
      });
    });

    // Focused-mode: click another company in the switcher to drill into it
    hubSvg.querySelectorAll('.hub-other-company').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        hubFocused = node.dataset.cid;
        drawHub(true);
      });
    });

    // Back-to-portfolio (back pill OR focused core)
    hubSvg.querySelectorAll('[data-back]').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        hubFocused = null;
        drawHub(true);
      });
    });

    // Project satellites → go to project detail page
    hubSvg.querySelectorAll('.hub-project[data-pid]').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        location.href = '/project/' + node.dataset.pid;
      });
    });
  }

  // ── init ──────────────────────────────────────────────────
  function init() {
    renderHub();
    pingAll();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  window.Sora = Sora;
})();
