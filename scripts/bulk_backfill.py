#!/usr/bin/env python3
"""
Karnataka Crime & Law Tracker — Bulk Historical Backfill (v1)
=============================================================
One-time script to populate the Supabase DB with ~300 historical
Karnataka crime incidents from the past 12 months.

Runs Google News searches with broader time windows and multiple
crime-specific queries to get as many articles as possible.

Usage:
    python scripts/bulk_backfill.py
    python scripts/bulk_backfill.py --dry-run   # print JSON only, no DB write
"""

import os
import sys
import json
import hashlib
import difflib
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

import feedparser
import requests
from dateutil import parser as date_parser

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("KA_Backfill")

PREDEFINED_CATEGORIES = [
    "Murder & Murder for Gain",
    "Rape & Sexual Assault",
    "POCSO Cases",
    "Robbery & Chain Snatching",
    "Dacoity",
    "Burglary",
    "Theft & Motor Vehicle Theft",
    "Rioting & Unlawful Assembly",
    "Grievous Hurt & Violent Assault",
    "Dowry Deaths & Domestic Cruelty",
]

KARNATAKA_DISTRICTS = [
    "Bengaluru Urban", "Mysuru", "Mangaluru", "Hubballi-Dharwad", "Belagavi",
    "Kalaburagi", "Tumakuru", "Shivamogga", "Ballari", "Vijayapura",
    "Raichur", "Davangere", "Chitradurga", "Hassan", "Chikkamagaluru",
    "Bagalkot", "Gadag", "Koppal", "Haveri", "Dharwad",
    "Uttara Kannada", "Udupi", "Dakshina Kannada", "Kodagu", "Chamarajanagar",
    "Mandya", "Ramanagara", "Bengaluru Rural", "Chikkaballapura", "Kolar",
    "Yadgir", "Bidar"
]

