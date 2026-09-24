import hashlib
import html
import json
import re
import time
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]

SOURCE_FILE = ROOT / "data/job-sources.json"
OUT_FILE = ROOT / "data/live-jobs.json"
HEALTH_FILE = ROOT / "data/job-source-health.json"

TIMEOUT = 30

USER_AGENT = (
    "GOO-JOBB-Live-Aggregator/3.0 "
    "(public-feed-reader; original-links-preserved)"
)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def clean(value):
    if value is None:
        return ""

    if isinstance(value, bool):
        return "true" if value else "false"

    if isinstance(value, (int, float)):
        return str(value)

    if isinstance(value, list):
        return ", ".join(
            clean(x)
            for x in value
            if clean(x)
        )

    if isinstance(value, dict):
        preferred = (
            "name",
            "value",
            "text",
            "title",
            "description",
            "url",
            "href"
        )

        for key in preferred:
            if key in value:
                result = clean(value[key])
                if result:
                    return result

        return ", ".join(
            clean(x)
            for x in value.values()
            if clean(x)
        )

    value = html.unescape(str(value))

    value = re.sub(
        r"\s+",
        " ",
        value
    )

    return value.strip()


def strip_html(value):
    value = html.unescape(value or "")

    value = re.sub(
        r"<script\b[^>]*>.*?</script>",
        " ",
        value,
        flags=re.I | re.S
    )

    value = re.sub(
        r"<style\b[^>]*>.*?</style>",
        " ",
        value,
        flags=re.I | re.S
    )

    value = re.sub(
        r"<[^>]+>",
        " ",
        value
    )

    return re.sub(
        r"\s+",
        " ",
        value
    ).strip()


def first(data, *keys):
    if not isinstance(data, dict):
        return ""

    for key in keys:
        if key not in data:
            continue

        value = clean(data[key])

        if value:
            return value

    return ""


def canonical_url(value):
    value = clean(value)

    if not value:
        return ""

    value = value.split("#", 1)[0]

    return value.rstrip("/")


def canonical_text(value):
    value = clean(value).lower()

    return re.sub(
        r"[^a-z0-9]+",
        " ",
        value
    ).strip()


def stable_id(source, title, company, url):
    raw = "|".join(
        [
            clean(source),
            clean(title),
            clean(company),
            canonical_url(url)
        ]
    ).lower()

    return hashlib.sha256(
        raw.encode(
            "utf-8",
            "ignore"
        )
    ).hexdigest()[:24]


def merge_key(job):
    url = canonical_url(
        job.get("url")
    )

    if url:
        return (
            "url",
            url
        )

    return (
        "text",
        canonical_text(
            job.get("title")
        ),
        canonical_text(
            job.get("company")
        )
    )


def request(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": (
                "application/json,"
                " application/rss+xml,"
                " application/xml,"
                " text/xml,"
                " */*"
            ),
            "Accept-Encoding": "identity"
        }
    )

    with urllib.request.urlopen(
        req,
        timeout=TIMEOUT
    ) as response:

        return (
            response.status,
            response.headers.get(
                "content-type",
                ""
            ),
            response.read()
        )


def parse_json(body):
    data = json.loads(
        body.decode(
            "utf-8",
            "replace"
        )
    )

    if isinstance(data, list):
        return data

    if not isinstance(data, dict):
        return []

    candidates = (
        "jobs",
        "data",
        "results",
        "items",
        "postings",
        "records",
        "listings"
    )

    for key in candidates:
        value = data.get(key)

        if isinstance(value, list):
            return value

        if isinstance(value, dict):

            for nested in candidates:

                nested_value = value.get(
                    nested
                )

                if isinstance(
                    nested_value,
                    list
                ):
                    return nested_value

    return []


def xml_local_name(tag):
    return tag.rsplit(
        "}",
        1
    )[-1].lower()


def xml_text(element):
    if element is None:
        return ""

    return clean(
        "".join(
            element.itertext()
        )
    )


def parse_rss(body):
    root = ET.fromstring(
        body.decode(
            "utf-8",
            "replace"
        )
    )

    jobs = []

    for item in root.iter():

        if xml_local_name(
            item.tag
        ) not in {
            "item",
            "entry"
        }:
            continue

        row = {}

        for child in list(item):

            key = xml_local_name(
                child.tag
            )

            value = xml_text(
                child
            )

            if key == "link":

                value = (
                    child.attrib.get(
                        "href",
                        ""
                    )
                    or value
                )

            if key in {
                "encoded",
                "content"
            }:
                if value:
                    row.setdefault(
                        "description",
                        value
                    )
            else:
                row[key] = value

        if row.get(
            "title"
        ) and row.get(
            "link"
        ):
            jobs.append(row)

    return jobs


