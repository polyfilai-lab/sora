"""
Sora — your portfolio command center.

A single-user Flask app that tracks companies, projects, and ideas across
everything you're building. Deploys to Railway with one Procfile.

  Local:   python app.py
  Railway: gunicorn (see Procfile)
"""
from __future__ import annotations

import os
import secrets as _secrets
import time as _time
from pathlib import Path

# Bumps every time the app process starts → defeats stale browser cache after
# each Railway redeploy.
APP_VERSION = str(int(_time.time()))

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, url_for

load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

import store

app = Flask(__name__, template_folder="templates", static_folder="static")


@app.context_processor
def _inject_version():
    """Expose APP_VERSION to all templates as {{ app_version }} for cache busts."""
    return {"app_version": APP_VERSION}

# ── Basic Auth ──────────────────────────────────────────────────────────────
_AUTH_USER = os.environ.get("SORA_USERNAME")
_AUTH_PASS = os.environ.get("SORA_PASSWORD")
_AUTH_ENABLED = bool(_AUTH_USER and _AUTH_PASS)


def _check_basic_auth(auth) -> bool:
    if not auth or not auth.username or not auth.password:
        return False
    user_ok = _secrets.compare_digest(auth.username, _AUTH_USER or "")
    pass_ok = _secrets.compare_digest(auth.password, _AUTH_PASS or "")
    return user_ok and pass_ok


@app.before_request
def _require_auth():
    if not _AUTH_ENABLED:
        return None
    # Allow health-check endpoint without auth (so Railway can monitor)
    if request.path == "/healthz":
        return None
    if _check_basic_auth(request.authorization):
        return None
    return (
        "Authentication required.",
        401,
        {"WWW-Authenticate": 'Basic realm="Sora"'},
    )


# ── Pages ───────────────────────────────────────────────────────────────────
@app.route("/")
def dashboard():
    companies = store.list_companies()
    projects = store.list_projects()
    ideas = store.list_ideas()

    # Group projects under their company
    by_company: dict[str | None, list[dict]] = {}
    for p in projects:
        by_company.setdefault(p.get("company_id"), []).append(p)

    # Summary numbers for the hero strip
    stats = {
        "companies": len(companies),
        "projects":  len(projects),
        "live":      sum(1 for p in projects if p.get("status") == "live"),
        "building":  sum(1 for p in projects if p.get("status") == "building"),
        "ideas":     sum(1 for p in projects if p.get("status") == "idea") + len(ideas),
        "tokens":    sum(int(p.get("tokens_used", 0) or 0) for p in projects),
    }

    # Flat project list, each annotated with its company name for the right-side
    # console + command palette. Sorted by updated_at desc so "In flight" reads
    # recent-first.
    company_by_id = {c["id"]: c for c in companies}
    projects_flat: list[dict] = []
    for p in projects:
        c = company_by_id.get(p.get("company_id") or "")
        projects_flat.append({**p, "company_name": c["name"] if c else ""})
    projects_flat.sort(key=lambda p: p.get("updated_at") or "", reverse=True)

    return render_template(
        "dashboard.html",
        companies=companies,
        by_company=by_company,
        projects_flat=projects_flat,
        ideas=ideas,
        stats=stats,
    )


@app.route("/frame")
def frame_view():
    """Embedded multi-tool view — sidebar of every live URL, iframe pane."""
    companies = store.list_companies()
    projects = store.list_projects()

    # Only show projects that have a URL (otherwise nothing to frame)
    framed = [p for p in projects if (p.get("url") or "").strip()]

    by_company: dict[str | None, list[dict]] = {}
    for p in framed:
        by_company.setdefault(p.get("company_id"), []).append(p)

    # Determine which project to load by default (?p=<id>, else first live)
    requested = request.args.get("p", "").strip()
    selected = next((p for p in framed if p["id"] == requested), None)
    if not selected:
        selected = next((p for p in framed if p.get("status") == "live"), None)
    if not selected and framed:
        selected = framed[0]

    return render_template(
        "frame.html",
        companies=companies,
        by_company=by_company,
        framed=framed,
        selected=selected,
    )


@app.route("/project/<project_id>")
def project_page(project_id: str):
    project = store.get_project(project_id)
    if not project:
        return redirect(url_for("dashboard"))
    companies = store.list_companies()
    return render_template(
        "project.html",
        project=project,
        companies=companies,
    )


