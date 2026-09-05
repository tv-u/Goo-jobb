import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "jobs-enterprise.json");
const STATUS = path.join(PUBLIC, "job-source-health.json");

const SOURCES = [
  {
    id: "jobicy",
    type: "json",
    url: "https://jobicy.com/api/v2/remote-jobs?count=200"
  },
  {
    id: "remoteok",
    type: "json",
    url: "https://remoteok.com/api"
  },
  {
    id: "remotive",
    type: "json",
    url: "https://remotive.com/api/remote-jobs?limit=100"
  },
  {
    id: "arbeitnow",
    type: "json",
    url: "https://www.arbeitnow.com/api/job-board-api"
  },
  {
    id: "himalayas",
    type: "rss",
    url: "https://himalayas.app/jobs/rss"
  },
  {
    id: "weworkremotely",
    type: "rss",
    url: "https://weworkremotely.com/remote-jobs.rss"
  },
  {
    id: "wwr-programming",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-programming-jobs.rss"
  },
  {
    id: "wwr-customer-support",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-customer-support-jobs.rss"
  },
  {
    id: "wwr-sales-marketing",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss"
  },
  {
    id: "wwr-design",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-design-jobs.rss"
  },
  {
    id: "wwr-devops",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss"
  }
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function clean(value, fallback = "") {
  if (value === undefined || value === null) return fallback;

  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim() || fallback;
}

function stripHtml(value) {
  return clean(value, "");
}

function hash(value) {
  let h = 2166136261;

  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return (h >>> 0).toString(36);
}

function validUrl(value) {
  return /^https?:\/\//i.test(clean(value));
}

function parseDate(value) {
  const n = Date.parse(value || "");
  return Number.isFinite(n) ? new Date(n).toISOString() : new Date().toISOString();
}

function arrayFromObject(data) {
  if (Array.isArray(data)) return data;

  if (!data || typeof data !== "object") return [];

  const candidates = [
    data.jobs,
    data.data,
    data.results,
    data.items,
    data.postings
  ];

  for (const item of candidates) {
    if (Array.isArray(item)) return item;
  }

  return [];
}

async function fetchSource(source) {
  let lastError = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(source.url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "user-agent": "GOO-JOBB-Enterprise/2.0",
          "accept": "application/json,application/rss+xml,application/xml,text/xml,*/*"
        },
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body = await response.text();

      if (!body.trim()) {
        throw new Error("EMPTY_RESPONSE");
      }

      return {
        ...source,
        ok: true,
        attempts: attempt,
        body,
        bytes: Buffer.byteLength(body)
      };
    } catch (error) {
      lastError = String(error?.message || error);

      if (attempt < 3) {
        await sleep(attempt * 1500);
      }
    }
  }

  return {
    ...source,
    ok: false,
    attempts: 3,
    error: lastError,
    body: "",
    bytes: 0
  };
}

