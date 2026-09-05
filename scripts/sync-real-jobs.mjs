import fs from "node:fs/promises";
import crypto from "node:crypto";

const UA =
  "GOO-JOBB-Real-Jobs/1.0 (+https://tv-u.github.io/Goo-jobb/)";

const REQUEST_TIMEOUT = 20000;

function clean(v = "") {
  return String(v)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function hash(v) {
  return crypto
    .createHash("sha256")
    .update(String(v))
    .digest("hex")
    .slice(0, 32);
}

function remote(title, location, description) {
  return /remote|worldwide|work from home|work-from-home|anywhere|distributed/i.test(
    `${title} ${location} ${description}`
  );
}

function category(title, description) {
  const t = `${title} ${description}`.toLowerCase();

  if (
    /software|developer|engineer|devops|frontend|backend|full stack|programmer|qa engineer|sre/.test(
      t
    )
  )
    return "Engineering";

  if (/data scientist|data engineer|analytics|machine learning|artificial intelligence|\bai\b/.test(t))
    return "Data & AI";

  if (/product manager|product owner|product lead/.test(t))
    return "Product";

  if (/design|designer|ux|ui|creative/.test(t))
    return "Design";

  if (/marketing|seo|content|growth|brand/.test(t))
    return "Marketing";

  if (/sales|account executive|business development/.test(t))
    return "Sales";

  if (/finance|accounting|financial|bookkeeper/.test(t))
    return "Finance";

  if (/human resources|recruiter|recruiting|talent/.test(t))
    return "Human Resources";

  if (/customer support|customer success|technical support/.test(t))
    return "Customer Support";

  if (/operations|supply chain|logistics|procurement/.test(t))
    return "Operations";

  if (/healthcare|nurse|medical|clinical|pharmacy/.test(t))
    return "Healthcare";

  if (/teacher|education|instructor|tutor|professor/.test(t))
    return "Education";

  return "Other";
}

function normalize(x, source) {
  const title = clean(
    x.title ||
      x.name ||
      x.position ||
      x.job_title ||
      x.text ||
      ""
  );

  const url =
    x.url ||
    x.link ||
    x.job_url ||
    x.apply_url ||
    x.applyUrl ||
    x.hostedUrl ||
    x.jobUrl ||
    "";

  if (!title || !/^https?:\/\//i.test(url)) return null;

  const company = clean(
    x.company_name ||
      x.company ||
      x.companyName ||
      x.organization ||
      x.employer ||
      source
  );

  const location = clean(
    x.location ||
      x.jobGeo ||
      x.job_geo ||
      x.candidate_required_location ||
      x.city ||
      x.workplace ||
      x.locations ||
      ""
  );

  const description = clean(
    x.description ||
      x.jobDescription ||
      x.content ||
      x.snippet ||
      x.summary ||
      ""
  );

  const published =
    x.publication_date ||
    x.published ||
    x.pubDate ||
    x.created_at ||
    x.createdAt ||
    x.updated_at ||
    x.updatedAt ||
    x.date ||
    new Date().toISOString();

  const id = hash(
    `${title}|${company}|${url.replace(/[?#].*$/, "").replace(/\/$/, "")}`
  );

  return {
    id,
    title,
    company: company || "Employer",
    location: location || "Location not specified",
    category: category(title, description),
    description,
    url,
    source,
    published,
    remote: remote(title, location, description),
    tags: clean(x.tags || x.skills || "")
  };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": UA,
        accept:
          "application/json,application/rss+xml,application/atom+xml,application/xml,text/xml,*/*"
      },
      signal: controller.signal
    });

    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      text
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseXml(text, source) {
  const result = [];

  const blocks = [
    ...text.matchAll(
      /<(item|entry)\b[\s\S]*?<\/\1>/gi
    )
  ].map((m) => m[0]);

  for (const block of blocks) {
    const get = (tag) => {
      const re = new RegExp(
        `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
        "i"
      );

      const match = block.match(re);
      return match ? match[1] : "";
    };

    let link = get("link");

    if (!link) {
      const m = block.match(
        /<link[^>]+href=["']([^"']+)["']/i
      );

      link = m ? m[1] : "";
    }

    const job = normalize(
      {
        title: get("title"),
        link,
        description:
          get("description") ||
          get("summary") ||
          get("content"),
        company: get("company"),
        location: get("location"),
        published:
          get("pubDate") ||
          get("published") ||
          get("updated")
      },
      source
    );

    if (job) result.push(job);
  }

  return result;
}

function parseJson(text, source) {
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }

  const list = Array.isArray(data)
    ? data
    : data.jobs ||
      data.data ||
      data.results ||
      data.postings ||
      data.items ||
      [];

  if (!Array.isArray(list)) return [];

  return list
    .map((x) => normalize(x, source))
    .filter(Boolean);
}

async function source(name, url, type = "auto") {
  try {
    const response = await fetchText(url);

    if (!response.ok) {
      return {
        name,
        url,
        count: 0,
        error: `HTTP ${response.status}`,
        jobs: []
      };
    }

    const looksXml =
      type === "xml" ||
      /xml|rss|atom/i.test(response.contentType) ||
      /<(rss|feed|item|entry)\b/i.test(
        response.text.slice(0, 1000)
      );

    const jobs = looksXml
      ? parseXml(response.text, name)
      : parseJson(response.text, name);

    return {
      name,
      url,
      count: jobs.length,
      error: null,
      jobs
    };
  } catch (error) {
    return {
      name,
      url,
      count: 0,
      error: String(error.message || error),
      jobs: []
    };
  }
}

/*
 * Public sources.
 *
 * These are deliberately limited to endpoints that can be
 * queried without embedding private API keys.
 */
const SOURCES = [
  [
    "Arbeitnow",
    "https://www.arbeitnow.com/api/job-board-api"
  ],
  [
    "Jobicy",
    "https://jobicy.com/api/v2/remote-jobs?count=200"
  ],
  [
    "RemoteOK",
    "https://remoteok.com/api"
  ],
  [
    "Remotive",
    "https://remotive.com/api/remote-jobs?limit=200"
  ],
  [
    "WeWorkRemotely",
    "https://weworkremotely.com/remote-jobs.rss",
    "xml"
  ],
  [
    "WorkingNomads",
    "https://www.workingnomads.com/jobsapi"
  ],
  [
    "Jobspresso",
    "https://jobspresso.co/feed/",
    "xml"
  ],
  [
    "RemoteLeads",
    "https://remoteleads.com/feed/",
    "xml"
  ],
  [
    "DailyRemote",
    "https://dailyremote.com/remote-jobs/feed",
    "xml"
  ],
  [
    "Remote4Me",
    "https://remote4me.com/feed/",
    "xml"
  ],
  [
    "Remotees",
    "https://remotees.com/feed/",
    "xml"
  ],
  [
    "JobBoardSearch",
    "https://jobboardsearch.com/feed",
    "xml"
  ],
  [
    "UK Find a Job",
    "https://findajob.dwp.gov.uk/search/feed",
    "xml"
  ]
];

const GREENHOUSE = [
  "stripe",
  "anthropic",
  "databricks",
  "figma",
  "carta",
  "coursera",
  "cloudflare",
  "coinbase",
  "hubspot",
  "reddit",
  "asana",
  "airtable",
  "brex",
  "gusto",
  "intercom",
  "duolingo"
];

const ASHBY = [
  "openai",
  "linear",
  "ramp",
  "posthog",
  "replit",
  "perplexity",
  "cursor"
];

const LEVER = [
  "palantir",
  "lattice",
  "vanta",
  "verkada"
];

const tasks = [
  ...SOURCES.map(
    ([name, url, type]) => () =>
      source(name, url, type)
  ),

  ...GREENHOUSE.map(
    (board) => () =>
      source(
        `Greenhouse:${board}`,
        `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`
      )
  ),

  ...ASHBY.map(
    (board) => () =>
      source(
        `Ashby:${board}`,
        `https://api.ashbyhq.com/posting-api/job-board/${board}`
      )
  ),

  ...LEVER.map(
    (board) => () =>
      source(
        `Lever:${board}`,
        `https://api.lever.co/v0/postings/${board}?mode=json`
      )
  )
];

const results = [];

for (let i = 0; i < tasks.length; i += 8) {
  const batch = await Promise.all(
    tasks.slice(i, i + 8).map((task) => task())
  );

  results.push(...batch);

  console.log(
    `BATCH ${Math.floor(i / 8) + 1}:`,
    batch
      .map(
        (x) =>
          `${x.name}=${x.count}${
            x.error ? ` [${x.error}]` : ""
          }`
      )
      .join(" | ")
  );
}

/*
 * Deduplicate by canonical URL first, then by content identity.
 */
const byUrl = new Map();

for (const result of results) {
  for (const job of result.jobs) {
    const key = job.url
      .replace(/[?#].*$/, "")
      .replace(/\/$/, "")
      .toLowerCase();

    if (!key) continue;

    const previous = byUrl.get(key);

    if (
      !previous ||
      job.description.length >
        previous.description.length
    ) {
      byUrl.set(key, job);
    }
  }
}

const jobs = [...byUrl.values()]
  .filter(
    (job) =>
      job.title &&
      job.company &&
      /^https?:\/\//i.test(job.url)
  )
  .sort(
    (a, b) =>
      new Date(b.published || 0) -
      new Date(a.published || 0)
  );

const generatedAt = new Date().toISOString();

const dataset = {
  version: 3,
  generated_at: generatedAt,
  total: jobs.length,
  connector_count: results.length,
  active_source_count: results.filter(
    (x) => x.count > 0
  ).length,
  jobs
};

await fs.mkdir("public", { recursive: true });

await fs.writeFile(
  "public/jobs.json",
  JSON.stringify(dataset)
);

await fs.writeFile(
  "public/job-sync-status.json",
  JSON.stringify(
    {
      generated_at: generatedAt,
      total_jobs: jobs.length,
      connector_count: results.length,
      active_sources: results.filter(
        (x) => x.count > 0
      ).length,
      sources: results.map(
        ({ jobs: _jobs, ...rest }) => rest
      )
    },
    null,
    2
  )
);

console.log("");
console.log("========================================");
console.log("GOO-JOBB REAL DATA SYNC");
console.log("========================================");
console.log("CONNECTORS :", results.length);
console.log(
  "ACTIVE     :",
  dataset.active_source_count
);
console.log("REAL JOBS  :", dataset.total);
console.log("========================================");

if (dataset.total === 0) {
  throw new Error(
    "No real jobs returned. Nothing fabricated."
  );
}
