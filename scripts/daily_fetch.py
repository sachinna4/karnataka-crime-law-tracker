#!/usr/bin/env python3
"""
Karnataka Crime & Law Tracker - Daily Automated Ingestion Pipeline (v2)
=======================================================================
Runs every day at 07:00 IST via Windows Task Scheduler.
  - Polls 10+ targeted RSS / Google News feeds for Karnataka crime news
  - Classifies each article into 10 institutional categories via Gemini
  - Processes up to 60 articles per daily run (was 15)
  - Upserts idempotently to Supabase karnataka_cases table

Run manually:
    python scripts/daily_fetch.py
Dry-run (no DB write):
    python scripts/daily_fetch.py --dry-run
"""

import os
import sys
import json
import hashlib
import difflib
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

import feedparser
import requests
from dateutil import parser as date_parser

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("KA_Crime_Ingestion")

# ── 10 Institutional Categories ────────────────────────────────────────────────
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

# ── RSS Feeds (10 targeted sources) ───────────────────────────────────────────
RSS_FEEDS = [
    # Google News targeted queries - one per crime category for better coverage
    {
        "name": "GNews: Murder Karnataka",
        "url": "https://news.google.com/rss/search?q=Karnataka+murder+arrested+when:3d&hl=en-IN&gl=IN&ceid=IN:en",
        "source": "Google News"
    },
    {
        "name": "GNews: Rape POCSO Karnataka",
        "url": "https://news.google.com/rss/search?q=Karnataka+rape+OR+POCSO+accused+arrested+when:3d&hl=en-IN&gl=IN&ceid=IN:en",
        "source": "Google News"
    },
    {
        "name": "GNews: Robbery Chain Snatching",
        "url": "https://news.google.com/rss/search?q=Karnataka+robbery+OR+%22chain+snatching%22+arrested+when:3d&hl=en-IN&gl=IN&ceid=IN:en",
        "source": "Google News"
    },
    {
        "name": "GNews: Burglary Theft Karnataka",
        "url": "https://news.google.com/rss/search?q=Karnataka+burglary+OR+theft+OR+%22motor+vehicle+theft%22+arrested+when:3d&hl=en-IN&gl=IN&ceid=IN:en",
        "source": "Google News"
    },
    {
        "name": "GNews: Dowry Domestic Violence",
        "url": "https://news.google.com/rss/search?q=Karnataka+dowry+death+OR+%22domestic+violence%22+FIR+when:3d&hl=en-IN&gl=IN&ceid=IN:en",
        "source": "Google News"
    },
    {
        "name": "GNews: Dacoity Rioting Karnataka",
        "url": "https://news.google.com/rss/search?q=Karnataka+dacoity+OR+rioting+OR+%22unlawful+assembly%22+when:3d&hl=en-IN&gl=IN&ceid=IN:en",
        "source": "Google News"
    },
    {
        "name": "GNews: Bengaluru Police FIR",
        "url": "https://news.google.com/rss/search?q=Bengaluru+police+FIR+OR+arrested+OR+crime+when:2d&hl=en-IN&gl=IN&ceid=IN:en",
        "source": "Google News"
    },
    {
        "name": "GNews: Karnataka Police Press Release",
        "url": "https://news.google.com/rss/search?q=%22Karnataka+Police%22+OR+%22Bengaluru+City+Police%22+arrested+crime+when:2d&hl=en-IN&gl=IN&ceid=IN:en",
        "source": "Karnataka State Police (KSP)"
    },
    # The Hindu Karnataka RSS
    {
        "name": "The Hindu Karnataka",
        "url": "https://www.thehindu.com/news/national/karnataka/feeder/default.rss",
        "source": "The Hindu"
    },
    # Deccan Herald Karnataka crime section
    {
        "name": "Deccan Herald Karnataka",
        "url": "https://www.deccanherald.com/india/karnataka/feed",
        "source": "Deccan Herald"
    },
]

