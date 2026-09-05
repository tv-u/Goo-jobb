import fs from "node:fs";
import path from "node:path";

const INPUTS = [
  "public/jobs-worldwide.json",
  "public/jobs-enterprise.json",
  "public/jobs.json"
];

let data = [];

for (const file of INPUTS) {
  if (!fs.existsSync(file)) continue;

  try {
    const x = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Array.isArray(x) && x.length > data.length) data = x;
  } catch {}
}

function clean(v){
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g,"")
    .trim()
    .replace(/\s+/g,"-")
    .replace(/-+/g,"-")
    .replace(/^-|-$/g,"");
}

function jobKey(j){
  return [
    j.id,
    j.jobId,
    j.url,
    j.applyUrl,
    j.link,
    j.title,
    j.company,
    j.location
  ].filter(Boolean).join("|");
}

const used = new Set();
const map = [];

for (const job of data) {

  if (!job || typeof job !== "object") continue;

  const title = String(job.title || "job").trim();
  const company = String(job.company || "company").trim();
  const location = String(job.location || "worldwide").trim();

  let base = clean(`${title}-${company}-${location}`);

  if (!base) base = "job";

  if (base.length > 180) base = base.slice(0,180);

  let slug = base;
  let n = 2;

  while (used.has(slug)) {
    slug = `${base}-${n++}`;
  }

  used.add(slug);

  map.push({
    key: jobKey(job),
    slug,
    path: `/jobs/${slug}/`,
    title,
    company,
    location,
    url: job.url || job.applyUrl || job.link || ""
  });
}

fs.writeFileSync(
  "public/job-page-map.json",
  JSON.stringify(map,null,2)
);

console.log("ROUTE MAP:",map.length);
