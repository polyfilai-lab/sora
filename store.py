"""
Sora — JSON-backed data store.

Single file: data/sora.json
Shape:
{
  "companies": [{id, name, color, tagline, notes, created_at}],
  "projects":  [{id, company_id, name, tagline, status, url, tokens_used,
                 notes, changelog[], ideas[], sub_tools[], created_at, updated_at}],
  "ideas":     [{id, text, tag, created_at}]
}

Status values: idea | building | live | paused | shipped
"""
from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime
from pathlib import Path

_lock = threading.Lock()

PROJECT_ROOT = Path(__file__).resolve().parent


def data_dir() -> Path:
    """Return persistent data dir. Honors SORA_DATA_DIR env (Railway Volume)."""
    env = os.environ.get("SORA_DATA_DIR", "").strip()
    if env:
        p = Path(env)
    else:
        p = PROJECT_ROOT / "data"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _db_path() -> Path:
    return data_dir() / "sora.json"


def _now() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def _empty() -> dict:
    return {"companies": [], "projects": [], "ideas": []}


def load() -> dict:
    p = _db_path()
    if not p.exists():
        return _empty()
    try:
        with p.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return _empty()
    for key in ("companies", "projects", "ideas"):
        data.setdefault(key, [])
    return data


def save(data: dict) -> None:
    p = _db_path()
    tmp = p.with_suffix(".json.tmp")
    with _lock:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        tmp.replace(p)


def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:10]}"


# ─── Companies ──────────────────────────────────────────────────────────────
def list_companies() -> list[dict]:
    return load()["companies"]


def get_company(company_id: str) -> dict | None:
    return next((c for c in load()["companies"] if c["id"] == company_id), None)


def add_company(name: str, tagline: str = "", color: str = "#6ea8ff",
                notes: str = "") -> dict:
    data = load()
    company = {
        "id": new_id("c_"),
        "name": name,
        "tagline": tagline,
        "color": color,
        "notes": notes,
        "created_at": _now(),
    }
    data["companies"].append(company)
    save(data)
    return company


def update_company(company_id: str, patch: dict) -> dict | None:
    data = load()
    for c in data["companies"]:
        if c["id"] == company_id:
            allowed = {"name", "tagline", "color", "notes"}
            for k, v in patch.items():
                if k in allowed:
                    c[k] = v
            save(data)
            return c
    return None


def delete_company(company_id: str) -> bool:
    data = load()
    before = len(data["companies"])
    data["companies"] = [c for c in data["companies"] if c["id"] != company_id]
    # Detach projects rather than delete them
    for p in data["projects"]:
        if p.get("company_id") == company_id:
            p["company_id"] = None
    save(data)
    return len(data["companies"]) < before


# ─── Projects ───────────────────────────────────────────────────────────────
def list_projects() -> list[dict]:
    return load()["projects"]


def get_project(project_id: str) -> dict | None:
    return next((p for p in load()["projects"] if p["id"] == project_id), None)


def add_project(name: str, company_id: str | None = None, **fields) -> dict:
    data = load()
    project = {
        "id": new_id("p_"),
        "company_id": company_id,
        "name": name,
        "tagline": fields.get("tagline", ""),
        "status": fields.get("status", "idea"),
        "url": fields.get("url", ""),
        "tokens_used": int(fields.get("tokens_used", 0) or 0),
        "notes": fields.get("notes", ""),
        "changelog": fields.get("changelog", []),
        "ideas": fields.get("ideas", []),
        "sub_tools": fields.get("sub_tools", []),
        "created_at": _now(),
        "updated_at": _now(),
    }
    data["projects"].append(project)
    save(data)
    return project


def update_project(project_id: str, patch: dict) -> dict | None:
    data = load()
    for p in data["projects"]:
        if p["id"] == project_id:
            allowed = {"company_id", "name", "tagline", "status", "url",
                       "tokens_used", "notes", "sub_tools"}
            for k, v in patch.items():
                if k in allowed:
                    if k == "tokens_used":
                        p[k] = int(v or 0)
                    else:
                        p[k] = v
            p["updated_at"] = _now()
            save(data)
            return p
    return None


def delete_project(project_id: str) -> bool:
    data = load()
    before = len(data["projects"])
    data["projects"] = [p for p in data["projects"] if p["id"] != project_id]
    save(data)
    return len(data["projects"]) < before


def add_changelog(project_id: str, entry: str) -> dict | None:
    data = load()
    for p in data["projects"]:
        if p["id"] == project_id:
            p.setdefault("changelog", []).insert(0, {
                "id": new_id("cl_"),
                "text": entry,
                "at": _now(),
            })
            p["updated_at"] = _now()
            save(data)
            return p
    return None


def add_project_idea(project_id: str, text: str) -> dict | None:
    data = load()
    for p in data["projects"]:
        if p["id"] == project_id:
            p.setdefault("ideas", []).insert(0, {
                "id": new_id("i_"),
                "text": text,
                "at": _now(),
            })
            p["updated_at"] = _now()
            save(data)
            return p
    return None


def increment_tokens(project_id: str, delta: int) -> dict | None:
    data = load()
    for p in data["projects"]:
        if p["id"] == project_id:
            p["tokens_used"] = max(0, int(p.get("tokens_used", 0)) + int(delta))
            p["updated_at"] = _now()
            save(data)
            return p
    return None


# ─── Global Ideas Inbox ─────────────────────────────────────────────────────
def list_ideas() -> list[dict]:
    return load()["ideas"]


def add_idea(text: str, tag: str = "") -> dict:
    data = load()
    idea = {
        "id": new_id("gi_"),
        "text": text,
        "tag": tag,
        "created_at": _now(),
    }
    data["ideas"].insert(0, idea)
    save(data)
    return idea


def delete_idea(idea_id: str) -> bool:
    data = load()
    before = len(data["ideas"])
    data["ideas"] = [i for i in data["ideas"] if i["id"] != idea_id]
    save(data)
    return len(data["ideas"]) < before


def promote_idea(idea_id: str, company_id: str | None = None) -> dict | None:
    """Convert an inbox idea into a project (status=idea)."""
    data = load()
    idea = next((i for i in data["ideas"] if i["id"] == idea_id), None)
    if not idea:
        return None
    project = add_project(
        name=idea["text"][:60],
        company_id=company_id,
        tagline=idea["text"],
        status="idea",
    )
    delete_idea(idea_id)
    return project