# ── Per-day article limit ──────────────────────────────────────────────────────
MAX_ARTICLES_PER_RUN = 60


def generate_case_number(url: str, year: int) -> str:
    """Generate a deterministic incident reference: NEWS/{year}/{hash8}"""
    hash_str = hashlib.sha256(url.strip().encode('utf-8')).hexdigest()[:8].upper()
    return f"NEWS/{year}/{hash_str}"


def is_duplicate_title(candidate: str, existing_titles: List[str], threshold: float = 0.80) -> bool:
    """Check if title matches any existing title using fuzzy string matching."""
    cand_norm = candidate.lower().strip()
    for existing in existing_titles:
        ex_norm = existing.lower().strip()
        ratio = difflib.SequenceMatcher(None, cand_norm, ex_norm).ratio()
        if ratio >= threshold:
            return True
    return False


def fetch_rss_articles(lookback_hours: int = 36) -> List[Dict[str, Any]]:
    """Fetch and parse articles published within the lookback window."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)
    articles = []
    seen_urls: set = set()
    seen_titles: List[str] = []

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    for feed_info in RSS_FEEDS:
        logger.info(f"Fetching RSS feed: {feed_info['name']}")
        try:
            resp = requests.get(feed_info["url"], headers=headers, timeout=15)
            if resp.status_code != 200:
                logger.warning(f"Failed to fetch {feed_info['url']} (status {resp.status_code})")
                continue

            feed = feedparser.parse(resp.content)
            feed_count = 0
            for entry in feed.entries:
                link = getattr(entry, "link", "").strip()
                title = getattr(entry, "title", "").strip()
                summary = getattr(entry, "summary", "").strip()

                if not link or not title:
                    continue
                if link in seen_urls:
                    continue
                if is_duplicate_title(title, seen_titles):
                    logger.debug(f"Skipping fuzzy duplicate: {title}")
                    continue

                # Parse published date
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

                if pub_date < cutoff:
                    continue

                seen_urls.add(link)
                seen_titles.append(title)
                feed_count += 1

                articles.append({
                    "title": title,
                    "link": link,
                    "summary": summary,
                    "published_at": pub_date.isoformat(),
                    "source_name": feed_info["source"]
                })

            logger.info(f"  → {feed_count} new articles from {feed_info['name']}")
        except Exception as e:
            logger.error(f"Error fetching feed {feed_info['name']}: {e}")

    logger.info(f"Total deduplicated candidate articles: {len(articles)}")
    return articles


def classify_with_gemini(article: Dict[str, Any], api_key: str) -> Optional[Dict[str, Any]]:
    """
    Classify an article into one of the 10 institutional categories using Gemini.
    Returns structured data or None if rejected/unclassified.
    """
    prompt = f"""You are an institutional legal and crime classification analyst for the Karnataka Law & Order Tracker.
Analyze the following news item:

Title: {article['title']}
Summary: {article['summary']}
URL: {article['link']}

