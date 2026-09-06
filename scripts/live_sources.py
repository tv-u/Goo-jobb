import json
import urllib.request
import ssl
import time
import re
from datetime import datetime, timezone

SOURCES = [
("Arbeitnow","json","https://www.arbeitnow.com/api/job-board-api"),
("Jobicy","json","https://jobicy.com/api/v2/remote-jobs"),
("Remote OK","json","https://remoteok.com/api"),
("Remotive","json","https://remotive.com/api/remote-jobs"),
("Himalayas","json","https://himalayas.app/jobs/api"),
("We Work Remotely","rss","https://weworkremotely.com/remote-jobs.rss"),
("Working Nomads","rss","https://www.workingnomads.com/jobs/rss"),
("Startup Jobs","rss","https://startup.jobs/feed"),
("Remote Jobs","rss","https://remotejobs.org/rss"),
("NoDesk","rss","https://nodesk.co/remote-jobs/rss/"),
("Daily Remote","rss","https://dailyremote.com/remote-jobs.rss"),
("Jobspresso","rss","https://jobspresso.co/feed/"),
("Remote4Me","rss","https://remote4me.com/feed/")
]

UA = "GOO-JOBB-Live-Job-Index/1.0"

def fetch(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/json,application/rss+xml,application/xml,text/xml,*/*"
        }
    )
    with urllib.request.urlopen(
        req,
        timeout=20,
        context=ssl.create_default_context()
    ) as r:
        return r.status, r.read(8000000)

def make_job(title, company, url, source, raw=None):
    raw = raw or {}
    if not title or not url:
        return None

    return {
        "id": str(raw.get("id") or raw.get("slug") or url),
        "title": str(title).strip(),
        "company": str(company or "").strip(),
        "url": str(url).strip(),
        "apply_url": str(
            raw.get("apply_url")
            or raw.get("application_url")
            or url
        ).strip(),
        "location": str(
            raw.get("location")
            or raw.get("candidate_required_location")
            or "Worldwide"
        ).strip(),
        "source": source,
        "description": str(
            raw.get("description")
            or raw.get("job_description")
            or ""
        ),
        "remote": bool(
            raw.get("remote")
            or "remote" in str(raw.get("location","")).lower()
        )
    }

def load_existing():
    try:
        with open("jobs-worldwide.json", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, list):
            return data

        if isinstance(data, dict):
            return data.get("jobs") or data.get("items") or []

    except Exception:
        return []

    return []

def parse_json(data, source):
    result = []

    if isinstance(data, list):
        arr = data
    elif isinstance(data, dict):
        arr = (
            data.get("jobs")
            or data.get("data")
            or data.get("items")
            or []
        )
    else:
        arr = []

    for item in arr:
        if not isinstance(item, dict):
            continue

        title = item.get("title") or item.get("name")
        company = (
            item.get("company_name")
            or item.get("company")
            or item.get("organization")
        )
        url = (
            item.get("url")
            or item.get("job_url")
            or item.get("apply_url")
            or item.get("application_url")
        )

        job = make_job(title, company, url, source, item)

        if job:
            result.append(job)

    return result

def parse_rss(raw, source):
    text = raw.decode("utf-8", "ignore")
    result = []

    for item in re.findall(r"<item[\s\S]*?</item>", text, re.I):
        title_match = re.search(
            r"<title[^>]*>(.*?)</title>",
            item,
            re.I | re.S
        )

        link_match = re.search(
            r"<link[^>]*>(.*?)</link>",
            item,
            re.I | re.S
        )

        if not title_match or not link_match:
            continue

        title = re.sub(
            r"<[^>]+>",
            " ",
            title_match.group(1)
        ).strip()

        url = re.sub(
            r"<[^>]+>",
            " ",
            link_match.group(1)
        ).strip()

        job = make_job(title, "", url, source)

        if job:
            result.append(job)

    return result

def main():
    existing = load_existing()
    combined = list(existing)
    health = []

    print("EXISTING JOBS:", len(existing))
    print("=" * 60)

    for name, kind, url in SOURCES:
        started = time.time()

        try:
            status, raw = fetch(url)

            if kind == "json":
                jobs = parse_json(
                    json.loads(raw),
                    name
                )
            else:
                jobs = parse_rss(raw, name)

            combined.extend(jobs)

            health.append({
                "name": name,
                "endpoint": url,
                "type": kind,
                "status": "LIVE",
                "http": status,
                "jobs_seen": len(jobs),
                "latency_ms": round(
                    (time.time() - started) * 1000
                )
            })

            print(
                "LIVE:",
                name,
                "| jobs:",
                len(jobs),
                "| HTTP:",
                status
            )

        except Exception as exc:
            health.append({
                "name": name,
                "endpoint": url,
                "type": kind,
                "status": "DEGRADED",
                "jobs_seen": 0,
                "error": str(exc)[:300],
                "latency_ms": round(
                    (time.time() - started) * 1000
                )
            })

            print(
                "DEGRADED:",
                name,
                "|",
                str(exc)[:100]
            )

    unique = []
    seen = set()

    for job in combined:
        if not isinstance(job, dict):
            continue

        key = str(
            job.get("id")
            or job.get("url")
            or (
                str(job.get("title",""))
                + "|"
                + str(job.get("company",""))
            )
        ).strip().lower()

        if not key or key in seen:
            continue

        seen.add(key)
        unique.append(job)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(unique),
        "jobs": unique
    }

    with open(
        "jobs-worldwide.json",
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            payload,
            f,
            ensure_ascii=False
        )

    live = sum(
        1 for x in health
        if x["status"] == "LIVE"
    )

    degraded = len(health) - live

    with open(
        "data/source-health.json",
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            {
                "generated_at": datetime.now(
                    timezone.utc
                ).isoformat(),
                "configured": len(SOURCES),
                "live": live,
                "degraded": degraded,
                "total_jobs": len(unique),
                "sources": health
            },
            f,
            ensure_ascii=False,
            indent=2
        )

    print("=" * 60)
    print("FINAL JOBS:", len(unique))
    print("LIVE SOURCES:", live)
    print("DEGRADED SOURCES:", degraded)
    print("=" * 60)

if __name__ == "__main__":
    main()
