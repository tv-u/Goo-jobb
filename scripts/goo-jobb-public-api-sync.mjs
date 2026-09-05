import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");

const registry = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "scripts/goo-jobb-public-apis.json"),
    "utf8"
  )
);

const sleep = ms => new Promise(r => setTimeout(r, ms));

function clean(v) {
  return String(v ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(...v) {
  for (const x of v) {
    if (x !== undefined && x !== null && String(x).trim()) {
      return x;
    }
  }
  return "";
}

function arr(v) {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.data)) return v.data;
  if (v && Array.isArray(v.jobs)) return v.jobs;
  if (v && Array.isArray(v.results)) return v.results;
  if (v && Array.isArray(v.jobListings)) return v.jobListings;
  return [];
}

function normalize(raw, source) {
  const company =
    pick(
      raw.company?.name,
      raw.company_name,
      raw.companyName,
      raw.company,
      raw.employer?.name,
      raw.organization?.name
    );

  const title = pick(
    raw.title,
    raw.job_title,
    raw.position,
    raw.name
  );

  const url = pick(
    raw.apply_url,
    raw.applyUrl,
    raw.url,
    raw.job_url,
    raw.link,
    raw.jobUrl
  );

  if (!title || !url) return null;

  const location = pick(
    raw.location,
    raw.locations?.join?.(", "),
    raw.location_name,
    raw.geo,
    raw.country,
    raw.remote ? "Remote" : ""
  );

  const description = clean(
    pick(
      raw.description,
      raw.job_description,
      raw.content,
      raw.snippet
    )
  );

  const publishedAt = pick(
    raw.posted_at,
    raw.published_at,
    raw.publishedAt,
    raw.date,
    raw.created_at,
    raw.createdAt
  );

  const id = pick(
    raw.id,
    raw.job_id,
    raw.jobId,
    url
  );

  return {
    id: `${source.id}:${id}`,
    title: clean(title),
    company: clean(company || "Unknown Company"),
    location: clean(location || "Remote"),
    description,
    url,
    applyUrl: url,
    source: source.name,
    sourceId: source.id,
    sourceUrl: source.sourceUrl,
    attribution: source.attribution,
    publishedAt,
    salary: pick(
      raw.salary,
      raw.salary_text,
      raw.salaryText,
      raw.compensation
    ),
    type: pick(
      raw.type,
      raw.job_type,
      raw.employment_type,
      raw.employmentType
    ),
    remote: Boolean(
      raw.remote === true ||
      String(location).toLowerCase().includes("remote")
    ),
    tags: Array.isArray(raw.tags)
      ? raw.tags.map(clean).filter(Boolean).slice(0, 30)
      : []
  };
}

async function fetchJSON(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GOO-JOBB/1.0 (+https://tv-u.github.io/Goo-jobb/)",
        "Accept": "application/json,text/plain,*/*"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function canonical(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return String(url).trim().toLowerCase();
  }
}

const all = [];
const health = [];

for (const source of registry.connectors) {
  process.stdout.write(`LIVE ${source.name} ... `);

  try {
    const payload = await fetchJSON(source);
    const rows = arr(payload);

    const jobs = rows
      .map(x => normalize(x, source))
      .filter(Boolean);

    all.push(...jobs);

    health.push({
      id: source.id,
      name: source.name,
      status: "healthy",
      fetched: rows.length,
      accepted: jobs.length,
      checkedAt: new Date().toISOString()
    });

    console.log(`OK fetched=${rows.length} accepted=${jobs.length}`);
  } catch (error) {
    health.push({
      id: source.id,
      name: source.name,
      status: "failed",
      fetched: 0,
      accepted: 0,
      error: String(error.message || error),
      checkedAt: new Date().toISOString()
    });

    console.log(`FAILED ${error.message}`);
  }

  await sleep(250);
}

const seen = new Set();
const jobs = [];

for (const job of all) {
  const key = canonical(job.url);

  if (!key || seen.has(key)) continue;

  seen.add(key);
  jobs.push(job);
}

const report = {
  generatedAt: new Date().toISOString(),
  connectorCount: registry.connectors.length,
  healthySources: health.filter(x => x.status === "healthy").length,
  failedSources: health.filter(x => x.status === "failed").length,
  fetchedRecords: all.length,
  uniqueJobs: jobs.length,
  sources: health
};

fs.mkdirSync(PUBLIC, { recursive: true });

fs.writeFileSync(
  path.join(PUBLIC, "jobs-public-api.json"),
  JSON.stringify(jobs, null, 2)
);

fs.writeFileSync(
  path.join(PUBLIC, "public-api-health.json"),
  JSON.stringify(report, null, 2)
);

console.log("");
console.log("================================================");
console.log(`PUBLIC API CONNECTORS: ${registry.connectors.length}`);
console.log(`HEALTHY: ${report.healthySources}`);
console.log(`FAILED: ${report.failedSources}`);
console.log(`FETCHED: ${report.fetchedRecords}`);
console.log(`UNIQUE LIVE JOBS: ${report.uniqueJobs}`);
console.log("================================================");

if (!jobs.length) {
  throw new Error("No public API jobs were received.");
}
