"""
Railway auto-sync — pulls every service + public domain from Railway's
GraphQL API and reconciles those with Sora's projects so live URLs stay
in sync automatically.

ENV
───
  RAILWAY_API_TOKEN   personal access token from
                      railway.app → Account Settings → Tokens

USAGE
─────
  from railway_sync import sync
  result = sync()   # returns dict {updated:[...], added:[...], skipped:[...], errors:[...]}

MATCHING
────────
A Sora project is matched to a Railway service in this priority order:
  1. project["railway_service_id"] == service.id  (explicit pin)
  2. project["name"].lower() == service["name"].lower()         (exact)
  3. service["name"].lower() in project["name"].lower()         (contains)
  4. project["name"].lower() in service["name"].lower()         (contains)

If no match: the service is added as a NEW Sora project (status=live,
unassigned company) so you can move it under a company later.
"""
from __future__ import annotations

import os
from typing import Any

import requests

import store

GRAPHQL_ENDPOINT = "https://backboard.railway.app/graphql/v2"

# A single query that walks: me → projects → services → instances → domains
QUERY = """
query SoraSync {
  me {
    projects {
      edges {
        node {
          id
          name
          services {
            edges {
              node {
                id
                name
                serviceInstances {
                  edges {
                    node {
                      domains {
                        serviceDomains { domain }
                        customDomains { domain }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
"""


def _token() -> str:
    tok = os.environ.get("RAILWAY_API_TOKEN", "").strip()
    if not tok:
        raise RuntimeError(
            "RAILWAY_API_TOKEN is not set. Generate one at "
            "railway.app/account/tokens and add it as a variable in Railway."
        )
    return tok


def _post_graphql(query: str, variables: dict | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {_token()}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {"query": query}
    if variables:
        payload["variables"] = variables
    r = requests.post(GRAPHQL_ENDPOINT, headers=headers, json=payload, timeout=15)
    if r.status_code == 401:
        raise RuntimeError("Railway API rejected the token (401). Double-check RAILWAY_API_TOKEN.")
    r.raise_for_status()
    body = r.json()
    if "errors" in body and body["errors"]:
        msgs = "; ".join(e.get("message", "?") for e in body["errors"])
        raise RuntimeError(f"Railway API error: {msgs}")
    return body.get("data", {})


def fetch_services() -> list[dict]:
    """Return a flat list of {project_id, project_name, service_id, service_name, urls[]}."""
    data = _post_graphql(QUERY)
    out: list[dict] = []
    me = (data or {}).get("me") or {}
    for proj_edge in ((me.get("projects") or {}).get("edges") or []):
        proj = proj_edge.get("node") or {}
        proj_id, proj_name = proj.get("id"), proj.get("name")
        for svc_edge in ((proj.get("services") or {}).get("edges") or []):
            svc = svc_edge.get("node") or {}
            urls: list[str] = []
            for inst_edge in ((svc.get("serviceInstances") or {}).get("edges") or []):
                inst = inst_edge.get("node") or {}
                domains = inst.get("domains") or {}
                for d in (domains.get("customDomains") or []):
                    if d.get("domain"):
                        urls.append(f"https://{d['domain']}")
                for d in (domains.get("serviceDomains") or []):
                    if d.get("domain"):
                        urls.append(f"https://{d['domain']}")
            # de-dupe, prefer custom domains (we appended those first)
            seen: set[str] = set(); uniq: list[str] = []
            for u in urls:
                if u not in seen:
                    seen.add(u); uniq.append(u)
            out.append({
                "project_id":   proj_id,
                "project_name": proj_name,
                "service_id":   svc.get("id"),
                "service_name": svc.get("name") or "(unnamed)",
                "urls":         uniq,
            })
    return out


def _norm(s: str | None) -> str:
    return (s or "").strip().lower()


def _match_project(svc: dict, projects: list[dict]) -> dict | None:
    svc_id = svc.get("service_id")
    svc_name = _norm(svc.get("service_name"))
    svc_proj_name = _norm(svc.get("project_name"))

    # 1) explicit pin
    for p in projects:
        if p.get("railway_service_id") and p["railway_service_id"] == svc_id:
            return p
    # 2) exact name match (against project_name OR service_name)
    for p in projects:
        pn = _norm(p.get("name"))
        if pn and pn in (svc_name, svc_proj_name):
            return p
    # 3) contains either direction
    for p in projects:
        pn = _norm(p.get("name"))
        if not pn: continue
        if pn in svc_name or pn in svc_proj_name:
            return p
        if svc_name and svc_name in pn:
            return p
    return None


def sync() -> dict:
    """Pull all Railway service URLs and reconcile with Sora projects."""
    services = fetch_services()

    state = store.load()
    projects = state["projects"]

    updated: list[dict] = []
    added: list[dict]   = []
    skipped: list[dict] = []

    for svc in services:
        urls = svc.get("urls") or []
        if not urls:
            skipped.append({**svc, "reason": "no public domain"})
            continue
        url = urls[0]

        match = _match_project(svc, projects)
        if match:
            old = match.get("url") or ""
            if old != url or match.get("railway_service_id") != svc["service_id"]:
                match["url"] = url
                match["railway_service_id"] = svc["service_id"]
                match["updated_at"] = store._now()
                updated.append({
                    "id":          match["id"],
                    "name":        match["name"],
                    "old_url":     old,
                    "new_url":     url,
                    "service":     svc["service_name"],
                    "project":     svc["project_name"],
                })
            else:
                skipped.append({**svc, "reason": "already up to date"})
        else:
            # No matching Sora project — add a new one (unassigned, status=live)
            label = f"{svc['project_name']} · {svc['service_name']}" \
                if svc.get("service_name") and svc.get("service_name") != "web" \
                else svc.get("project_name") or svc.get("service_name") or "Untitled"
            new_proj = {
                "id":         store.new_id("p_"),
                "company_id": None,
                "name":       label,
                "tagline":    f"Auto-added from Railway · {svc['service_name']}",
                "status":     "live",
                "url":        url,
                "tokens_used": 0,
                "notes":      f"Discovered by Railway sync. Service: {svc['service_id']}.",
                "changelog":  [],
                "ideas":      [],
                "sub_tools":  [],
                "railway_service_id": svc["service_id"],
                "created_at": store._now(),
                "updated_at": store._now(),
            }
            state["projects"].append(new_proj)
            added.append({"id": new_proj["id"], "name": label, "url": url})

    store.save(state)
    return {
        "updated": updated,
        "added":   added,
        "skipped": skipped,
        "errors":  [],
    }
