"""
One-shot migration:
  • Sets the Cortex project URL on the existing Cortex row.
  • Adds every Cortex sub-tool (CostLab, Trend Scout, Macro Scout, etc.) as
    its own first-class Project under Fairfield Processing, with the full
    deep-link URL on Railway.

Idempotent: re-running is safe. Updates Cortex URL, skips any sub-tool
already added by name.

Run:
    python3 migrate_cortex_urls.py
"""
from __future__ import annotations

import store

CORTEX_BASE = "https://web-production-07600.up.railway.app"

CORTEX_SUB_TOOLS = [
    {
        "name": "Macro Scout",
        "path": "/macro-scout",
        "tagline": "Flagship macro intelligence — global signal scanning",
    },
    {
        "name": "CostLab",
        "path": "/costlab",
        "tagline": "Interactive cost calculator + Bill of Materials",
    },
    {
        "name": "CostLab Archive",
        "path": "/costlab/archive",
        "tagline": "Saved CostLab quotes — group, edit, delete, fork",
    },
    {
        "name": "Trend Scout · Toy/Plush",
        "path": "/trend-scout",
        "tagline": "Trend signals scoped to toy + plush categories",
    },
    {
        "name": "Trend Scout · Home/Pet",
        "path": "/trend-scout-home-pet",
        "tagline": "Trend signals for bedding, pillows, pet beds",
    },
    {
        "name": "Trend Archive · Toy/Plush",
        "path": "/archive",
        "tagline": "Historical Trend Scout runs — toy/plush",
    },
    {
        "name": "Trend Archive · Home/Pet",
        "path": "/archive-home-pet",
        "tagline": "Historical Trend Scout runs — home/pet",
    },
    {
        "name": "Reserve Simulator",
        "path": "/reserve-simulator",
        "tagline": "Walmart velocity-triggered reserve tier simulator",
    },
    {
        "name": "My Texas House",
        "path": "/my-texas-house",
        "tagline": "MTH gallery & program assets",
    },
    {
        "name": "Better Homes & Gardens",
        "path": "/better-homes-gardens",
        "tagline": "BHG gallery & program assets",
    },
]


def run() -> None:
    data = store.load()

    # 1) Find Fairfield Processing
    fairfield = next(
        (c for c in data["companies"] if c["name"] == "Fairfield Processing"),
        None,
    )
    if not fairfield:
        print("ERROR: Fairfield Processing not found. Run seed.py first.")
        return

    # 2) Patch the Cortex project's URL
    patched_cortex = False
    for p in data["projects"]:
        if p["name"] == "Cortex":
            if p.get("url") != CORTEX_BASE:
                p["url"] = CORTEX_BASE
                patched_cortex = True
                print(f"~ Cortex URL set → {CORTEX_BASE}")
            break
    if not patched_cortex:
        print("· Cortex URL already current.")

    # Save the URL patch before adding new projects
    store.save(data)

    # 3) Add each sub-tool as its own project (skip if already present)
    existing = {p["name"] for p in store.list_projects()}
    for spec in CORTEX_SUB_TOOLS:
        if spec["name"] in existing:
            print(f"· skip   {spec['name']} (already exists)")
            continue
        p = store.add_project(
            name=spec["name"],
            company_id=fairfield["id"],
            tagline=spec["tagline"],
            status="live",
            url=CORTEX_BASE + spec["path"],
            notes=f"Hosted inside Cortex at {spec['path']}. Basic Auth required.",
        )
        print(f"+ add    {p['name']}  →  {p['url']}")

    print("\nMigration complete.")


if __name__ == "__main__":
    run()