def normalize(
    source,
    source_cfg,
    raw
):
    if not isinstance(
        raw,
        dict
    ):
        return None

    title = first(
        raw,
        "title",
        "position",
        "jobTitle",
        "job_title",
        "name"
    )

    company = first(
        raw,
        "company_name",
        "company",
        "companyName",
        "organization",
        "employer",
        "hiringOrganization",
        "creator",
        "author"
    )

    url = first(
        raw,
        "url",
        "job_url",
        "jobUrl",
        "apply_url",
        "applyUrl",
        "link",
        "href",
        "guid"
    )

    description = first(
        raw,
        "description",
        "content",
        "encoded",
        "jobDescription",
        "job_description",
        "descriptionHtml",
        "body",
        "details",
        "summary"
    )

    location = first(
        raw,
        "location",
        "candidate_required_location",
        "jobLocation",
        "job_location",
        "region",
        "city",
        "country"
    )

    salary = first(
        raw,
        "salary",
        "salaryRange",
        "salary_range",
        "compensation",
        "pay",
        "payRange",
        "baseSalary"
    )

    date_posted = first(
        raw,
        "publication_date",
        "date_posted",
        "datePosted",
        "postedDate",
        "publishedAt",
        "createdAt",
        "date",
        "pubDate",
        "published",
        "updated"
    )

    employment_type = first(
        raw,
        "job_type",
        "jobType",
        "employmentType",
        "employment_type",
        "type"
    )

    remote = first(
        raw,
        "remote",
        "workplaceType",
        "workplace_type",
        "remoteType"
    )

    skills = first(
        raw,
        "tags",
        "skills",
        "keywords",
        "category",
        "categories"
    )

    if not title or not url:
        return None

    url = canonical_url(url)

    return {
        "id": stable_id(
            source,
            title,
            company,
            url
        ),

        "source": source,

        "sourceId": source_cfg["id"],

        "networkGroup": source_cfg.get(
            "networkGroup",
            source_cfg["id"]
        ),

        "sourceUrl": source_cfg["url"],

        "sourceAttribution": source_cfg.get(
            "attribution",
            source
        ),

        "title": clean(title),

        "company": clean(company),

        "location": clean(location),

        "salary": clean(salary),

        "description": clean(description),

        "descriptionText": strip_html(
            description
        ),

        "employmentType": clean(
            employment_type
        ),

        "remote": clean(remote),

        "skills": clean(skills),

        "datePosted": clean(
            date_posted
        ),

        "url": url,

        "originalApplyUrl": url,

        "lastSyncedAt": now_iso(),

        "live": True
    }


def load_previous():
    if not OUT_FILE.exists():
        return []

    try:
        data = json.loads(
            OUT_FILE.read_text(
                encoding="utf-8"
            )
        )

        jobs = data.get(
            "jobs",
            []
        )

        if not isinstance(
            jobs,
            list
        ):
            return []

        return [
            job
            for job in jobs
            if isinstance(
                job,
                dict
            )
        ]

    except Exception as error:

        print(
            "⚠️ Previous dataset ignored:",
            error
        )

        return []


def source_jobs_map(jobs):
    result = {}

    for job in jobs:

        source_id = job.get(
            "sourceId"
        )

        if not source_id:
            continue

        result.setdefault(
            source_id,
            []
        ).append(job)

    return result


def job_quality(job):
    fields = (
        "company",
        "location",
        "salary",
        "descriptionText",
        "employmentType",
        "skills",
        "datePosted"
    )

    return sum(
        bool(job.get(field))
        for field in fields
    )


def fetch_source(source):
    started = time.time()

    try:

        status, content_type, body = request(
            source["url"]
        )

        if not 200 <= status < 300:
            raise RuntimeError(
                f"HTTP {status}"
            )

        if source["type"] == "rss":
            rows = parse_rss(
                body
            )
        else:
            rows = parse_json(
                body
            )

        jobs = []

        limit = 10000

        for raw in rows[:limit]:

            job = normalize(
                source["name"],
                source,
                raw
            )

            if job:
                jobs.append(job)

        return {
            "id": source["id"],
            "source": source["name"],
            "networkGroup": source.get(
                "networkGroup",
                source["id"]
            ),
            "url": source["url"],
            "ok": True,
            "httpStatus": status,
            "count": len(jobs),
            "durationMs": round(
                (
                    time.time()
                    - started
                ) * 1000
            ),
            "jobs": jobs
        }

    except Exception as error:

        return {
            "id": source["id"],
            "source": source["name"],
            "networkGroup": source.get(
                "networkGroup",
                source["id"]
            ),
            "url": source["url"],
            "ok": False,
            "httpStatus": None,
            "count": 0,
            "durationMs": round(
                (
                    time.time()
                    - started
                ) * 1000
            ),
            "error": str(error)[:500],
            "jobs": []
        }