# ── Broad historical queries across all categories ────────────────────────────
BACKFILL_FEEDS = [
    # Murder
    {"name": "Murder Karnataka 7d", "url": "https://news.google.com/rss/search?q=Karnataka+murder+arrested+when:7d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    {"name": "Murder Karnataka 30d", "url": "https://news.google.com/rss/search?q=Karnataka+murder+killed+arrested+when:30d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Rape / POCSO
    {"name": "Rape POCSO 7d", "url": "https://news.google.com/rss/search?q=Karnataka+rape+OR+POCSO+arrested+when:7d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    {"name": "Rape POCSO 30d", "url": "https://news.google.com/rss/search?q=Karnataka+sexual+assault+OR+POCSO+FIR+when:30d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Robbery / chain snatching
    {"name": "Robbery 7d", "url": "https://news.google.com/rss/search?q=Karnataka+robbery+OR+%22chain+snatching%22+arrested+when:7d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    {"name": "Robbery 30d", "url": "https://news.google.com/rss/search?q=Bengaluru+robbery+OR+%22chain+snatching%22+when:30d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Dacoity
    {"name": "Dacoity 30d", "url": "https://news.google.com/rss/search?q=Karnataka+dacoity+OR+armed+robbery+arrested+when:30d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Burglary / Theft
    {"name": "Burglary Theft 7d", "url": "https://news.google.com/rss/search?q=Karnataka+burglary+OR+housebreak+OR+%22vehicle+theft%22+when:7d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    {"name": "Burglary Theft 30d", "url": "https://news.google.com/rss/search?q=Bengaluru+theft+OR+burglary+arrested+when:30d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Dowry / Domestic violence
    {"name": "Dowry 7d", "url": "https://news.google.com/rss/search?q=Karnataka+dowry+death+OR+%22domestic+cruelty%22+FIR+when:7d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    {"name": "Dowry 30d", "url": "https://news.google.com/rss/search?q=Karnataka+dowry+death+OR+498A+IPC+when:30d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Rioting / Unlawful assembly
    {"name": "Rioting 30d", "url": "https://news.google.com/rss/search?q=Karnataka+rioting+OR+%22unlawful+assembly%22+OR+communal+violence+when:30d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Grievous hurt / assault
    {"name": "Assault 7d", "url": "https://news.google.com/rss/search?q=Karnataka+assault+OR+%22grievous+hurt%22+arrested+when:7d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    {"name": "Assault 30d", "url": "https://news.google.com/rss/search?q=Bengaluru+stabbing+OR+assault+OR+%22grievous+hurt%22+arrested+when:30d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Google News"},
    # Bengaluru city police broad
    {"name": "BCP FIR 7d", "url": "https://news.google.com/rss/search?q=%22Bengaluru+City+Police%22+FIR+OR+arrested+crime+when:7d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Bengaluru City Police"},
    {"name": "KSP Press 30d", "url": "https://news.google.com/rss/search?q=%22Karnataka+Police%22+arrested+OR+crime+OR+FIR+when:30d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Karnataka State Police (KSP)"},
    # The Hindu Karnataka
    {"name": "The Hindu Karnataka", "url": "https://www.thehindu.com/news/national/karnataka/feeder/default.rss", "source": "The Hindu"},
    # Deccan Herald
    {"name": "Deccan Herald Karnataka", "url": "https://www.deccanherald.com/india/karnataka/feed", "source": "Deccan Herald"},
    # Times of India Bengaluru
    {"name": "TOI Bengaluru Crime", "url": "https://news.google.com/rss/search?q=%22Times+of+India%22+Bengaluru+crime+OR+murder+OR+rape+OR+arrested+when:30d&hl=en-IN&gl=IN&ceid=IN:en", "source": "Times of India"},
    # NDTV Karnataka
    {"name": "NDTV Karnataka crime", "url": "https://news.google.com/rss/search?q=NDTV+Karnataka+crime+OR+arrested+OR+murder+when:30d&hl=en-IN&gl=IN&ceid=IN:en", "source": "NDTV"},
]

MAX_BACKFILL_ARTICLES = 300
GEMINI_CALL_DELAY = 1.0   # seconds between Gemini calls to avoid rate limiting


def generate_case_number(url: str, year: int) -> str:
    hash_str = hashlib.sha256(url.strip().encode('utf-8')).hexdigest()[:8].upper()
    return f"NEWS/{year}/{hash_str}"


def is_duplicate_title(candidate: str, existing_titles: List[str], threshold: float = 0.80) -> bool:
    cand_norm = candidate.lower().strip()
    for existing in existing_titles:
        ratio = difflib.SequenceMatcher(None, cand_norm, existing.lower().strip()).ratio()
        if ratio >= threshold:
            return True
    return False


def fetch_all_articles() -> List[Dict[str, Any]]:
    """Fetch articles from all backfill feeds without date cutoff filtering."""
    articles = []
    seen_urls: set = set()
    seen_titles: List[str] = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    for feed_info in BACKFILL_FEEDS:
        logger.info(f"Fetching: {feed_info['name']}")
        try:
            resp = requests.get(feed_info["url"], headers=headers, timeout=15)
            if resp.status_code != 200:
                logger.warning(f"  → HTTP {resp.status_code}")
                continue

            feed = feedparser.parse(resp.content)
            count = 0
            for entry in feed.entries:
                if len(articles) >= MAX_BACKFILL_ARTICLES:
                    break

                link = getattr(entry, "link", "").strip()
                title = getattr(entry, "title", "").strip()
                summary = getattr(entry, "summary", "").strip()

                if not link or not title:
                    continue
                if link in seen_urls:
                    continue
                if is_duplicate_title(title, seen_titles):
                    continue

                pub_date = None
                if hasattr(entry, "published"):
                    try:
                        pub_date = date_parser.parse(entry.published)
                        if pub_date.tzinfo is None:
                            pub_date = pub_date.replace(tzinfo=timezone.utc)
                    except Exception:
                        pub_date = datetime.now(timezone.utc)
                else:
                    pub_date = datetime.now(timezone.utc)

                seen_urls.add(link)
                seen_titles.append(title)
                count += 1

                articles.append({
                    "title": title,
                    "link": link,
                    "summary": summary,
                    "published_at": pub_date.isoformat(),
                    "source_name": feed_info["source"]
                })

            logger.info(f"  → {count} articles collected")
        except Exception as e:
            logger.error(f"Error fetching {feed_info['name']}: {e}")

        if len(articles) >= MAX_BACKFILL_ARTICLES:
            logger.info(f"Reached article limit ({MAX_BACKFILL_ARTICLES}), stopping fetch.")
            break

    logger.info(f"Total unique articles collected: {len(articles)}")
    return articles


def classify_with_gemini(article: Dict[str, Any], api_key: str) -> Optional[Dict[str, Any]]:
    prompt = f"""You are an institutional legal and crime classification analyst for the Karnataka Law & Order Tracker.
Analyze:
Title: {article['title']}
Summary: {article['summary']}
URL: {article['link']}

Rules:
1. Classify into EXACTLY ONE of:
{json.dumps(PREDEFINED_CATEGORIES, indent=2)}
2. Set "is_karnataka_crime": false if NOT a Karnataka crime incident.
3. Set "is_karnataka_crime": false if confidence < 0.70.
4. District from: {json.dumps(KARNATAKA_DISTRICTS)} — default "Bengaluru Urban".
5. Status: "Reported – Not Verified" unless article explicitly says otherwise.
6. Return ONLY valid JSON:
{{
  "is_karnataka_crime": true/false,
  "confidence": 0.0-1.0,
  "category": "exact category",
  "case_name": "max 100 chars",
  "district": "valid district",
  "case_date": "YYYY-MM-DD",
  "case_status": "Reported – Not Verified",
  "source_type": "police or news",
  "official_fir_number": null,
  "cnr_number": null
}}"""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "response_mime_type": "application/json"}
        }
        resp = requests.post(url, json=payload, timeout=25)
        if resp.status_code != 200:
            logger.warning(f"Gemini {resp.status_code}: {resp.text[:150]}")
            return None

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return None

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return None

        parsed = json.loads(parts[0].get("text", "").strip())

        if not parsed.get("is_karnataka_crime", False):
            return None

        category = parsed.get("category")
        if category not in PREDEFINED_CATEGORIES:
            return None

        district = parsed.get("district", "Bengaluru Urban")
        if district not in KARNATAKA_DISTRICTS:
            district = "Bengaluru Urban"

        case_date = parsed.get("case_date") or article["published_at"].split("T")[0]
        year = int(case_date.split("-")[0]) if "-" in case_date else datetime.now().year
        case_number = generate_case_number(article["link"], year)
        source_type = parsed.get("source_type", "news").lower()
        if source_type not in ("news", "police", "court"):
            source_type = "police" if "police" in article["source_name"].lower() else "news"

        return {
            "category": category,
            "case_number": case_number,
            "case_name": parsed.get("case_name", article["title"][:90]),
            "district": district,
            "case_date": case_date,
            "case_status": parsed.get("case_status", "Reported \u2013 Not Verified"),
            "detail_link": article["link"],
            "source_name": article["source_name"],
            "source_type": source_type,
            "published_at": article["published_at"],
            "official_fir_number": parsed.get("official_fir_number"),
            "cnr_number": parsed.get("cnr_number"),
            "verification_status": "source_confirmed" if source_type == "police" else "unverified",
        }
    except Exception as e:
        logger.error(f"Classification error: {e}")
        return None


def upsert_batch(records: List[Dict[str, Any]], supabase_url: str, service_role_key: str):
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/karnataka_cases"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    success = 0
    for record in records:
        try:
            resp = requests.post(endpoint, json=record, headers=headers, timeout=15)
            if resp.status_code in (200, 201):
                success += 1
                logger.info(f"  ✓ [{record['category'][:22]}] {record['case_name'][:55]}")
            else:
                logger.warning(f"  ✗ {resp.status_code}: {resp.text[:150]}")
        except Exception as e:
            logger.error(f"Upsert error for {record.get('case_number')}: {e}")
    return success


def load_env_file():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    k, v = k.strip(), v.strip()
                    if k and v and k not in os.environ:
                        os.environ[k] = v
        logger.info("Loaded .env")


def main():
    load_env_file()
    logger.info("=" * 65)
    logger.info("Karnataka Crime Tracker — BULK HISTORICAL BACKFILL")
    logger.info(f"Target: up to {MAX_BACKFILL_ARTICLES} articles | 12-month window")
    logger.info("=" * 65)

    gemini_key = os.environ.get("GEMINI_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    dry_run = "--dry-run" in sys.argv or not (gemini_key and supabase_url and service_role_key)

    if dry_run:
        logger.info("DRY-RUN MODE — no DB writes")
    if not gemini_key:
        logger.error("GEMINI_API_KEY not set. Cannot classify. Exiting.")
        sys.exit(1)

    articles = fetch_all_articles()
    if not articles:
        logger.info("No articles fetched. Exiting.")
        return

    classified: List[Dict[str, Any]] = []
    logger.info(f"\nClassifying {len(articles)} articles...")

    for idx, art in enumerate(articles):
        pct = int((idx + 1) / len(articles) * 100)
        logger.info(f"[{idx+1}/{len(articles)} | {pct}%] {art['title'][:65]}")
        rec = classify_with_gemini(art, gemini_key)
        if rec:
            classified.append(rec)
            logger.info(f"  → ACCEPTED [{rec['category'][:30]}] {rec['district']}")
        else:
            logger.debug(f"  → Rejected")
        # Rate-limit Gemini calls
        time.sleep(GEMINI_CALL_DELAY)

    logger.info(f"\n{'='*65}")
    logger.info(f"Classification complete: {len(classified)}/{len(articles)} accepted")

    # Category breakdown
    from collections import Counter
    cat_counts = Counter(r["category"] for r in classified)
    for cat, cnt in sorted(cat_counts.items(), key=lambda x: -x[1]):
        logger.info(f"  {cat[:40]:<40} {cnt:>3} records")

    if classified:
        if not dry_run:
            logger.info("\nUpserting to Supabase...")
            success = upsert_batch(classified, supabase_url, service_role_key)
            logger.info(f"\n✓ Backfill complete: {success}/{len(classified)} records stored.")
        else:
            out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backfill_output.json')
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(classified, f, indent=2, ensure_ascii=False)
            logger.info(f"DRY-RUN: Output saved to {out_path}")


if __name__ == "__main__":
    main()
