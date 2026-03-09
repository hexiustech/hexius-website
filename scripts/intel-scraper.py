#!/usr/bin/env python3
"""
hexius_scraper.py
-----------------
Fetches live cybersecurity intel and writes threat_feed.json.
Designed to be executed by an n8n Execute Command node.

Sources:
  - NVD / NIST CVE API   (CVSS >= 8.0, last 7 days)
  - CISA KEV feed        (latest known exploited vulns)
  - BleepingComputer RSS (recent breach/attack news)
  - HIBP public counter  (total breach count)
  - Static Hexius items  (service value props, always included)

Environment variables:
  HEXIUS_OUTPUT   path to write threat_feed.json (default: ./threat_feed.json)
  HIBP_API_KEY    optional HIBP v3 API key

Usage (called by n8n Execute Command node):
  python3 /opt/hexius/hexius_scraper.py
"""

import json
import os
import logging
import requests
import feedparser
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────────

OUTPUT_PATH       = Path(os.getenv("HEXIUS_OUTPUT", "./threat_feed.json"))
MAX_CVE           = 3
MAX_CISA          = 2
MAX_NEWS          = 3
CVSS_MIN          = 8.0
CVE_LOOKBACK_DAYS = 7
REQUEST_TIMEOUT   = 12
HIBP_API_KEY      = os.getenv("HIBP_API_KEY", "")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("hexius-scraper")

# ── Static items — always included ─────────────────────────────────────────────
# Hexius value props + evergreen stats. Review/update annually.

STATIC_ITEMS = [
    {"icon": "ok",     "text": "Avg TTX exercise reduces IR time by 40%",                         "source": "static", "category": "hexius"},
    {"icon": "ok",     "text": "OWASP Top 10 covers 90% of web app vulns — our pentest goes further", "source": "static", "category": "hexius"},
    {"icon": "accent", "text": "Average breach cost: $4.88M USD — IBM 2024",                      "source": "ibm",    "category": "stat"},
    {"icon": "accent", "text": "83% of breaches involve a human element — Verizon DBIR 2024",     "source": "verizon","category": "stat"},
    {"icon": "warn",   "text": "74% of orgs lack a tested incident response plan",                 "source": "static", "category": "stat"},
    {"icon": "accent", "text": "Mean time to identify a breach: 194 days (industry avg)",         "source": "ibm",    "category": "stat"},
    {"icon": "warn",   "text": "60% of SMEs close within 6 months of a cyberattack",              "source": "static", "category": "stat"},
    {"icon": "accent", "text": "Phishing accounts for 36% of all data breaches",                  "source": "verizon","category": "stat"},
    {"icon": "warn",   "text": "Only 35% of employees receive regular security training",          "source": "static", "category": "stat"},
    {"icon": "sim",    "text": "Supply chain attacks up 742% since 2019",                         "source": "static", "category": "stat"},
]

# ── Helpers ────────────────────────────────────────────────────────────────────

def safe_get(url, **kwargs):
    try:
        r = requests.get(url, timeout=REQUEST_TIMEOUT, **kwargs)
        r.raise_for_status()
        return r
    except Exception as e:
        log.warning(f"fetch failed [{url[:60]}…]: {e}")
        return None

def nvd_severity(score):
    if score >= 9.0: return "CRITICAL"
    if score >= 7.0: return "HIGH"
    return "MEDIUM"

# ── NVD CVE API ────────────────────────────────────────────────────────────────

def fetch_nvd_cves():
    items = []
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=CVE_LOOKBACK_DAYS)).strftime("%Y-%m-%dT00:00:00.000")
    end   = now.strftime("%Y-%m-%dT%H:%M:%S.000")

    url = (
        "https://services.nvd.nist.gov/rest/json/cves/2.0"
        f"?pubStartDate={start}&pubEndDate={end}"
        "&cvssV3SeverityV2=CRITICAL&resultsPerPage=20"
    )

    resp = safe_get(url, headers={"Accept": "application/json"})
    if not resp:
        return items

    try:
        vulns = resp.json().get("vulnerabilities", [])
    except Exception as e:
        log.warning(f"NVD parse error: {e}")
        return items

    for v in vulns:
        cve = v.get("cve", {})
        cve_id = cve.get("id", "CVE-????-????")

        score = None
        for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
            mlist = cve.get("metrics", {}).get(key, [])
            if mlist:
                score = mlist[0].get("cvssData", {}).get("baseScore")
                break

        if score is None or float(score) < CVSS_MIN:
            continue

        descs = cve.get("descriptions", [])
        desc  = next((d["value"] for d in descs if d.get("lang") == "en"), "")
        desc_short = (desc[:75] + "…") if len(desc) > 75 else desc

        items.append({
            "icon": "warn",
            "text": f"{cve_id} — CVSS {score} — ",
            "highlight": nvd_severity(float(score)),
            "subtext": desc_short,
            "source": "nvd",
            "category": "cve",
        })

        if len(items) >= MAX_CVE:
            break

    log.info(f"NVD: {len(items)} CVEs")
    return items

