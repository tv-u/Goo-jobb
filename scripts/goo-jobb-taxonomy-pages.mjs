import fs from "node:fs";
import path from "node:path";

const PUBLIC = path.join(process.cwd(), "public");
const SITE = "https://tv-u.github.io/Goo-jobb";

const jobs = JSON.parse(
  fs.readFileSync(path.join(PUBLIC, "jobs-seo-index.json"), "utf8")
);

const raw = fs.existsSync(path.join(PUBLIC, "jobs-enterprise.json"))
  ? JSON.parse(fs.readFileSync(path.join(PUBLIC, "jobs-enterprise.json"), "utf8"))
  : [];

function slug(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function esc(v) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title, description, canonical, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<style>
body{margin:0;background:#070707;color:#eee;font-family:system-ui;padding:24px;line-height:1.6}
.wrap{max-width:1100px;margin:auto}
.card{background:#111;border:1px solid #292929;border-radius:16px;padding:20px;margin:15px 0}
a{color:#67ffb0}.job{padding:12px 0;border-bottom:1px solid #222}
</style>
</head>
<body>
<div class="wrap">
<p><a href="${SITE}/">← GOO-JOBB</a></p>
${body}
</div>
</body>
</html>`;
}

const categories = new Map();
const locations = new Map();
const companies = new Map();

for (const j of raw) {
  const title = String(j.title || "").trim();
  const company = String(j.company || j.companyName || "").trim();
  const location = String(j.location || "Remote").trim();

  const category =
    String(
      j.category ||
      j.industry ||
      j.department ||
      title.split(/\s+/).slice(0, 2).join(" ")
    ).trim();

  if (category) {
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category).push(j);
  }

  if (location) {
    if (!locations.has(location)) locations.set(location, []);
    locations.get(location).push(j);
  }

  if (company) {
    if (!companies.has(company)) companies.set(company, []);
    companies.get(company).push(j);
  }
}

function writeCollection(base, map, label) {
  fs.rmSync(path.join(PUBLIC, base), { recursive:true, force:true });
  fs.mkdirSync(path.join(PUBLIC, base), {recursive:true});

  const indexLinks = [];

  for (const [name, list] of map) {
    if (list.length < 1) continue;

    const s = slug(name);
    if (!s) continue;

    const canonical = `${SITE}/${base}/${s}/`;
    const title = `${name} Jobs — Latest ${label} Opportunities | GOO-JOBB`;
    const desc = `Find ${name} jobs, remote opportunities, hiring companies and current ${label.toLowerCase()} vacancies on GOO-JOBB.`;

    const links = list.slice(0, 100).map(j => {
      const jobTitle = String(j.title || "Job");
      const company = String(j.company || j.companyName || "");
      const u = String(j.url || j.applyUrl || j.apply_url || "");
      const safe = slug(`${jobTitle}-${company}-${String(j.location || "")}`);
      return `<div class="job"><a href="${SITE}/jobs/${safe}/">${esc(jobTitle)}</a><br><small>${esc(company)} · ${esc(j.location || "Remote")}</small>${u ? ` · <a href="${esc(u)}" target="_blank" rel="nofollow noopener">Apply</a>` : ""}</div>`;
    }).join("");

    const body = `
<div class="card">
<h1>${esc(name)} Jobs</h1>
<p>${esc(desc)}</p>
<p><strong>${list.length}</strong> indexed opportunities.</p>
</div>
<div class="card">${links}</div>`;

    const dir = path.join(PUBLIC, base, s);
    fs.mkdirSync(dir, {recursive:true});
    fs.writeFileSync(
      path.join(dir, "index.html"),
      shell(title, desc, canonical, body)
    );

    indexLinks.push(`<li><a href="${canonical}">${esc(name)} Jobs</a> (${list.length})</li>`);
  }

  const indexBody = `
<div class="card">
<h1>Browse ${label}</h1>
<p>Explore searchable ${label.toLowerCase()} job opportunities.</p>
<ul>${indexLinks.join("")}</ul>
</div>`;

  fs.writeFileSync(
    path.join(PUBLIC, base, "index.html"),
    shell(
      `Browse ${label} Jobs | GOO-JOBB`,
      `Browse ${label.toLowerCase()} jobs and employment opportunities.`,
      `${SITE}/${base}/`,
      indexBody
    )
  );
}

writeCollection("category", categories, "Categories");
writeCollection("location", locations, "Locations");
writeCollection("company", companies, "Companies");

console.log("TAXONOMY PAGES CREATED");
console.log("categories:", categories.size);
console.log("locations:", locations.size);
console.log("companies:", companies.size);