Rules:
1. Strictly classify into EXACTLY ONE of these 10 categories:
{json.dumps(PREDEFINED_CATEGORIES, indent=2)}
2. If NOT a Karnataka crime incident (politics, generic policy, international, accidents without criminal negligence), set "is_karnataka_crime": false.
3. If confidence < 0.70 or category unclear, set "is_karnataka_crime": false.
4. Extract Karnataka district if mentioned. Known districts:
{json.dumps(KARNATAKA_DISTRICTS)}
If unknown, default to "Bengaluru Urban".
5. Case status: default "Reported – Not Verified". Only use "Convicted", "FIR Registered" or "Charge Sheet Filed" if article explicitly states it.
6. Verification: always "unverified" for media articles, "source_confirmed" for police press releases.
7. Return ONLY valid JSON — no markdown, no commentary:
{{
  "is_karnataka_crime": true/false,
  "confidence": 0.0 - 1.0,
  "category": "exact category name",
  "case_name": "concise factual summary (max 100 chars)",
  "district": "valid Karnataka district",
  "case_date": "YYYY-MM-DD",
  "case_status": "one of the 5 valid statuses",
  "source_type": "police or news",
  "official_fir_number": "station name and Cr No if mentioned, else null",
  "cnr_number": "16-char CNR if court case mentioned, else null"
}}"""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "response_mime_type": "application/json"
            }
        }

        resp = requests.post(url, json=payload, timeout=25)
        if resp.status_code != 200:
            logger.warning(f"Gemini API {resp.status_code}: {resp.text[:200]}")
            return None

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return None

        content_parts = candidates[0].get("content", {}).get("parts", [])
        if not content_parts:
            return None

        text = content_parts[0].get("text", "").strip()
        parsed = json.loads(text)

        if not parsed.get("is_karnataka_crime", False):
            logger.debug(f"Rejected (not Karnataka crime): {article['title']}")
            return None

        category = parsed.get("category")
        if category not in PREDEFINED_CATEGORIES:
            logger.warning(f"Invalid category '{category}' — discarding")
            return None

        district = parsed.get("district", "Bengaluru Urban")
        if district not in KARNATAKA_DISTRICTS:
            district = "Bengaluru Urban"

        case_date = parsed.get("case_date")
        if not case_date:
            case_date = article["published_at"].split("T")[0]

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
        logger.error(f"Error classifying article: {e}")
        return None


def upsert_to_supabase(records: List[Dict[str, Any]], supabase_url: str, service_role_key: str):
    """Upsert validated records into Supabase PostgreSQL table via PostgREST."""
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
                logger.info(f"  ✓ Upserted: [{record['category'][:25]}] {record['case_name'][:60]}")
                success += 1
            else:
                logger.warning(f"  ✗ Upsert {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.error(f"Failed to upsert {record.get('case_number')}: {e}")
    logger.info(f"Upserted {success}/{len(records)} records successfully.")


def load_env_file():
    """Load configuration from root .env file if available."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(env_path):
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        k, v = k.strip(), v.strip()
                        if k and v and k not in os.environ:
                            os.environ[k] = v
            logger.info("Loaded credentials from .env")
        except Exception as e:
            logger.warning(f"Could not read .env: {e}")


def main():
    load_env_file()
    logger.info("=" * 60)
    logger.info("Karnataka Crime & Law Tracker — Daily Ingestion Pipeline v2")
    logger.info(f"Run timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')}")
    logger.info("=" * 60)

    gemini_key = os.environ.get("GEMINI_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    dry_run = "--dry-run" in sys.argv or not (gemini_key and supabase_url and service_role_key)

    if dry_run:
        logger.info("DRY-RUN MODE — no DB writes")

    articles = fetch_rss_articles(lookback_hours=36)
    if not articles:
        logger.info("No new articles found in target window. Exiting.")
        return

    classified_records = []
    if gemini_key:
        batch = articles[:MAX_ARTICLES_PER_RUN]
        logger.info(f"Classifying {len(batch)} articles (limit {MAX_ARTICLES_PER_RUN}/run)...")
        for idx, art in enumerate(batch):
            logger.info(f"[{idx+1}/{len(batch)}] {art['title'][:70]}")
            rec = classify_with_gemini(art, gemini_key)
            if rec:
                classified_records.append(rec)
    else:
        logger.info("GEMINI_API_KEY not configured — skipping classification.")

    logger.info(f"Classified {len(classified_records)} valid Karnataka crime incidents.")

    if classified_records:
        if not dry_run and supabase_url and service_role_key:
            logger.info("Upserting to Supabase...")
            upsert_to_supabase(classified_records, supabase_url, service_role_key)
        else:
            logger.info("DRY-RUN output:")
            print(json.dumps(classified_records, indent=2, ensure_ascii=False))

    logger.info("Pipeline completed.")


if __name__ == "__main__":
    main()