def parse_date(value):
    if not value:
        return None

    value = str(value).strip()

    try:

        normalized = value.replace(
            "Z",
            "+00:00"
        )

        parsed = datetime.fromisoformat(
            normalized
        )

        if parsed.tzinfo is None:
            parsed = parsed.replace(
                tzinfo=timezone.utc
            )

        return parsed.astimezone(
            timezone.utc
        )

    except Exception:
        return None


def main():

    config = json.loads(
        SOURCE_FILE.read_text(
            encoding="utf-8"
        )
    )

    sources = [
        source
        for source in config.get(
            "sources",
            []
        )
        if source.get(
            "enabled"
        ) is True
    ]

    policy = config.get(
        "policy",
        {}
    )

    previous = load_previous()

    previous_by_source = source_jobs_map(
        previous
    )

    unique = {}

    health = []

    successful_source_ids = set()

    for source in sources:

        result = fetch_source(
            source
        )

        health.append({
            key: value
            for key, value in result.items()
            if key != "jobs"
        })

        source_id = source["id"]

        if result["ok"]:
            successful_source_ids.add(
                source_id
            )

        for job in result["jobs"]:

            key = merge_key(
                job
            )

            if key not in unique:
                unique[key] = job
                continue

            existing = unique[key]

            if job_quality(job) > job_quality(
                existing
            ):
                unique[key] = job

        print(
            f'{source["name"]}: '
            f'{"OK" if result["ok"] else "FAILED"} '
            f'{result["count"]}'
        )

        time.sleep(0.20)

    # ========================================================
    # FAIL-SAFE:
    # If a source fails, retain its previous jobs.
    # If a source succeeds, use its current feed snapshot.
    # ========================================================

    if policy.get(
        "preserveOnSourceFailure",
        True
    ):

        for source_id, old_jobs in previous_by_source.items():

            if source_id in successful_source_ids:
                continue

            for job in old_jobs:

                key = merge_key(
                    job
                )

                if key not in unique:
                    preserved = dict(job)

                    preserved["live"] = False

                    preserved[
                        "preservedAfterSourceFailure"
                    ] = True

                    unique[key] = preserved

    jobs = list(
        unique.values()
    )

    max_age = int(
        policy.get(
            "maxAgeDays",
            60
        )
    )

    cutoff = (
        datetime.now(
            timezone.utc
        )
        - timedelta(
            days=max_age
        )
    )

    filtered = []

    for job in jobs:

        parsed = parse_date(
            job.get(
                "datePosted",
                ""
            )
        )

        if parsed is None:
            filtered.append(
                job
            )
            continue

        if parsed >= cutoff:
            filtered.append(
                job
            )

    filtered.sort(
        key=lambda job: (
            parse_date(
                job.get(
                    "datePosted",
                    ""
                )
            )
            or datetime.min.replace(
                tzinfo=timezone.utc
            )
        ),
        reverse=True
    )

    healthy = sum(
        1
        for item in health
        if item["ok"]
    )

    failed = (
        len(health)
        - healthy
    )

    if sources and healthy == 0:

        raise RuntimeError(
            "ALL configured sources failed. "
            "Existing dataset was not replaced."
        )

    network_groups = sorted(
        {
            job.get(
                "networkGroup",
                ""
            )
            for job in filtered
            if job.get(
                "networkGroup"
            )
        }
    )

    output = {
        "version": "3.0.0",

        "generatedAt": now_iso(),

        "sourceCount": len(
            sources
        ),

        "networkGroupCount": len(
            network_groups
        ),

        "healthySources": healthy,

        "failedSources": failed,

        "jobCount": len(
            filtered
        ),

        "jobs": filtered
    }

    OUT_FILE.write_text(
        json.dumps(
            output,
            ensure_ascii=False,
            separators=(
                ",",
                ":"
            )
        ),
        encoding="utf-8"
    )

    HEALTH_FILE.write_text(
        json.dumps(
            {
                "version": "3.0.0",
                "generatedAt": output[
                    "generatedAt"
                ],
                "sourceCount": len(
                    sources
                ),
                "healthySources": healthy,
                "failedSources": failed,
                "networkGroups": network_groups,
                "sources": health
            },
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print()
    print(
        "=================================================="
    )
    print(
        "GOO-JOBB LIVE SYNC COMPLETE"
    )
    print(
        "=================================================="
    )
    print(
        "Feed endpoints :", len(sources)
    )
    print(
        "Network groups :", len(network_groups)
    )
    print(
        "Healthy        :", healthy
    )
    print(
        "Failed         :", failed
    )
    print(
        "Live jobs      :", len(filtered)
    )
    print(
        "=================================================="
    )


if __name__ == "__main__":
    main()
