import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = process.cwd();

function run(file, args = []) {
  console.log(`\n>>> node ${file}`);
  const r = spawnSync(process.execPath, [file, ...args], {
    cwd: ROOT,
    stdio: "inherit",
    encoding: "utf8"
  });
  if (r.status !== 0) {
    throw new Error(`${file} failed with exit code ${r.status}`);
  }
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

console.log("======================================");
console.log(" GOO-JOBB PRODUCTION SYNC");
console.log("======================================");

const started = Date.now();

if (existsSync("scripts/source-expansion.mjs")) {
  run("scripts/source-expansion.mjs");
} else if (existsSync("scripts/enterprise-engine.mjs")) {
  run("scripts/enterprise-engine.mjs");
} else {
  throw new Error("No supported sync engine found.");
}

if (existsSync("scripts/build-enterprise-index.mjs")) {
  run("scripts/build-enterprise-index.mjs");
}

const jobs =
  readJson("public/jobs-search-index.json", []) ??
  readJson("public/jobs-enterprise.json", []) ??
  [];

const list = Array.isArray(jobs)
  ? jobs
  : Array.isArray(jobs.jobs)
    ? jobs.jobs
    : [];

if (!list.length) {
  throw new Error("ZERO JOBS — deployment blocked.");
}

const unique = new Set();
for (const job of list) {
  const key =
    job.url ||
    job.canonicalUrl ||
    `${job.title}|${job.company}|${job.location}`.toLowerCase();

  unique.add(String(key));
}

const meta = {
  generatedAt: new Date().toISOString(),
  jobCount: list.length,
  uniqueCount: unique.size,
  status: "healthy",
  pipeline: "GOO-JOBB Production Sync",
  repository: "tv-u/Goo-jobb",
  pages: "https://tv-u.github.io/Goo-jobb/",
  automaticSync: true,
  zeroJobProtection: true,
  indexBuilt: existsSync("public/jobs-search-index.json"),
  sitemapBuilt: existsSync("public/sitemap.xml")
};

writeFileSync(
  "public/sync-meta.json",
  JSON.stringify(meta, null, 2)
);

console.log("\n======================================");
console.log(` REAL JOBS:       ${list.length}`);
console.log(` UNIQUE JOBS:     ${unique.size}`);
console.log(` INDEX:           ${meta.indexBuilt ? "OK" : "MISSING"}`);
console.log(` SITEMAP:         ${meta.sitemapBuilt ? "OK" : "MISSING"}`);
console.log(` STATUS:          HEALTHY`);
console.log(` TIME:            ${Date.now() - started} ms`);
console.log("======================================");
