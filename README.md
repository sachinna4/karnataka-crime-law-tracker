# Karnataka Crime & Law Tracker
### Institutional Public Order Intelligence & Law Enforcement Monitoring Dashboard

An institutional-grade web application and automated intelligence pipeline designed to monitor, categorize, track, and display Karnataka crime news and law-enforcement developments across all 31 districts.

---

## 1. System Architecture

The application implements a decoupled three-layer institutional architecture:

```
[Google News RSS / The Hindu RSS]
               │
               ▼
   [Python Ingestion Worker]  ──► [Gemini AI Classification & Extraction]
               │
               ▼
   [Supabase PostgreSQL]     ◄── [Strict RLS & Data Provenance Constraints]
               │
               ▼
   [React 18 / TypeScript UI] ◄── [Dual-Mode: Live Supabase / Local Fallback]
```

### Layer 1: Automated Ingestion Worker (`scripts/daily_fetch.py`)
- Continuously polls Google News Karnataka law & crime queries and The Hindu Karnataka RSS feeds.
- Deduplicates candidate reports using URL canonicalization and fuzzy title matching (threshold >= 0.80).
- Categorizes reports strictly into the 10 predefined institutional crime categories using Google Gemini AI.
- Rejects ambiguous or low-confidence (<0.70) articles to preserve data fidelity.
- Generates deterministic incident tracking references (`NEWS/{YYYY}/{HASH8}`).
- Upserts records idempotently into Supabase PostgreSQL.

### Layer 2: Database & Persistence (`supabase/schema.sql`)
- PostgreSQL with `pgcrypto` extension for unique UUID generation.
- Base table `public.karnataka_cases` with check constraints for all 10 predefined categories and valid case statuses.
- Row-Level Security (RLS) configured for public read access (`SELECT`) and write-restricted ingestion via service-role key.
- Optimized multi-column B-tree indexes for category, date, and district queries.
- Stored procedure `get_category_counts()` for efficient 1-year window aggregations.

### Layer 3: Institutional Dashboard (`src/`)
- Built with React 18, TypeScript, Tailwind CSS, and Lucide React.
- Minimalist institutional design following policy research guidelines:
  - Background: `#FFFFFF` (cards/header) / `#F8FAFC` (page)
  - Text: `#0F172A` (slate-900)
  - Borders: `#E2E8F0` (slate-200)
  - Monospace typography for case references, dates, and incident counts.
- Level 1 Category Grid: 10 interactive tiles (1 col mobile, 2 col tablet, 5 col desktop) showing 1-year incident tallies.
- Level 2 Incident Dossier: 5-column paginated table with real-time title/reference search, district dropdown filtering, and verified HTTPS source links.
- Graceful dual-mode operation: seamless switch between live Supabase data and illustrative local fallback data.

---

## 2. Predefined Crime Categories

Every record is mapped strictly to one of the following 10 institutional categories:

1. `Murder & Murder for Gain`
2. `Rape & Sexual Assault`
3. `POCSO Cases`
4. `Robbery & Chain Snatching`
5. `Dacoity`
6. `Burglary`
7. `Theft & Motor Vehicle Theft`
8. `Rioting & Unlawful Assembly`
9. `Grievous Hurt & Violent Assault`
10. `Dowry Deaths & Domestic Cruelty`

---

## 3. Data Integrity & Provenance Protocol

- **Strict Demarcation**: News-reported incidents are never represented as official police FIRs or judicial convictions unless verified by official records.
- **Reference Identification**: Generated news references (`NEWS/...`) are explicitly labeled with `Generated Ref` to prevent confusion with official police FIR registrations.
- **Case Statuses Supported**:
  - `FIR Registered`
  - `Charge Sheet Filed`
  - `Under Investigation`
  - `Convicted`
  - `Reported – Not Verified` (default for media items)
- **Sample Data Flagging**: Whenever the dashboard runs without a connected database or in fallback mode, a prominent institutional alert banner clearly labels all data as `Illustrative Sample Data`.

---

## 4. Setup & Installation

### Prerequisites
- Node.js (v18 or later) & npm
- Python 3.10+ (for running the ingestion worker)

### 1. Clone & Install Frontend
```bash
git clone <repository-url>
cd karnataka-crime-law-tracker
npm install
```

### 2. Run in Local Demonstration Mode (Zero-Config)
The application works immediately out-of-the-box using built-in illustrative seed data:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Connecting Supabase (Production Mode)

### Step 1: Set Up Supabase Project
1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql` from this repository, paste the contents into the SQL Editor, and click **Run**.
   - This creates the `karnataka_cases` table, constraints, indexes, RLS policies, and the `get_category_counts()` function.

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials in `.env`:
```ini
# Frontend credentials (Project Settings -> API -> Project URL & anon key)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# Backend ingestion credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
GEMINI_API_KEY=AIzaSy...
```

Once configured, restart the dev server (`npm run dev`). The top header will automatically transition from `Illustrative Sample Data` to `Connected to Live Supabase Data Store`.

---

## 6. Daily Automated Ingestion Pipeline

### Running Manually
To execute the pipeline locally:
```bash
cd scripts
pip install -r requirements.txt
python daily_fetch.py
```
*(Add `--dry-run` to inspect collected articles without inserting into Supabase).*

### Scheduled Automation (GitHub Actions)
The repository includes `.github/workflows/daily_cron.yml`, configured to run every morning at **07:00 AM IST** (01:30 UTC).

To enable daily automated updates in your GitHub repository:
1. Navigate to **Settings** -> **Secrets and variables** -> **Actions**.
2. Add the following repository secrets:
   - `GEMINI_API_KEY`: Your Google AI Studio API key.
   - `SUPABASE_URL`: Your Supabase project URL (`https://xyz.supabase.co`).
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase `service_role` secret key.
3. The workflow will now trigger automatically every day, or can be run on-demand via the **Run workflow** button in the Actions tab.

---

## 7. Scripts & Commands

| Command | Description |
|---|---|
| `npm run dev` | Start local Vite development server |
| `npm run build` | Compile TypeScript and build production bundle |
| `npm run typecheck` | Run TypeScript compiler checks (`tsc --noEmit`) |
| `npm run preview` | Preview production build locally |
| `python scripts/daily_fetch.py` | Run RSS news ingestion and Gemini classification worker |

---

## 8. License & Attribution
Designed for public policy researchers, journalists, and civic transparency monitors.
Sources attributed: Google News, The Hindu, Karnataka State Police open bulletins.
