import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "jobs-enterprise.json");
const STATUS = path.join(PUBLIC, "job-sync-status.json");

const SOURCES = [
  ["jobicy","https://jobicy.com/api/v2/remote-jobs?count=200"],
  ["remoteok","https://remoteok.com/api"],
  ["remotive","https://remotive.com/api/remote-jobs?limit=100"],
  ["arbeitnow","https://www.arbeitnow.com/api/job-board-api"]
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSource(name, url) {
  let last = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, {
        headers: {
          "user-agent": "GOO-JOBB-Enterprise/1.0",
          "accept": "application/json,application/rss+xml,text/xml,*/*"
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30000)
      });

      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return {
        name,
        url,
        ok: true,
        data: await r.text(),
        attempts: attempt
      };
    } catch (e) {
      last = String(e?.message || e);
      if (attempt < 3) await sleep(attempt * 1500);
    }
  }

  return {
    name,
    url,
    ok: false,
    error: last,
    attempts: 3,
    data: ""
  };
}

function clean(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function pickArray(data) {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    const candidates = [
      data.jobs,
      data.data,
      data.results,
      data.items,
      data.postings
    ];

    for (const value of candidates) {
      if (Array.isArray(value)) return value;
    }
  }

  return [];
}

function normalize(raw, source) {
  if (!raw || typeof raw !== "object") return null;

  const title = clean(
    raw.title || raw.position || raw.name || raw.job_title
  );

  const url = clean(
    raw.url || raw.job_url || raw.apply_url || raw.link
  );

  if (!title || !/^https?:\/\//i.test(url)) return null;

  const company = clean(
    raw.company ||
    raw.company_name ||
    raw.companyName ||
    raw.employer ||
    raw.organization,
    "Unknown company"
  );

  const location = clean(
    raw.location ||
    raw.locations ||
    raw.city ||
    raw.country,
    "Remote / Worldwide"
  );

  const category = clean(
    raw.category ||
    raw.industry ||
    raw.job_category ||
    raw.tags,
    "General"
  );

  const date = clean(
    raw.date ||
    raw.publication_date ||
    raw.published_at ||
    raw.created_at ||
    raw.created ||
    new Date().toISOString()
  );

  const description = clean(
    raw.description ||
    raw.content ||
    raw.summary,
    ""
  );

  const key = [
    title.toLowerCase(),
    company.toLowerCase(),
    url.toLowerCase()
  ].join("|");

  return {
    id: Buffer.from(key).toString("base64url").slice(0, 80),
    title,
    company,
    location,
    category,
    source,
    url,
    date,
    description
  };
}

async function main() {
  await fs.mkdir(PUBLIC, { recursive: true });

  const started = Date.now();

  const results = [];

  for (let i = 0; i < SOURCES.length; i += 2) {
    const batch = SOURCES.slice(i, i + 2);
    results.push(...await Promise.all(batch.map(([n, u]) => fetchSource(n, u))));
  }

  const jobs = [];
  const seen = new Set();

  for (const result of results) {
    if (!result.ok) continue;

    try {
      const parsed = JSON.parse(result.data);
      const list = pickArray(parsed);

      for (const raw of list) {
        const job = normalize(raw, result.name);
        if (!job) continue;
        if (seen.has(job.id)) continue;

        seen.add(job.id);
        jobs.push(job);
      }
    } catch {
      continue;
    }
  }

  jobs.sort((a, b) => {
    const aa = Date.parse(a.date) || 0;
    const bb = Date.parse(b.date) || 0;
    return bb - aa;
  });

  const status = {
    version: 1,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    realJobs: jobs.length,
    sources: results.length,
    healthySources: results.filter(x => x.ok).length,
    failedSources: results.filter(x => !x.ok).length,
    sourceHealth: results.map(x => ({
      name: x.name,
      url: x.url,
      ok: x.ok,
      attempts: x.attempts,
      error: x.error || null
    }))
  };

  await fs.writeFile(
    OUT,
    JSON.stringify({
      version: 1,
      generatedAt: status.generatedAt,
      count: jobs.length,
      jobs
    })
  );

  await fs.writeFile(
    STATUS,
    JSON.stringify(status, null, 2)
  );

  console.log("");
  console.log("======================================");
  console.log(" GOO-JOBB ENTERPRISE ENGINE");
  console.log("======================================");
  console.log(`REAL JOBS:       ${jobs.length}`);
  console.log(`SOURCES:         ${results.length}`);
  console.log(`HEALTHY:         ${status.healthySources}`);
  console.log(`FAILED:          ${status.failedSources}`);
  console.log(`TIME:            ${status.durationMs} ms`);
  console.log("======================================");

  if (jobs.length === 0) {
    console.error("NO LIVE JOBS RETURNED - DEPLOYMENT DATA NOT TRUSTED");
    process.exitCode = 2;
    return;
  }
}

main().catch(error => {
  console.error("ENGINE ERROR:", error?.stack || error);
  process.exitCode = 1;
});
