"""
Sora — initial seed.

Run once to populate Sora with your current companies, projects, and ideas
inferred from memory. Safe to re-run: skips entries whose name already exists.

  python seed.py
"""
from __future__ import annotations

import store


SEED_COMPANIES = [
    {
        "name": "Jordan (Portfolio)",
        "tagline": "Holding layer — you, sitting above everything you build",
        "color": "#a78bfa",
        "notes": "Top of the tree. Personal R&D, ideas not yet assigned to a company.",
    },
    {
        "name": "Fairfield Processing",
        "tagline": "Bedding, pillows, pet beds — Texas operations",
        "color": "#06b6d4",
        "notes": "Walmart, My Texas House, Better Homes & Gardens programs.",
    },
    {
        "name": "Hillbrook Labs",
        "tagline": "AI agents for Fairfield County small businesses",
        "color": "#34d399",
        "notes": "New 2026-05 venture. Hybrid productized + setup model. Founder-prominent brand.",
    },
    {
        "name": "Verify",
        "tagline": "AI insurance verification for pediatric dental",
        "color": "#f59e0b",
        "notes": "Phase 0 spine built. Open Dental Cloud API-only.",
    },
    {
        "name": "CurbAppeal",
        "tagline": "Pressure washing — Wilton, CT (Fairfield County)",
        "color": "#fb7185",
        "notes": "Folder: /Users/jordanyoung/Documents/CurbAppealCo/",
    },
    {
        "name": "Good Kid Tech",
        "tagline": "Non-profit teaching seniors tech confidence",
        "color": "#facc15",
        "notes": "goodkidtech.com — in-person, senior-friendly.",
    },
    {
        "name": "PolyPets",
        "tagline": "DTC operating entity for Fairfield's plush brands",
        "color": "#c9a45d",
        "notes": "House of brands. Separate operating entity that markets Fairfield-owned plush "
                 "brands direct-to-consumer. Brand IP stays with Fairfield; PolyPets owns DTC. "
                 "Folder: /Users/jordanyoung/Documents/PolyPets/. Spin Master/Hasbro endorser model. "
                 "DTC-exclusive SKU tiers drive why-buy-direct.",
    },
]


