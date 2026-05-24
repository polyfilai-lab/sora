# Sora

Your personal command center — every company, every project, every tool you're
building, in one place. Accessible from any device once deployed.

```
   You (Jordan)
     ├── Fairfield Processing
     │     └── Cortex (live)
     │           ├── CostLab
     │           ├── Trend Scout
     │           └── …
     ├── Hillbrook Labs
     │     ├── Concierge
     │     └── Custom agent product
     ├── Verify
     ├── CurbAppeal
     └── Good Kid Tech
```

## What it does

- **Dashboard** — every company, every project, status at a glance
- **Status pipeline** — idea → building → live → paused → shipped
- **Live URL health check** — green/red dot beside every deployed tool
- **Tokens used** — manual counter you tick up after big build sessions
- **Notes + changelog** per project
- **Ideas inbox** — capture whatever you're noodling on; promote to a real
  project when ready
- **Mobile-friendly** — works on your phone

---

## Run it locally

Open Terminal and copy/paste these one at a time:

```bash
cd /Users/jordanyoung/Documents/Sora
python3 -m pip install -r requirements.txt
python3 seed.py        # one-time: loads your companies + projects from memory
python3 app.py
```

Open **http://localhost:5070** in your browser. That's it locally.

To stop the server, press `Ctrl+C` in the Terminal window.

---

## Deploy to Railway (so it works from any device)

Sora deploys exactly like Cortex. Each ⓘ line is one copy/paste.

### 1 · Create a Git repo for Sora

```bash
cd /Users/jordanyoung/Documents/Sora
git init
git add .
git commit -m "Sora — initial commit"
```

Create a new empty GitHub repo (web UI, no README), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/sora.git
git branch -M main
git push -u origin main
```

### 2 · Create a new Railway service

1. Go to **railway.app** → **New Project** → **Deploy from GitHub repo**
2. Pick your `sora` repo
3. Railway auto-detects the Procfile and starts deploying

### 3 · Add environment variables

In Railway → your Sora service → **Variables** tab, add:

| Key             | Value                                         |
|-----------------|-----------------------------------------------|
| `SORA_USERNAME` | a username you'll remember (e.g. `jordan`)    |
| `SORA_PASSWORD` | a strong password (Sora prompts for this)     |
| `SORA_DATA_DIR` | `/data`                                       |

### 4 · Add a Railway Volume (so data persists across redeploys)

1. In Railway → your Sora service → **Volumes** tab → **+ New Volume**
2. Mount path: `/data`
3. Save. Railway redeploys.

### 5 · Get your URL

Railway gives you a `sora-production-xxxx.up.railway.app` URL. Open it from
your phone or any browser. Browser asks for the username/password you set.
Bookmark it. Done.

### 6 · Reseed (one-time, on Railway)

The seed runs from your local data folder. On Railway it starts empty. Two
options:

**Option A — re-run seed remotely.** In Railway → Sora service → ⋮ menu →
**Run a command**, type `python3 seed.py`, press Enter. Done.

**Option B — start fresh.** Just use the `+ Project` / `+ Company` buttons in
the UI to add your stuff. Takes 5 minutes.

---

## File layout

```
Sora/
├── app.py            ← Flask server + API
├── store.py          ← JSON data store
├── seed.py           ← One-time seed of your current companies/projects
├── requirements.txt
├── Procfile          ← Tells Railway how to run it
├── .env.example      ← Copy to .env for local dev (optional)
├── data/
│   └── sora.json     ← All your data lives here
├── static/
│   ├── sora.css
│   └── sora.js
└── templates/
    ├── _base.html
    ├── dashboard.html
    └── project.html
```

## Daily flow

- **New idea** → type into the inbox at the top of the dashboard, Enter
- **New project** → `+ Project` button, fill the modal
- **Log progress** → open a project, write a one-line changelog entry, Enter
- **Tokens spent** → open a project, type the number, hit Add
- **Status change** → open a project, click Edit, change Status, Save

Everything saves immediately to `data/sora.json`.
