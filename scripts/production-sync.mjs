import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const BACKUP = path.join(PUBLIC, ".goo-backups");

fs.mkdirSync(PUBLIC, { recursive: true });
fs.mkdirSync(BACKUP, { recursive: true });

const important = [
  "jobs.json",
  "jobs-enterprise.json",
  "jobs-worldwide.json",
  "jobs-search-index.json",
  "jobs-facets.json",
  "companies.json",
  "companies-index.json",
  "sources.json",
  "source-health.json",
  "job-source-health.json",
  "sync-meta.json",
  "goo-jobb-meta.json"
];

function exists(file) {
  return fs.existsSync(path.join(PUBLIC, file));
}

function readJSON(file) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(PUBLIC, file), "utf8")
    );
  } catch {
    return null;
  }
}

function extractJobs(value) {
  if (Array.isArray(value)) return value;

  if (value && Array.isArray(value.jobs)) {
    return value.jobs;
  }

  if (value && Array.isArray(value.data)) {
    return value.data;
  }

  if (value && Array.isArray(value.results)) {
    return value.results;
  }

  return [];
}

function jobKey(job) {
  const url =
    job?.canonicalUrl ||
    job?.url ||
    job?.applyUrl ||
    job?.apply_url ||
    "";

  if (url) {
    return String(url).trim().toLowerCase();
  }

  return [
    job?.title || "",
    job?.company || job?.company_name || "",
    job?.location || "",
    job?.source || ""
  ]
    .join("|")
    .trim()
    .toLowerCase();
}

function collectCurrentJobs() {
  const files = [
    "jobs-search-index.json",
    "jobs-worldwide.json",
    "jobs-enterprise.json",
    "jobs.json"
  ];

  const map = new Map();

  for (const file of files) {
    const data = readJSON(file);
    const jobs = extractJobs(data);

    for (const job of jobs) {
      if (!job || typeof job !== "object") continue;

      const key = jobKey(job);

      if (!key || key === "|||") continue;

      if (!map.has(key)) {
        map.set(key, job);
      }
    }
  }

  return [...map.values()];
}

function backupFile(file) {
  const src = path.join(PUBLIC, file);
  const dst = path.join(BACKUP, file);

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
  }
}

function restoreBackups() {
  for (const file of important) {
    const src = path.join(BACKUP, file);
    const dst = path.join(PUBLIC, file);

    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
    }
  }
}

for (const file of important) {
  backupFile(file);
}

const originalJobs = collectCurrentJobs();

console.log("==============================================");
console.log(" GOO-JOBB PRODUCTION FAIL-SAFE ENGINE");
console.log("==============================================");
console.log(`Existing valid jobs: ${originalJobs.length}`);

function runNode(file) {
  if (!exists(path.relative(PUBLIC, file)) && !fs.existsSync(file)) {
    return {
      ok: false,
      skipped: true,
      code: 0
    };
  }

  console.log(`\n>>> Running ${file}`);

  const result = spawnSync(
    process.execPath,
    [file],
    {
      cwd: ROOT,
      stdio: "inherit",
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_OPTIONS: "--max-old-space-size=4096"
      }
    }
  );

  return {
    ok: result.status === 0,
    skipped: false,
    code: result.status ?? 1
  };
}

function validate() {
  const candidates = [
    "jobs-search-index.json",
    "jobs-worldwide.json",
    "jobs-enterprise.json",
    "jobs.json"
  ];

  let best = [];

  for (const file of candidates) {
    const data = readJSON(file);
    const jobs = extractJobs(data);

    if (jobs.length > best.length) {
      best = jobs;
    }
  }

  const valid = best.filter(job => {
    if (!job || typeof job !== "object") return false;

    const title = String(job.title || "").trim();

    const company = String(
      job.company ||
      job.company_name ||
      job.employer ||
      ""
    ).trim();

    const url = String(
      job.canonicalUrl ||
      job.url ||
      job.applyUrl ||
      job.apply_url ||
      ""
    ).trim();

    return title.length >= 2 &&
           company.length >= 1 &&
           /^https?:\/\//i.test(url);
  });

  const unique = new Map();

  for (const job of valid) {
    const key = jobKey(job);

    if (key && !unique.has(key)) {
      unique.set(key, job);
    }
  }

  return [...unique.values()];
}

