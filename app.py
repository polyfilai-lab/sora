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
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, url_for

load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

import store

app = Flask(__name__, template_folder="templates", static_folder="static")

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

    return render_template(
        "dashboard.html",
        companies=companies,
        by_company=by_company,
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


# ── Startup ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5070))
    print(f"\n  Sora is running at http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=True)