SEED_PROJECTS = [
    # ── Fairfield Processing ────────────────────────────────────────────────
    {
        "company": "Fairfield Processing",
        "name": "Cortex",
        "tagline": "Autonomous decision intelligence platform",
        "status": "live",
        "url": "",  # Fill in once you have Railway URL handy
        "notes": "Deployed on Railway with Basic Auth. Houses CostLab, Trend Scout, "
                 "Reserve Simulator, Macro Scout, My Texas House, BHG, archive tools.",
        "sub_tools": [
            "CostLab",
            "CostLab Archive",
            "Trend Scout · Toy/Plush",
            "Trend Scout · Home/Pet",
            "Archive · Toy/Plush",
            "Archive · Home/Pet",
            "Reserve Simulator",
            "Macro Scout",
            "My Texas House",
            "Better Homes & Gardens",
        ],
    },
    {
        "company": "Fairfield Processing",
        "name": "Walmart Reserve Program",
        "tagline": "Velocity-triggered reserve strategy (T1/T2/T3)",
        "status": "building",
        "url": "",
        "notes": "FY26 Valentine's data covers 77 SKUs. Simulator tool built inside Cortex.",
    },

    # ── Hillbrook Labs ──────────────────────────────────────────────────────
    {
        "company": "Hillbrook Labs",
        "name": "Concierge",
        "tagline": "First prototype — AI agent for small businesses",
        "status": "building",
        "url": "",
        "notes": "First Concierge prototype underwhelmed in real testing. "
                 "Treat product design as open, not just prompt tuning.",
    },
    {
        "company": "Hillbrook Labs",
        "name": "Custom-trained agent product (name TBD)",
        "tagline": "Productized agent — needs new name (NOT 'Brain')",
        "status": "idea",
        "url": "",
        "notes": "Avoid 'Brain' name per earlier feedback. Pricing model: hybrid productized + setup.",
    },

    # ── Verify ──────────────────────────────────────────────────────────────
    {
        "company": "Verify",
        "name": "Verify — Insurance Engine",
        "tagline": "Open Dental Cloud API insurance verification",
        "status": "building",
        "url": "",
        "notes": "Phase 0 spine done at /Users/jordanyoung/Documents/Verify/. "
                 "Separate folder, repo, Railway service.",
    },

    # ── CurbAppeal ──────────────────────────────────────────────────────────
    {
        "company": "CurbAppeal",
        "name": "CurbAppeal Pressure Washing",
        "tagline": "Wilton CT pressure washing — operating biz",
        "status": "live",
        "url": "",
        "notes": "Brand: CurbAppeal Pressure Washing. HQ Wilton CT, serves Fairfield County. "
                 "Folder: /Users/jordanyoung/Documents/CurbAppealCo/",
    },

    # ── Good Kid Tech ───────────────────────────────────────────────────────
    {
        "company": "Good Kid Tech",
        "name": "Good Kid Tech (program)",
        "tagline": "Senior tech literacy — in person",
        "status": "live",
        "url": "https://goodkidtech.com",
        "notes": "Non-profit. Wants new senior-friendly tools (noted 2026-05-17).",
    },

    # ── Jordan (Portfolio) ──────────────────────────────────────────────────
    {
        "company": "Jordan (Portfolio)",
        "name": "Sora",
        "tagline": "This hub — portfolio command center",
        "status": "building",
        "url": "",
        "notes": "You are here. Standalone Flask app deployed to its own Railway service.",
    },

    # ── PolyPets ────────────────────────────────────────────────────────────
    {
        "company": "PolyPets",
        "name": "Bumbleton",
        "tagline": "Storybook-woodland plush — Walmart wholesale + DTC",
        "status": "building",
        "url": "",
        "notes": "Sub-Brand 1. Already at Walmart Action Alley at $20. PolyPets DTC layer "
                 "carries the core line plus DTC-exclusive characters/colorways/sizes Walmart "
                 "doesn't get. 20 character concepts drafted, launch copy + HTML previews built. "
                 "Honey gold + sage + cream visual identity. Folder: brands/bumbleton/",
    },
    {
        "company": "PolyPets",
        "name": "MoonMeadow",
        "tagline": "Weighted plush — wellness/sensory for kids",
        "status": "building",
        "url": "",
        "notes": "Sub-Brand 2. Pre-launch national brand. 3-lb weighted plush, "
                 "proprioceptive comfort positioning. Compliance review of weighted/wellness "
                 "claims required before public launch. Sage olive + navy + cream visual identity. "
                 "Educational content drafted (About Weighted Plush, Sensory Guide, Bedtime). "
                 "Folder: brands/moonmeadow/",
    },
    {
        "company": "PolyPets",
        "name": "PolyPets Command Center",
        "tagline": "Internal back-office — multi-store ops + Shopify/NetSuite/Meta",
        "status": "building",
        "url": "",
        "notes": "Flask app at command-center/. Runs locally on port 5151. Shopify Admin API "
                 "(per sub-brand store), NetSuite (Fairfield ERP) via SuiteTalk REST + SuiteQL, "
                 "Meta Ads catalog feed + CAPI. Will deploy to Railway as command.polypets.com "
                 "when ready. Same Python/Flask stack as Cortex.",
    },
]


def run() -> None:
    existing_companies = {c["name"] for c in store.list_companies()}
    company_id_by_name: dict[str, str] = {
        c["name"]: c["id"] for c in store.list_companies()
    }

    for spec in SEED_COMPANIES:
        if spec["name"] in existing_companies:
            continue
        c = store.add_company(
            name=spec["name"],
            tagline=spec["tagline"],
            color=spec["color"],
            notes=spec["notes"],
        )
        company_id_by_name[c["name"]] = c["id"]
        print(f"+ company  {c['name']}")

    existing_projects = {p["name"] for p in store.list_projects()}
    for spec in SEED_PROJECTS:
        if spec["name"] in existing_projects:
            continue
        cid = company_id_by_name.get(spec.get("company", ""))
        p = store.add_project(
            name=spec["name"],
            company_id=cid,
            tagline=spec.get("tagline", ""),
            status=spec.get("status", "idea"),
            url=spec.get("url", ""),
            notes=spec.get("notes", ""),
            sub_tools=spec.get("sub_tools", []),
        )
        print(f"+ project  {p['name']}  [{spec.get('company', '—')}]")

    print("\nSeed complete.")


if __name__ == "__main__":
    run()