function parseXmlItems(xml) {
  const items = [];

  const blocks = [
    ...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)
  ];

  for (const match of blocks) {
    const block = match[1];

    const read = tag => {
      const pattern = new RegExp(
        `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
        "i"
      );

      const found = block.match(pattern);

      if (found) {
        return stripHtml(found[1]);
      }

      return "";
    };

    let link = read("link");

    if (!link) {
      const href = block.match(
        /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i
      );

      if (href) {
        link = href[1];
      }
    }

    const title = read("title");

    if (!title || !validUrl(link)) continue;

    items.push({
      title,
      url: link,
      company: read("company") || read("author") || "",
      location: read("location") || "",
      description:
        read("description") ||
        read("summary") ||
        read("content") ||
        "",
      date:
        read("pubDate") ||
        read("published") ||
        read("updated") ||
        ""
    });
  }

  return items;
}

function normalizeJson(raw, source) {
  if (!raw || typeof raw !== "object") return null;

  const title = clean(
    raw.jobTitle ||
    raw.title ||
    raw.position ||
    raw.name ||
    raw.job_title ||
    raw.role
  );

  const url = clean(
    raw.url ||
    raw.jobUrl ||
    raw.job_url ||
    raw.apply_url ||
    raw.link
  );

  if (!title || !validUrl(url)) return null;

  const company = clean(
    raw.companyName ||
    raw.company_name ||
    raw.company ||
    raw.employer ||
    raw.organization ||
    "Unknown company"
  );

  const location = clean(
    raw.jobGeo ||
    raw.location ||
    raw.locations ||
    raw.city ||
    raw.country ||
    "Remote / Worldwide"
  );

  let category = raw.jobIndustry || raw.category || raw.industry || raw.job_category;

  if (Array.isArray(category)) {
    category = category.join(", ");
  }

  category = clean(category, "General");

  const description = stripHtml(
    raw.jobDescription ||
    raw.description ||
    raw.content ||
    raw.summary ||
    raw.jobExcerpt ||
    ""
  );

  const date = parseDate(
    raw.pubDate ||
    raw.publication_date ||
    raw.published_at ||
    raw.created_at ||
    raw.created ||
    raw.date
  );

  const type = clean(
    Array.isArray(raw.jobType)
      ? raw.jobType.join(", ")
      : raw.jobType || raw.employment_type || raw.type,
    ""
  );

  const level = clean(
    raw.jobLevel ||
    raw.experience ||
    raw.experience_level,
    ""
  );

  const salaryMin =
    Number.isFinite(Number(raw.salaryMin))
      ? Number(raw.salaryMin)
      : null;

  const salaryMax =
    Number.isFinite(Number(raw.salaryMax))
      ? Number(raw.salaryMax)
      : null;

  const salaryCurrency = clean(
    raw.salaryCurrency ||
    raw.currency ||
    "",
    ""
  );

  return {
    title,
    company,
    location,
    category,
    source,
    url,
    date,
    description,
    employmentType: type,
    experience: level,
    salaryMin,
    salaryMax,
    salaryCurrency
  };
}

function normalizeRss(raw, source) {
  if (!raw) return null;

  const title = clean(raw.title);
  const url = clean(raw.url);

  if (!title || !validUrl(url)) return null;

  return {
    title,
    company: clean(raw.company, "Unknown company"),
    location: clean(raw.location, "Remote / Worldwide"),
    category: "Remote",
    source,
    url,
    date: parseDate(raw.date),
    description: clean(raw.description),
    employmentType: "",
    experience: "",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: ""
  };
}

function enrich(job) {
  const canonical = job.url
    .toLowerCase()
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");

  const identity = [
    job.title.toLowerCase(),
    job.company.toLowerCase(),
    canonical
  ].join("|");

  return {
    id: `job_${hash(identity)}`,
    ...job,
    canonicalUrl: job.url,
    remote: /remote|worldwide|anywhere/i.test(
      `${job.location} ${job.title} ${job.description}`
    ),
    searchableText: [
      job.title,
      job.company,
      job.location,
      job.category,
      job.description,
      job.employmentType,
      job.experience
    ]
      .join(" ")
      .toLowerCase()
  };
}

async function main() {
  await fs.mkdir(PUBLIC, { recursive: true });

  const started = Date.now();

  console.log("");
  console.log("==============================================");
  console.log(" GOO-JOBB PART 3");
  console.log(" ENTERPRISE SOURCE EXPANSION");
  console.log("==============================================");
  console.log(`SOURCES: ${SOURCES.length}`);
  console.log("");

  const results = [];

  for (let i = 0; i < SOURCES.length; i += 3) {
    const batch = SOURCES.slice(i, i + 3);

    console.log(
      `FETCH BATCH ${Math.floor(i / 3) + 1}: ${batch.map(x => x.id).join(" | ")}`
    );

    const fetched = await Promise.all(
      batch.map(fetchSource)
    );

    results.push(...fetched);
  }

  const allJobs = [];
  const seenUrl = new Set();
  const seenFingerprint = new Set();

  for (const result of results) {
    if (!result.ok) {
      console.log(`FAILED: ${result.id} -> ${result.error}`);
      continue;
    }

    let rawJobs = [];

    if (result.type === "json") {
      try {
        const parsed = JSON.parse(result.body);
        rawJobs = arrayFromObject(parsed)
          .map(item => normalizeJson(item, result.id))
          .filter(Boolean);
      } catch (error) {
        console.log(
          `PARSE ERROR: ${result.id} -> ${String(error?.message || error)}`
        );
        continue;
      }
    }

    if (result.type === "rss") {
      const rssJobs = parseXmlItems(result.body);

      rawJobs = rssJobs
        .map(item => normalizeRss(item, result.id))
        .filter(Boolean);
    }

    let accepted = 0;

    for (const rawJob of rawJobs) {
      const job = enrich(rawJob);

      const urlKey = job.canonicalUrl
        .toLowerCase()
        .replace(/[?#].*$/, "")
        .replace(/\/+$/, "");

      const fingerprint = [
        job.title.toLowerCase(),
        job.company.toLowerCase(),
        job.location.toLowerCase()
      ].join("|");

      if (seenUrl.has(urlKey)) continue;

      if (seenFingerprint.has(fingerprint)) {
        continue;
      }

      seenUrl.add(urlKey);
      seenFingerprint.add(fingerprint);

      allJobs.push(job);
      accepted++;
    }

    console.log(
      `OK:     ${result.id} -> fetched=${rawJobs.length} accepted=${accepted}`
    );
  }

  allJobs.sort((a, b) => {
    const aa = Date.parse(a.date) || 0;
    const bb = Date.parse(b.date) || 0;
    return bb - aa;
  });

  const health = results.map(result => ({
    id: result.id,
    type: result.type,
    url: result.url,
    ok: result.ok,
    attempts: result.attempts,
    bytes: result.bytes,
    jobsParsed: result.ok
      ? result.type === "rss"
        ? parseXmlItems(result.body).length
        : (() => {
            try {
              return arrayFromObject(JSON.parse(result.body)).length;
            } catch {
              return 0;
            }
          })()
      : 0,
    error: result.error || null
  }));

  const output = {
    version: 2,
    generatedAt: new Date().toISOString(),
    count: allJobs.length,
    sources: health.length,
    healthySources: health.filter(x => x.ok).length,
    failedSources: health.filter(x => !x.ok).length,
    jobs: allJobs
  };

  const status = {
    version: 2,
    generatedAt: output.generatedAt,
    durationMs: Date.now() - started,
    count: allJobs.length,
    sourceCount: health.length,
    healthySources: health.filter(x => x.ok).length,
    failedSources: health.filter(x => !x.ok).length,
    sources: health
  };

  await fs.writeFile(
    OUT,
    JSON.stringify(output)
  );

  await fs.writeFile(
    STATUS,
    JSON.stringify(status, null, 2)
  );

  console.log("");
  console.log("==============================================");
  console.log(" SOURCE EXPANSION COMPLETE");
  console.log("==============================================");
  console.log(`REAL JOBS:       ${allJobs.length}`);
  console.log(`SOURCES:         ${health.length}`);
  console.log(`HEALTHY:         ${status.healthySources}`);
  console.log(`FAILED:          ${status.failedSources}`);
  console.log(`TIME:            ${status.durationMs} ms`);
  console.log("==============================================");

  if (allJobs.length < 1) {
    console.error("NO VERIFIED JOBS GENERATED");
    process.exitCode = 2;
    return;
  }
}

main().catch(error => {
  console.error("");
  console.error("==============================================");
  console.error("SOURCE EXPANSION ERROR");
  console.error("==============================================");
  console.error(error?.stack || error);
  process.exitCode = 1;
});
