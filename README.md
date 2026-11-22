# 🏛️ Karnataka Crime & Law Tracker
### Institutional Public Order Intelligence & Law Enforcement Monitoring Dashboard

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-2ea44f?style=for-the-badge&logo=github)](https://sachinna4.github.io/karnataka-crime-law-tracker/)
[![GitHub Actions CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/sachinna4/karnataka-crime-law-tracker/actions)
[![Daily Cron](https://img.shields.io/badge/Daily%20Cron-07%3A00%20AM%20IST-orange?style=for-the-badge&logo=clockify&logoColor=white)](https://github.com/sachinna4/karnataka-crime-law-tracker/actions/workflows/daily_cron.yml)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![AI Classifier](https://img.shields.io/badge/AI-Google%20Gemini%203.1%20Flash-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)

An institutional-grade web application and automated intelligence pipeline designed to monitor, categorize, track, and display Karnataka crime news and law-enforcement developments across all 31 districts.

> 💡 **New to coding?** Read our plain-English guide: [**HOW_THIS_SYSTEM_WORKS.md**](HOW_THIS_SYSTEM_WORKS.md) — it explains the entire project in simple non-technical terms!

---

## 🌐 Live Website

* **Production URL:** [https://sachinna4.github.io/karnataka-crime-law-tracker/](https://sachinna4.github.io/karnataka-crime-law-tracker/)
* **Repository:** [https://github.com/sachinna4/karnataka-crime-law-tracker](https://github.com/sachinna4/karnataka-crime-law-tracker)

---

## 📑 Table of Contents

- [1. System Architecture](#1-system-architecture)
- [2. Key Features](#2-key-features)
- [3. Predefined Crime Categories & Annual Tally](#3-predefined-crime-categories--annual-tally)
- [4. The eCourts Verification Bridge](#4-the-ecourts-verification-bridge)
- [5. Automated Ingestion Pipeline](#5-automated-ingestion-pipeline)
- [6. Database Architecture & Schema](#6-database-architecture--schema)
- [7. Local Development & Setup](#7-local-development--setup)
- [8. Environment Configuration](#8-environment-configuration)
- [9. Project Structure](#9-project-structure)
- [10. Data Provenance & Ethics](#10-data-provenance--ethics)
- [11. License & Attribution](#11-license--attribution)

---

## 1. System Architecture

The application implements a decoupled, three-layer institutional architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTELLIGENCE SOURCES                         │
│  • Google News Karnataka RSS    • The Hindu Karnataka Section          │
│  • Karnataka State Police (KSP) • Bengaluru City Police (BCP) Bulletins│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               LAYER 1: AUTOMATED INGESTION WORKER                       │
│                       (scripts/daily_fetch.py)                         │
│  • 10 Category-Specific RSS Feeds (Lookback: 36h)                      │
│  • URL Canonicalization & Fuzzy Deduplication (Threshold ≥ 0.80)        │
│  • Google Gemini 3.1 Flash Lite API Classification & Named Extraction  │
│  • Extraction of Station FIR, 16-Char CNR, District & Verification     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Idempotent REST Upsert (merge-duplicates)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   LAYER 2: PERSISTENCE & DATABASE                      │
│                      (Supabase PostgreSQL Cloud)                       │
│  • Base Table: public.karnataka_cases                                  │
│  • Row-Level Security (RLS): Public Read (`anon`) / Write (`service`)   │
│  • B-Tree Multi-Column Indexes on (category, case_date, district)      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS REST API / Client SDK
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│               LAYER 3: INSTITUTIONAL DASHBOARD (src/)                  │
│                   (React 18 • TypeScript • Tailwind)                   │
│  • Level 1: Category Overview (10 Monitored Classes, Annual Tallies)   │
│  • Level 2: Search & District Filters (Real-time debounced query)      │
│  • Level 3: Incident Dossier Table (6 columns including dedicated CNR) │
│  • Level 4: 1-Click eCourts Verification Bridge with Clipboard Copy    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Features

* **Real Article Permalinks:** 100% of external links lead to verified, permanent news articles (no section or homepage redirects).
* **Dedicated CNR Column:** Every court record features its official 16-character CNR number (e.g. `KAHB010024512024`) with a one-click clipboard copy button.
* **1-Click eCourts Verification Bridge:** Directly bridges from the dashboard to the official [eCourts India Portal](https://services.ecourts.gov.in/ecourtindia_v6/) with auto-copied case references.
* **Official Annual Tally Cards:** Top overview cards present verified 1-year incident statistics from the Karnataka State Police (KSP) and National Crime Records Bureau (NCRB).
* **Dual-Mode Data Engine:** Gracefully reads from live Supabase Cloud database with instant fallback to built-in seed dossiers.
* **Automated Daily Ingestion:** Runs in the cloud via GitHub Actions every morning at **07:00 AM IST** with zero local compute required.
* **Clean Institutional Design:** Zero advertisements, minimalist policy-research color palette (`#0F172A`, `#F8FAFC`, `#E2E8F0`), and monospace typography for identifiers and dates.

---

## 3. Predefined Crime Categories & Annual Tally

Every incident is strictly classified into exactly one of the **10 monitored classes**:

| # | Monitored Legal Category | Official Annual Tally (1Y) | Source Authority |
|:-:|:---|:---:|:---|
| **1** | **Murder & Murder for Gain** | **1,385** | KSP / NCRB Crime in India |
| **2** | **Rape & Sexual Assault** | **594** | KSP / NCRB Crime in India |
| **3** | **POCSO Cases** | **2,842** | KSP / Special Court Records |
| **4** | **Robbery & Chain Snatching** | **2,140** | Bengaluru City Police / KSP |
| **5** | **Dacoity** | **168** | KSP Crime Records Bureau |
| **6** | **Burglary (Housebreaking)** | **4,520** | KSP Property Crime Division |
| **7** | **Theft & Motor Vehicle Theft** | **18,650** | KSP / BCP Traffic & Crime |
| **8** | **Rioting & Unlawful Assembly** | **3,280** | Law & Order Intelligence |
| **9** | **Grievous Hurt & Violent Assault** | **5,120** | KSP Crime Statistics |
| **10** | **Dowry Deaths & Domestic Cruelty** | **2,670** | Women & Child Protection Cell |

---

## 4. The eCourts Verification Bridge

The official government portal ([services.ecourts.gov.in](https://services.ecourts.gov.in/ecourtindia_v6/)) protects case status queries behind Securimage CAPTCHAs and session firewalls. Automated bots cannot programmatically bypass these verification gates.

To provide a seamless verification experience, the dashboard implements an interactive bridge:

```
[Incident Table]
       │
       ▼ Click "Verify on eCourts ↗"
┌────────────────────────────────────────────────────────┐
│ 1. Copies 16-character CNR number to user clipboard    │
│ 2. Displays toast: "✓ CNR copied! Paste into eCourts"  │
│ 3. Opens https://services.ecourts.gov.in in new tab    │
└────────────────────────────────────────────────────────┘
       │
       ▼ User Action
[Pastes CNR in "Search by CNR Number" box & enters CAPTCHA]
       │
       ▼
[Official Case Hearing Dates, Orders & Judgment PDFs rendered]
```

---

## 5. Automated Ingestion Pipeline

The backend ingestion pipeline is written in Python (`scripts/daily_fetch.py`) and executed as a scheduled GitHub Action (`.github/workflows/daily_cron.yml`).

### Daily Workflow (`daily_cron.yml`)
* **Schedule:** `30 1 * * *` (01:30 UTC = **07:00 AM IST** daily)
* **Runner:** `ubuntu-latest` (100% cloud-hosted on GitHub)
* **Execution steps:**
  1. Polls 10 category-specific RSS queries for Karnataka police/crime news.
  2. Parses and standardizes article metadata via `feedparser`.
  3. Classifies each candidate story using **Gemini 3.1 Flash Lite** (`temperature: 0.1`).
  4. Discards non-Karnataka or ambiguous stories (confidence threshold < 0.70).
  5. Upserts validated records into Supabase PostgreSQL table `karnataka_cases`.

### One-Time Bulk Backfill (`bulk_backfill.yml`)
* Dispatched manually from the GitHub Actions tab to fetch up to **300 historical cases** across a 12-month window.

---

## 6. Database Architecture & Schema

Hosted on **Supabase Cloud PostgreSQL** (`ewyrwuohkwsookxoduow.supabase.co`):

```sql
CREATE TABLE public.karnataka_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN (
        'Murder & Murder for Gain', 'Rape & Sexual Assault', 'POCSO Cases',
        'Robbery & Chain Snatching', 'Dacoity', 'Burglary',
        'Theft & Motor Vehicle Theft', 'Rioting & Unlawful Assembly',
        'Grievous Hurt & Violent Assault', 'Dowry Deaths & Domestic Cruelty'
    )),
    case_number TEXT UNIQUE NOT NULL,
    case_name TEXT NOT NULL,
    district TEXT NOT NULL,
    case_date DATE NOT NULL,
    case_status TEXT NOT NULL DEFAULT 'Reported – Not Verified',
    detail_link TEXT NOT NULL,
    source_name TEXT,
    source_type TEXT DEFAULT 'news' CHECK (source_type IN ('news', 'police', 'court')),
    published_at TIMESTAMPTZ,
    official_fir_number TEXT,
    cnr_number TEXT,
    verification_status TEXT DEFAULT 'unverified',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-column performance indexes
CREATE INDEX idx_karnataka_cases_cat_date ON public.karnataka_cases (category, case_date DESC);
CREATE INDEX idx_karnataka_cases_district ON public.karnataka_cases (district);
CREATE INDEX idx_karnataka_cases_cnr ON public.karnataka_cases (cnr_number);
```

---

## 7. Local Development & Setup

### Prerequisites
* **Node.js:** v18 or later
* **npm:** v9 or later
* **Python:** 3.10+ (optional, for running local ingestion scripts)

### Installation
```bash
# 1. Clone repository
git clone https://github.com/sachinna4/karnataka-crime-law-tracker.git
cd karnataka-crime-law-tracker

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Available Scripts
| Command | Action |
|:---|:---|
| `npm run dev` | Start local Vite development server |
| `npm run build` | Compile TypeScript and build production bundle |
| `npm run preview` | Locally preview the production build |
| `npm run typecheck` | Run strict TypeScript compiler verification (`tsc --noEmit`) |
| `python scripts/daily_fetch.py` | Run the news ingestion pipeline locally |
| `python scripts/bulk_backfill.py` | Run historical backfill locally |

---

## 8. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Where It's Used |
|:---|:---|:---|
| `VITE_SUPABASE_URL` | Supabase Cloud project URL | Frontend client |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous read key | Frontend client |
| `SUPABASE_URL` | Supabase project URL | Backend Python worker |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged write key | Backend Python worker |
| `GEMINI_API_KEY` | Google AI Studio API key | Python classifier |

> 🔒 **Security Notice:** The `SUPABASE_SERVICE_ROLE_KEY` is only used by backend scripts and GitHub Actions secrets. It is **never** bundled or exposed to the frontend browser.

---

## 9. Project Structure

```
karnataka-crime-law-tracker/
├── .github/
│   └── workflows/
│       ├── daily_cron.yml       # Daily 7:00 AM IST ingestion cron
│       ├── bulk_backfill.yml    # Manual bulk historical backfill
│       └── deploy.yml           # Automated GitHub Pages CI/CD
├── scripts/
│   ├── daily_fetch.py           # Daily RSS & Gemini ingestion worker
│   ├── bulk_backfill.py         # 300-article historical backfill worker
│   └── requirements.txt         # Python worker dependencies
├── src/
│   ├── components/
│   │   ├── CategoryCard.tsx     # Overview cards for 1-year tallies
│   │   ├── CategoryGrid.tsx     # Responsive 10-category grid
│   │   ├── DataSourceIndicator.tsx # Live vs fallback status banner
│   │   ├── IncidentTable.tsx    # 6-column dossier table with CNR copy & eCourts bridge
│   │   ├── LoadingSkeleton.tsx  # Accessible pulse loading state
│   │   ├── Pagination.tsx       # Paginated navigation
│   │   ├── SearchFilter.tsx     # Search box & district dropdown
│   │   └── StatusBadge.tsx      # Visual status chips
│   ├── data/
│   │   └── karnatakaSeedData.ts # Local fallback seed cases & statistics
│   ├── services/
│   │   └── crimeDataService.ts  # Supabase client integration & queries
│   ├── types/
│   │   └── crime.ts             # TypeScript domain definitions
│   ├── App.tsx                  # Root application view
│   ├── main.tsx                 # Entrypoint
│   └── index.css                # Tailwind styling
├── supabase/
│   └── schema.sql               # PostgreSQL schema & functions
├── HOW_THIS_SYSTEM_WORKS.md     # Non-technical beginner explanation guide
├── vite.config.ts               # Vite configuration with relative base
└── package.json                 # Node.js dependencies
```

---

## 10. Data Provenance & Ethics

* **Strict Demarcation:** Media-reported incidents are strictly labeled as `Reported – Not Verified` until corroborated by official police bulletins or judicial records.
* **No Speculation:** News reports without named police stations or FIR registrations are catalogued with deterministic hashes (`NEWS/YYYY/HASH8`) to prevent misrepresentation as official government records.
* **Respect for Privacy & Due Process:** All data is sourced strictly from public, legally disclosable records under Indian press standards and the Indian Evidence Act.

---

## 11. License & Attribution

* **License:** Open Source under the [MIT License](LICENSE).
* **Intelligence Sources:** Google News RSS, *The Hindu* (Karnataka Edition), *Deccan Herald*, Karnataka State Police (KSP) open bulletins, Bengaluru City Police (BCP) press releases.
* **Court Verification:** Official data verification through the [eCourts Services Portal](https://services.ecourts.gov.in/ecourtindia_v6/), e-Committee, Supreme Court of India.
