import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");

const INPUTS = [
  path.join(PUBLIC, "jobs-enterprise.json"),
  path.join(PUBLIC, "jobs.json")
];

const INDEX = path.join(PUBLIC, "jobs-search-index.json");
const FACETS = path.join(PUBLIC, "jobs-facets.json");
const COMPANIES = path.join(PUBLIC, "companies.json");
const SOURCES = path.join(PUBLIC, "sources.json");
const META = path.join(PUBLIC, "enterprise-meta.json");
const SITEMAP_DIR = path.join(PUBLIC, "sitemaps");

const MAX_SITEMAP_URLS = 45000;

function clean(v, fallback = "") {
  if (v === undefined || v === null) return fallback;
  return String(v).replace(/\s+/g, " ").trim() || fallback;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function norm(v) {
  return clean(v).toLowerCase();
}

function tokens(value) {
  return [...new Set(
    norm(value)
      .replace(/[^a-z0-9+#.\- ]+/g, " ")
      .split(/\s+/)
      .filter(x => x.length >= 2)
  )];
}

function slug(value) {
  return norm(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function hash(value) {
  let h = 2166136261;

  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return (h >>> 0).toString(36);
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function readJobs() {
  for (const file of INPUTS) {
    try {
      const text = await fs.readFile(file, "utf8");
      const data = JSON.parse(text);

      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data.jobs)) {
        return data.jobs;
      }
    } catch {
      continue;
    }
  }

  return [];
}

function normalizeJob(job, index) {
  const title = clean(job.title || job.position || job.name);
  const company = clean(
    job.company ||
    job.companyName ||
    job.company_name,
    "Unknown company"
  );

  const location = clean(
    job.location ||
    job.locations ||
    job.city ||
    job.country,
    "Remote / Worldwide"
  );

  const category = clean(
    Array.isArray(job.category)
      ? job.category.join(", ")
      : job.category ||
        job.industry ||
        job.jobIndustry,
    "General"
  );

  const source = clean(
    job.source ||
    job.sourceName,
    "Unknown source"
  );

  const url = clean(
    job.url ||
    job.jobUrl ||
    job.apply_url ||
    job.link
  );

  const description = clean(
    job.description ||
    job.summary ||
    job.content
  );

  const date = clean(
    job.date ||
    job.published_at ||
    job.publication_date ||
    job.created_at
  );

  const employmentType = clean(
    job.employmentType ||
    job.employment_type ||
    job.jobType
  );

  const experience = clean(
    job.experience ||
    job.experience_level ||
    job.jobLevel
  );

  const remote = Boolean(
    job.remote ||
    /remote|worldwide|anywhere/i.test(
      `${location} ${title} ${description}`
    )
  );

  const canonicalUrl = url
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");

  const identity = [
    title.toLowerCase(),
    company.toLowerCase(),
    canonicalUrl.toLowerCase()
  ].join("|");

  const id = clean(job.id) || `job_${hash(identity)}_${index}`;

  const searchable = tokens([
    title,
    company,
    location,
    category,
    source,
    description,
    employmentType,
    experience
  ].join(" "));

  return {
    id,
    title,
    company,
    companySlug: slug(company),
    location,
    locationSlug: slug(location),
    category,
    categorySlug: slug(category),
    source,
    sourceSlug: slug(source),
    url,
    canonicalUrl,
    date,
    description,
    employmentType,
    experience,
    remote,
    searchable
  };
}

function addCount(map, value) {
  const key = clean(value, "Unknown");
  map[key] = (map[key] || 0) + 1;
}

async function writeJson(file, data) {
  await fs.writeFile(
    file,
    JSON.stringify(data)
  );
}

async function buildSitemaps(jobs) {
  await fs.rm(SITEMAP_DIR, {
    recursive: true,
    force: true
  });

  await fs.mkdir(SITEMAP_DIR, {
    recursive: true
  });

  const base =
    process.env.SITE_URL ||
    "https://tv-u.github.io/Goo-jobb";

  const chunks = [];

  for (
    let i = 0;
    i < jobs.length;
    i += MAX_SITEMAP_URLS
  ) {
    chunks.push(
      jobs.slice(i, i + MAX_SITEMAP_URLS)
    );
  }

  if (!chunks.length) {
    chunks.push([]);
  }

  const sitemapFiles = [];

  for (let i = 0; i < chunks.length; i++) {
    const urls = chunks[i].map(job => {
      const detail =
        `/job/${encodeURIComponent(job.id)}`;

      return [
        "  <url>",
        `    <loc>${xmlEscape(base + detail)}</loc>`,
        "  </url>"
      ].join("\n");
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urls.join("\n"),
      "</urlset>"
    ].join("\n");

    const filename = `jobs-${i + 1}.xml`;

    await fs.writeFile(
      path.join(SITEMAP_DIR, filename),
      xml
    );

    sitemapFiles.push(
      `${base}/sitemaps/${filename}`
    );
  }

  const sitemapIndex = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapFiles.map(url => [
      "  <sitemap>",
      `    <loc>${xmlEscape(url)}</loc>`,
      "  </sitemap>"
    ].join("\n")),
    "</sitemapindex>"
  ].join("\n");

  await fs.writeFile(
    path.join(PUBLIC, "sitemap.xml"),
    sitemapIndex
  );

  return sitemapFiles.length;
}

async function main() {
  console.log("");
  console.log("==============================================");
  console.log(" GOO-JOBB PART 4");
  console.log(" ENTERPRISE SEARCH / SEO INDEX BUILDER");
  console.log("==============================================");

  const raw = await readJobs();

  console.log(`INPUT JOBS: ${raw.length}`);

  const jobs = [];
  const seen = new Set();

  for (let i = 0; i < raw.length; i++) {
    const job = normalizeJob(raw[i], i);

    if (!job.title) continue;
    if (!job.url) continue;

    const identity = [
      norm(job.title),
      norm(job.company),
      norm(job.canonicalUrl)
    ].join("|");

    if (seen.has(identity)) continue;

    seen.add(identity);
    jobs.push(job);
  }

  jobs.sort((a, b) => {
    const aa = Date.parse(a.date) || 0;
    const bb = Date.parse(b.date) || 0;
    return bb - aa;
  });

  const category = {};
  const country = {};
  const location = {};
  const source = {};
  const company = {};
  const employmentType = {};
  const experience = {};

  let remote = 0;

  for (const job of jobs) {
    addCount(category, job.category);
    addCount(location, job.location);
    addCount(source, job.source);
    addCount(company, job.company);

    if (job.employmentType) {
      addCount(employmentType, job.employmentType);
    }

    if (job.experience) {
      addCount(experience, job.experience);
    }

    if (job.remote) {
      remote++;
    }

    const countryMatch =
      job.location.match(
        /,\s*([A-Za-z][A-Za-z .'-]{2,})$/
      );

    if (countryMatch) {
      addCount(country, countryMatch[1]);
    }
  }

  const companies = Object.entries(company)
    .map(([name, count]) => ({
      name,
      slug: slug(name),
      jobs: count
    }))
    .sort((a, b) => b.jobs - a.jobs);

  const sources = Object.entries(source)
    .map(([name, count]) => ({
      name,
      slug: slug(name),
      jobs: count
    }))
    .sort((a, b) => b.jobs - a.jobs);

  const index = jobs.map(job => ({
    id: job.id,
    title: job.title,
    company: job.company,
    companySlug: job.companySlug,
    location: job.location,
    locationSlug: job.locationSlug,
    category: job.category,
    categorySlug: job.categorySlug,
    source: job.source,
    sourceSlug: job.sourceSlug,
    date: job.date,
    url: job.url,
    remote: job.remote,
    employmentType: job.employmentType,
    experience: job.experience,
    searchable: job.searchable
  }));

  const facets = {
    version: 1,
    generatedAt: new Date().toISOString(),
    total: jobs.length,
    remote,
    categories: category,
    countries: country,
    locations: location,
    companies: company,
    sources: source,
    employmentTypes: employmentType,
    experience
  };

  const meta = {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalJobs: jobs.length,
    remoteJobs: remote,
    companies: companies.length,
    sources: sources.length,
    categories: Object.keys(category).length,
    locations: Object.keys(location).length,
    indexRecords: index.length,
    sitemapGenerated: true,
    dataIntegrity: {
      jobsWithTitle: jobs.filter(x => x.title).length,
      jobsWithCompany: jobs.filter(x => x.company).length,
      jobsWithLocation: jobs.filter(x => x.location).length,
      jobsWithUrl: jobs.filter(x => /^https?:\/\//i.test(x.url)).length
    }
  };

  await writeJson(INDEX, {
    version: 1,
    generatedAt: meta.generatedAt,
    count: index.length,
    jobs: index
  });

  await writeJson(FACETS, facets);

  await writeJson(COMPANIES, {
    version: 1,
    generatedAt: meta.generatedAt,
    count: companies.length,
    companies
  });

  await writeJson(SOURCES, {
    version: 1,
    generatedAt: meta.generatedAt,
    count: sources.length,
    sources
  });

  await writeJson(META, meta);

  const sitemapCount = await buildSitemaps(jobs);

  console.log("");
  console.log("==============================================");
  console.log(" INDEX BUILD COMPLETE");
  console.log("==============================================");
  console.log(`REAL INDEXED JOBS: ${jobs.length}`);
  console.log(`REMOTE JOBS:       ${remote}`);
  console.log(`COMPANIES:         ${companies.length}`);
  console.log(`SOURCES:           ${sources.length}`);
  console.log(`CATEGORIES:        ${Object.keys(category).length}`);
  console.log(`LOCATIONS:         ${Object.keys(location).length}`);
  console.log(`SITEMAP FILES:     ${sitemapCount}`);
  console.log("==============================================");

  if (jobs.length === 0) {
    console.error("INDEX EMPTY - STOPPING");
    process.exitCode = 2;
    return;
  }

  const invalid = jobs.filter(
    job => !/^https?:\/\//i.test(job.url)
  ).length;

  if (invalid > 0) {
    console.error(
      `INVALID JOB URLS: ${invalid}`
    );
    process.exitCode = 3;
    return;
  }
}

main().catch(error => {
  console.error("");
  console.error("==============================================");
  console.error("INDEX BUILDER ERROR");
  console.error("==============================================");
  console.error(error?.stack || error);
  process.exitCode = 1;
});
