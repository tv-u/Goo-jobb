import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const SITE = "https://tv-u.github.io/Goo-jobb";

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(PUBLIC, file), "utf8"));
  } catch {
    return [];
  }
}

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function text(v) {
  return String(v ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(v) {
  return text(v)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function canonical(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

const raw =
  readJSON("jobs-enterprise.json").length
    ? readJSON("jobs-enterprise.json")
    : readJSON("jobs-worldwide.json").length
      ? readJSON("jobs-worldwide.json")
      : readJSON("jobs.json");

if (!Array.isArray(raw) || !raw.length) {
  throw new Error("No jobs dataset found.");
}

const jobs = [];
const seen = new Set();

for (const j of raw) {
  const title = text(j.title || j.position || j.job_title);
  const company = text(j.company || j.companyName || j.employer);
  const location = text(j.location || "Remote");
  const url = text(j.applyUrl || j.apply_url || j.url || j.link);

  if (!title || !company || !url) continue;

  const key = canonical(url);

  if (seen.has(key)) continue;
  seen.add(key);

  const baseSlug =
    slug(`${title}-${company}-${location}`) ||
    slug(title) ||
    `job-${jobs.length + 1}`;

  jobs.push({
    ...j,
    title,
    company,
    location,
    url,
    slug: baseSlug,
    description: text(j.description || j.summary || `${title} at ${company}.`),
    source: text(j.source || "GOO-JOBB"),
    publishedAt: j.publishedAt || j.postedAt || j.datePosted || "",
    salary: text(j.salary || ""),
    type: text(j.type || j.employmentType || "")
  });
}

const usedSlugs = new Map();

function uniqueSlug(s) {
  const count = usedSlugs.get(s) || 0;
  usedSlugs.set(s, count + 1);
  return count ? `${s}-${count + 1}` : s;
}

const finalJobs = jobs.map(j => ({
  ...j,
  slug: uniqueSlug(j.slug)
}));

fs.rmSync(path.join(PUBLIC, "jobs"), { recursive: true, force: true });
fs.mkdirSync(path.join(PUBLIC, "jobs"), { recursive: true });

const urls = [];

function pageShell({
  title,
  description,
  canonicalUrl,
  body,
  jsonld = null,
  noindex = false
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description.slice(0, 300))}">
<meta name="robots" content="${noindex ? "noindex,follow" : "index,follow,max-image-preview:large"}">
<link rel="canonical" href="${esc(canonicalUrl)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description.slice(0, 300))}">
<meta property="og:url" content="${esc(canonicalUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description.slice(0, 300))}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
<style>
*{box-sizing:border-box}
body{margin:0;background:#070707;color:#eee;font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.65}
a{color:#72f5b1;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1100px;margin:auto;padding:24px}
header{padding:18px 0;border-bottom:1px solid #222}
.logo{font-size:24px;font-weight:800}
.card{background:#111;border:1px solid #252525;border-radius:16px;padding:24px;margin:18px 0}
h1{line-height:1.2}
h2{margin-top:28px}
.meta{color:#aaa}
.badge{display:inline-block;background:#191919;border:1px solid #303030;border-radius:999px;padding:5px 10px;margin:3px;font-size:13px}
.btn{display:inline-block;background:#00ff88;color:#000;padding:11px 18px;border-radius:10px;font-weight:800;margin:8px 8px 8px 0}
footer{border-top:1px solid #222;margin-top:50px;padding:30px 0;color:#999}
nav a{margin-right:14px}
</style>
</head>
<body>
<div class="wrap">
<header>
<div class="logo">GOO-JOBB</div>
<nav>
<a href="${SITE}/">Home</a>
<a href="${SITE}/search/">Search Jobs</a>
<a href="${SITE}/about/">About</a>
<a href="${SITE}/contact/">Contact</a>
</nav>
</header>
<main>${body}</main>
<footer>
<a href="${SITE}/about/">About</a> ·
<a href="${SITE}/terms/">Terms</a> ·
<a href="${SITE}/privacy/">Privacy</a> ·
<a href="${SITE}/security/">Security</a> ·
<a href="${SITE}/disclaimer/">Disclaimer</a> ·
<a href="${SITE}/contact/">Contact</a>
<p>GOO-JOBB aggregates publicly available job listings and links applicants to the original application source.</p>
</footer>
</div>
</body>
</html>`;
}

for (const j of finalJobs) {
  const url = `${SITE}/jobs/${j.slug}/`;

  const description =
    `${j.title} at ${j.company}. ` +
    `${j.location}. ` +
    `Apply for this ${j.title} opportunity through the original employer or job source.`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": j.title,
    "description": j.description || description,
    "datePosted": j.publishedAt || new Date().toISOString(),
    "hiringOrganization": {
      "@type": "Organization",
      "name": j.company
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": j.location
      }
    },
    "url": url
  };

  if (j.type) schema.employmentType = j.type;

  const body = `
<section class="card">
<h1>${esc(j.title)}</h1>
<p class="meta">
<strong>${esc(j.company)}</strong> · ${esc(j.location)}
</p>
<p>
<span class="badge">Real Job Listing</span>
<span class="badge">${esc(j.location)}</span>
${j.type ? `<span class="badge">${esc(j.type)}</span>` : ""}
${j.source ? `<span class="badge">${esc(j.source)}</span>` : ""}
</p>

<p>${esc(description)}</p>

${j.description ? `
<div class="card">
<h2>Job Description</h2>
<p>${esc(j.description)}</p>
</div>` : ""}

${j.salary ? `
<div class="card">
<h2>Salary</h2>
<p>${esc(j.salary)}</p>
</div>` : ""}

<a class="btn" href="${esc(j.url)}" target="_blank" rel="nofollow noopener">
Apply on Original Source
</a>

<p class="meta">
Application is completed on the original job source. GOO-JOBB does not collect applications.
</p>
</section>`;

  const html = pageShell({
    title: `${j.title} at ${j.company} — Apply Now | GOO-JOBB`,
    description,
    canonicalUrl: url,
    body,
    jsonld: schema
  });

  const dir = path.join(PUBLIC, "jobs", j.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);

  urls.push(url);
}

fs.writeFileSync(
  path.join(PUBLIC, "jobs-seo-index.json"),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalJobs: finalJobs.length,
    urls
  }, null, 2)
);

console.log(`SEO JOB PAGES: ${finalJobs.length}`);