# ── CISA KEV ───────────────────────────────────────────────────────────────────

def fetch_cisa_kev():
    items = []
    url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

    resp = safe_get(url)
    if not resp:
        return items

    try:
        vulns = resp.json().get("vulnerabilities", [])
        vulns = sorted(vulns, key=lambda x: x.get("dateAdded", ""), reverse=True)
    except Exception as e:
        log.warning(f"CISA parse error: {e}")
        return items

    for v in vulns[:MAX_CISA]:
        cve_id  = v.get("cveID", "")
        vendor  = v.get("vendorProject", "")
        product = v.get("product", "")
        items.append({
            "icon": "warn",
            "text": f"CISA KEV: {cve_id} actively exploited — {vendor} {product}",
            "highlight": "EXPLOITED",
            "source": "cisa",
            "category": "cve",
        })

    log.info(f"CISA KEV: {len(items)} entries")
    return items

# ── BleepingComputer RSS ───────────────────────────────────────────────────────

KEYWORDS = [
    "breach", "ransomware", "phishing", "exploit", "vulnerability",
    "attack", "leak", "malware", "zero-day", "critical", "APT",
    "supply chain", "data theft", "social engineering",
]

def fetch_bleepingcomputer():
    items = []
    try:
        feed    = feedparser.parse("https://www.bleepingcomputer.com/feed/")
        entries = feed.entries[:MAX_NEWS * 4]
    except Exception as e:
        log.warning(f"BleepingComputer RSS error: {e}")
        return items

    for entry in entries:
        title = entry.get("title", "").strip()
        if not title:
            continue
        if not any(kw.lower() in title.lower() for kw in KEYWORDS):
            continue

        items.append({
            "icon": "sim",
            "text": (title[:88] + "…") if len(title) > 88 else title,
            "source": "bleepingcomputer",
            "category": "news",
            "url": entry.get("link", ""),
        })

        if len(items) >= MAX_NEWS:
            break

    log.info(f"BleepingComputer: {len(items)} items")
    return items

# ── HIBP breach count ─────────────────────────────────────────────────────────

def fetch_hibp_count():
    url     = "https://haveibeenpwned.com/api/v3/breaches"
    headers = {"hibp-api-key": HIBP_API_KEY} if HIBP_API_KEY else {}

    resp = safe_get(url, headers=headers)
    if not resp:
        return []

    try:
        breaches    = resp.json()
        count       = len(breaches)
        latest      = sorted(breaches, key=lambda x: x.get("BreachDate", ""), reverse=True)
        latest_name = latest[0].get("Name", "") if latest else ""
        latest_ct   = f"{latest[0].get('PwnCount', 0):,}" if latest else ""
    except Exception as e:
        log.warning(f"HIBP parse error: {e}")
        return []

    log.info(f"HIBP: {count} breaches indexed")
    return [{
        "icon": "accent",
        "text": f"HIBP: {count} public breaches indexed — latest: {latest_name} ({latest_ct} accounts)",
        "source": "hibp",
        "category": "stat",
    }]

# ── Build & write ─────────────────────────────────────────────────────────────

def main():
    log.info("Hexius scraper starting…")
    now = datetime.now(timezone.utc)

    live = []
    live += fetch_nvd_cves()
    live += fetch_cisa_kev()
    live += fetch_bleepingcomputer()
    live += fetch_hibp_count()

    # Deduplicate on text prefix
    seen, deduped = set(), []
    for item in live:
        key = item["text"][:40]
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    feed = {
        "generated_at":  now.isoformat(),
        "expires_at":    (now + timedelta(hours=6)).isoformat(),
        "live_count":    len(deduped),
        "static_count":  len(STATIC_ITEMS),
        "items":         deduped + STATIC_ITEMS,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(feed, ensure_ascii=False, indent=2))
    log.info(f"Written {len(feed['items'])} items → {OUTPUT_PATH}")

    # stdout for n8n to capture directly
    print(json.dumps(feed, ensure_ascii=False))

if __name__ == "__main__":
    main()