@app.route("/healthz")
def healthz():
    return {"ok": True}, 200


# ── API: Companies ──────────────────────────────────────────────────────────
@app.post("/api/companies")
def api_add_company():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify(error="name required"), 400
    c = store.add_company(
        name=name,
        tagline=data.get("tagline", "").strip(),
        color=data.get("color", "#6ea8ff"),
        notes=data.get("notes", "").strip(),
    )
    return jsonify(c)


@app.put("/api/companies/<company_id>")
def api_update_company(company_id: str):
    patch = request.get_json(silent=True) or {}
    c = store.update_company(company_id, patch)
    return jsonify(c) if c else (jsonify(error="not found"), 404)


@app.delete("/api/companies/<company_id>")
def api_delete_company(company_id: str):
    ok = store.delete_company(company_id)
    return jsonify(ok=ok)


# ── API: Projects ───────────────────────────────────────────────────────────
@app.post("/api/projects")
def api_add_project():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify(error="name required"), 400
    p = store.add_project(
        name=name,
        company_id=data.get("company_id") or None,
        tagline=data.get("tagline", "").strip(),
        status=data.get("status", "idea"),
        url=data.get("url", "").strip(),
        notes=data.get("notes", "").strip(),
    )
    return jsonify(p)


@app.put("/api/projects/<project_id>")
def api_update_project(project_id: str):
    patch = request.get_json(silent=True) or {}
    p = store.update_project(project_id, patch)
    return jsonify(p) if p else (jsonify(error="not found"), 404)


@app.delete("/api/projects/<project_id>")
def api_delete_project(project_id: str):
    ok = store.delete_project(project_id)
    return jsonify(ok=ok)


@app.post("/api/projects/<project_id>/changelog")
def api_add_changelog(project_id: str):
    text = (request.get_json(silent=True) or {}).get("text", "").strip()
    if not text:
        return jsonify(error="text required"), 400
    p = store.add_changelog(project_id, text)
    return jsonify(p) if p else (jsonify(error="not found"), 404)


@app.post("/api/projects/<project_id>/ideas")
def api_add_project_idea(project_id: str):
    text = (request.get_json(silent=True) or {}).get("text", "").strip()
    if not text:
        return jsonify(error="text required"), 400
    p = store.add_project_idea(project_id, text)
    return jsonify(p) if p else (jsonify(error="not found"), 404)


@app.post("/api/projects/<project_id>/tokens")
def api_tokens(project_id: str):
    """Add or subtract tokens. Body: {"delta": 12345} (negative ok)."""
    delta = (request.get_json(silent=True) or {}).get("delta", 0)
    try:
        delta = int(delta)
    except (TypeError, ValueError):
        return jsonify(error="delta must be int"), 400
    p = store.increment_tokens(project_id, delta)
    return jsonify(p) if p else (jsonify(error="not found"), 404)


# ── API: Global Ideas ───────────────────────────────────────────────────────
@app.post("/api/ideas")
def api_add_idea():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify(error="text required"), 400
    i = store.add_idea(text=text, tag=data.get("tag", "").strip())
    return jsonify(i)


@app.delete("/api/ideas/<idea_id>")
def api_delete_idea(idea_id: str):
    return jsonify(ok=store.delete_idea(idea_id))


@app.post("/api/ideas/<idea_id>/promote")
def api_promote_idea(idea_id: str):
    company_id = (request.get_json(silent=True) or {}).get("company_id") or None
    p = store.promote_idea(idea_id, company_id=company_id)
    return jsonify(p) if p else (jsonify(error="not found"), 404)


# ── API: Railway auto-sync ──────────────────────────────────────────────────
@app.post("/api/sync-railway")
def api_sync_railway():
    """Reach into Railway via GraphQL and reconcile service URLs with Sora projects."""
    try:
        import railway_sync
        result = railway_sync.sync()
        return jsonify(ok=True, **result)
    except RuntimeError as e:
        return jsonify(ok=False, error=str(e)), 400
    except Exception as e:
        return jsonify(ok=False, error=f"{type(e).__name__}: {e}"), 500