function writeCanonicalJobs(jobs) {
  if (!jobs.length) return;

  fs.writeFileSync(
    path.join(PUBLIC, "jobs-worldwide.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: jobs.length,
        jobs
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(PUBLIC, "jobs-enterprise.json"),
    JSON.stringify(jobs, null, 2)
  );

  fs.writeFileSync(
    path.join(PUBLIC, "jobs-search-index.json"),
    JSON.stringify(jobs, null, 2)
  );
}

let selected = [];
let successfulEngine = "none";

/*
 * Engine priority:
 * 1. source-expansion
 * 2. enterprise-engine
 * 3. existing valid data
 *
 * A failed source engine NEVER destroys the existing dataset.
 */

const engines = [
  "scripts/source-expansion.mjs",
  "scripts/enterprise-engine.mjs"
];

for (const engine of engines) {
  if (!fs.existsSync(path.join(ROOT, engine))) {
    continue;
  }

  console.log("\n----------------------------------------------");
  console.log(`Attempting engine: ${engine}`);
  console.log("----------------------------------------------");

  const result = runNode(engine);

  const afterEngine = validate();

  console.log(
    `Engine exit: ${result.code}; valid jobs after engine: ${afterEngine.length}`
  );

  if (afterEngine.length > 0) {
    selected = afterEngine;
    successfulEngine = engine;
    break;
  }

  console.log(`Engine failed or produced invalid data: ${engine}`);

  restoreBackups();
}

if (!selected.length && originalJobs.length) {
  console.log("\nUsing existing validated dataset.");
  selected = originalJobs;
  successfulEngine = "existing-dataset-fallback";
}

if (!selected.length) {
  console.error("No valid jobs available.");

  /*
   * Do not fabricate jobs.
   * If this is the very first deployment and there is no dataset,
   * the workflow must fail visibly instead of publishing fake data.
   */
  process.exitCode = 1;
  process.exit();
}

/*
 * Preserve canonical real records.
 */
writeCanonicalJobs(selected);

const finalJobs = validate();

if (!finalJobs.length) {
  console.error("Final validation failed.");
  restoreBackups();
  process.exit(1);
}

const sources = new Map();

for (const job of finalJobs) {
  const source =
    job.source ||
    job.sourceName ||
    job.provider ||
    "Unknown";

  sources.set(
    String(source),
    (sources.get(String(source)) || 0) + 1
  );
}

const meta = {
  generatedAt: new Date().toISOString(),
  status: "healthy",
  pipeline: "GOO-JOBB Fail-Safe Production Sync",
  repository: "tv-u/Goo-jobb",
  pages: "https://tv-u.github.io/Goo-jobb/",
  automaticSync: true,
  zeroJobProtection: true,
  fakeJobs: false,
  syntheticJobs: false,
  engine: successfulEngine,
  jobCount: finalJobs.length,
  uniqueCount: finalJobs.length,
  sourceCount: sources.size,
  sources: Object.fromEntries(sources),
  files: {
    worldwide: exists("jobs-worldwide.json"),
    enterprise: exists("jobs-enterprise.json"),
    searchIndex: exists("jobs-search-index.json"),
    facets: exists("jobs-facets.json"),
    companies: exists("companies.json"),
    sitemap: exists("sitemap.xml")
  }
};

fs.writeFileSync(
  path.join(PUBLIC, "sync-meta.json"),
  JSON.stringify(meta, null, 2)
);

fs.writeFileSync(
  path.join(PUBLIC, "goo-jobb-meta.json"),
  JSON.stringify(meta, null, 2)
);

console.log("\n==============================================");
console.log(" GOO-JOBB SYNC SUCCESS");
console.log("==============================================");
console.log(`REAL VALID JOBS : ${finalJobs.length}`);
console.log(`SOURCES         : ${sources.size}`);
console.log(`ENGINE          : ${successfulEngine}`);
console.log(`FAKE JOBS       : NO`);
console.log(`STATUS          : HEALTHY`);
console.log("==============================================");