# ── API: Logo file index ────────────────────────────────────────────────────
# Lists everything in /static/logos/ so the frontend can auto-discover real
# brand assets without us having to edit JS every time a new file appears.
@app.get("/api/logos")
def api_logos():
    logos_dir = Path(__file__).resolve().parent / "static" / "logos"
    out: dict[str, str] = {}
    if logos_dir.exists():
        for f in logos_dir.iterdir():
            if not f.is_file() or f.name.startswith("."):
                continue
            if f.suffix.lower() not in {".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"}:
                continue
            slug = f.stem.lower().replace("-", "").replace("_", "")
            out[slug] = f"/static/logos/{f.name}"
    return jsonify(logos=out)


# ── API: Health-check ping (server-side, avoids CORS) ───────────────────────
@app.get("/api/ping")
def api_ping():
    url = (request.args.get("url") or "").strip()
    if not url:
        return jsonify(ok=False, error="url required"), 400
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        r = requests.get(url, timeout=6, allow_redirects=True)
        return jsonify(ok=r.status_code < 500, status=r.status_code, url=url)
    except requests.RequestException as e:
        return jsonify(ok=False, error=str(e), url=url)


# ── Auto-seed on first boot ─────────────────────────────────────────────────
# Railway containers start empty (data is gitignored). If the persistent
# volume is brand new, populate it with the initial company + project list
# so the user doesn't have to find Railway's hidden "Run a Command" UI.
def _bootstrap_if_empty():
    try:
        existing = store.load()
        if existing.get("companies") or existing.get("projects"):
            return  # already populated — leave it alone
        print("[sora] data store is empty — running seed + Cortex migration…", flush=True)
        import seed
        seed.run()
        import migrate_cortex_urls
        migrate_cortex_urls.run()
        print("[sora] bootstrap complete.", flush=True)
    except Exception as e:
        print(f"[sora] bootstrap skipped: {type(e).__name__}: {e}", flush=True)


_bootstrap_if_empty()


# Idempotent migrations — safe to run on every boot. They only act if the
# old state is detected.
POLYPETS_BASE_URL = "https://web-production-0725a.up.railway.app"
POLYPETS_PROJECT_URLS = {
    "Bumbleton":  f"{POLYPETS_BASE_URL}/bumbleton",
    "MoonMeadow": f"{POLYPETS_BASE_URL}/moonmeadow",
}


def _run_idempotent_migrations():
    try:
        data = store.load()
        changed = False

        # M1 — strip the legacy Jordan (Portfolio) company + meta-Sora project
        portfolio = next(
            (c for c in data["companies"] if c["name"].strip().lower() in
             {"jordan (portfolio)", "jordan portfolio"}),
            None,
        )
        if portfolio:
            pcid = portfolio["id"]
            kept: list[dict] = []
            for p in data["projects"]:
                if p["name"] == "Sora" and p.get("company_id") == pcid:
                    continue  # delete the meta-Sora project
                if p.get("company_id") == pcid:
                    p["company_id"] = None  # unassign others
                kept.append(p)
            data["projects"] = kept
            data["companies"] = [c for c in data["companies"] if c["id"] != pcid]
            changed = True
            print("[sora] migration: removed Jordan (Portfolio) + Sora project", flush=True)

        # M2 — wire PolyPets brand projects to their Railway routes
        from datetime import datetime
        for p in data["projects"]:
            target = POLYPETS_PROJECT_URLS.get(p["name"])
            if target and p.get("url") != target:
                p["url"] = target
                p["updated_at"] = datetime.utcnow().isoformat(timespec="seconds") + "Z"
                changed = True
                print(f"[sora] migration: set {p['name']} URL → {target}", flush=True)

        if changed:
            store.save(data)
    except Exception as e:
        print(f"[sora] migration skipped: {type(e).__name__}: {e}", flush=True)


_run_idempotent_migrations()


# Manual re-bootstrap endpoint (idempotent — only seeds if empty)
@app.post("/api/bootstrap")
def api_bootstrap():
    try:
        existing = store.load()
        already = bool(existing.get("companies") or existing.get("projects"))
        if already:
            return jsonify(ok=True, status="already_populated",
                           companies=len(existing.get("companies", [])),
                           projects=len(existing.get("projects", [])))
        import seed, migrate_cortex_urls
        seed.run()
        migrate_cortex_urls.run()
        after = store.load()
        return jsonify(ok=True, status="seeded",
                       companies=len(after.get("companies", [])),
                       projects=len(after.get("projects", [])))
    except Exception as e:
        return jsonify(ok=False, error=f"{type(e).__name__}: {e}"), 500


# ── Startup ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5070))
    print(f"\n  Sora is running at http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=True)
