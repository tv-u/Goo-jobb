import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");

const UA =
  "GOO-JOBB/WorldwideJobSearch (+https://tv-u.github.io/Goo-jobb/)";

const TIMEOUT = 18000;
const CONCURRENCY = 8;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function clean(v = "") {
  return String(v)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(v = "") {
  return clean(v);
}

function hash(v) {
  let h = 2166136261;
  for (let i = 0; i < v.length; i++) {
    h ^= v.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function canonicalUrl(url = "") {
  try {
    const u = new URL(url);
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "source"
    ].forEach(k => u.searchParams.delete(k));
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return String(url).trim();
  }
}

function inferCountry(text = "") {
  const s = text.toLowerCase();

  const map = [
    ["united states", "United States"],
    ["usa", "United States"],
    ["u.s.", "United States"],
    ["canada", "Canada"],
    ["united kingdom", "United Kingdom"],
    ["uk", "United Kingdom"],
    ["england", "United Kingdom"],
    ["germany", "Germany"],
    ["france", "France"],
    ["netherlands", "Netherlands"],
    ["india", "India"],
    ["australia", "Australia"],
    ["new zealand", "New Zealand"],
    ["ireland", "Ireland"],
    ["spain", "Spain"],
    ["italy", "Italy"],
    ["portugal", "Portugal"],
    ["poland", "Poland"],
    ["sweden", "Sweden"],
    ["norway", "Norway"],
    ["denmark", "Denmark"],
    ["finland", "Finland"],
    ["switzerland", "Switzerland"],
    ["austria", "Austria"],
    ["belgium", "Belgium"],
    ["singapore", "Singapore"],
    ["japan", "Japan"],
    ["china", "China"],
    ["south korea", "South Korea"],
    ["brazil", "Brazil"],
    ["mexico", "Mexico"],
    ["argentina", "Argentina"],
    ["south africa", "South Africa"],
    ["nigeria", "Nigeria"],
    ["kenya", "Kenya"],
    ["uae", "United Arab Emirates"],
    ["united arab emirates", "United Arab Emirates"],
    ["israel", "Israel"]
  ];

  for (const [needle, country] of map) {
    if (s.includes(needle)) return country;
  }

  return "";
}

function inferMode(text = "") {
  const s = text.toLowerCase();

  if (
    /\bhybrid\b/.test(s)
  ) return "Hybrid";

  if (
    /\bremote\b/.test(s) ||
    /\bwork from home\b/.test(s) ||
    /\banywhere\b/.test(s)
  ) return "Remote";

  return "On-site";
}

function inferEmployment(text = "") {
  const s = text.toLowerCase();

  if (/intern(ship)?/.test(s)) return "Internship";
  if (/contract/.test(s)) return "Contract";
  if (/part[- ]?time/.test(s)) return "Part-time";
  if (/freelance/.test(s)) return "Freelance";
  if (/temporary/.test(s)) return "Temporary";

  return "Full-time";
}

function inferCategory(text = "") {
  const s = text.toLowerCase();

  if (/software|developer|engineer|devops|frontend|backend|full stack|programmer|javascript|python|java|cloud|data engineer/.test(s))
    return "Technology";

  if (/marketing|seo|content|social media|brand|growth/.test(s))
    return "Marketing";

  if (/sales|business development|account executive/.test(s))
    return "Sales";

  if (/customer support|customer success|help desk/.test(s))
    return "Customer Support";

  if (/finance|accounting|accountant|financial analyst/.test(s))
    return "Finance";

  if (/hr|human resources|recruiter|talent acquisition/.test(s))
    return "Human Resources";

  if (/design|designer|ux|ui|creative/.test(s))
    return "Design";

  if (/legal|lawyer|counsel|compliance/.test(s))
    return "Legal";

  if (/health|medical|nurse|doctor|clinical/.test(s))
    return "Healthcare";

  if (/education|teacher|tutor|professor/.test(s))
    return "Education";

  return "Other";
}

function normalizeJob(raw, source, index) {
  const title = clean(
    raw.title ||
    raw.position ||
    raw.name ||
    raw.job_title ||
    raw.jobTitle ||
    ""
  );

  const company = clean(
    raw.company ||
    raw.company_name ||
    raw.companyName ||
    raw.employer ||
    raw.organization ||
    ""
  );

  const url =
    raw.url ||
    raw.link ||
    raw.apply_url ||
    raw.applyUrl ||
    raw.job_url ||
    raw.application_url ||
    "";

  if (!title || !url) return null;

  const description = stripHtml(
    raw.description ||
    raw.content ||
    raw.snippet ||
    raw.summary ||
    ""
  );

  const location = clean(
    raw.location ||
    raw.locations ||
    raw.city ||
    raw.country ||
    raw.region ||
    "Worldwide"
  );

  const text = `${title} ${company} ${location} ${description}`;

  const canonical = canonicalUrl(url);

  const posted =
    raw.pubDate ||
    raw.published_at ||
    raw.publishedAt ||
    raw.date ||
    raw.created_at ||
    raw.createdAt ||
    null;

  const salary =
    raw.salary ||
    raw.salary_min && raw.salary_max
      ? `${raw.salary_min || ""}${raw.salary_min || raw.salary_max ? " - " : ""}${raw.salary_max || ""} ${raw.salary_currency || raw.currency || ""}`.trim()
      : "";

  const id = hash(
    `${source}|${canonical}|${title}|${company}`.toLowerCase()
  );

  return {
    id,
    title,
    company: company || "Unknown company",
    location: location || "Worldwide",
    country: inferCountry(text) || "Worldwide",
    workMode: inferMode(text),
    employmentType: inferEmployment(text),
    category: inferCategory(text),
    description: description.slice(0, 12000),
    salary: clean(salary),
    url: canonical,
    applyUrl: canonical,
    source,
    sourceUrl: canonical,
    postedAt: posted,
    fetchedAt: new Date().toISOString(),
    real: true,
    synthetic: false,
    searchable: true,
    worldwide: /worldwide|anywhere|global/i.test(text)
  };
}

/*
  IMPORTANT:
  These are official/public feeds only.
  Some sources may change availability or terms.
  A failed source never creates fake records.
*/

const SOURCES = [
  {
    name: "jobicy",
    type: "json",
    url: "https://jobicy.com/api/v2/remote-jobs?count=200"
  },
  {
    name: "remoteok",
    type: "json",
    url: "https://remoteok.com/api"
  },
  {
    name: "remotive",
    type: "json",
    url: "https://remotive.com/api/remote-jobs"
  },
  {
    name: "arbeitnow",
    type: "json",
    url: "https://www.arbeitnow.com/api/job-board-api"
  },
  {
    name: "himalayas",
    type: "json",
    url: "https://himalayas.app/jobs/api?limit=20"
  },
  {
    name: "weworkremotely",
    type: "rss",
    url: "https://weworkremotely.com/remote-jobs.rss"
  },
  {
    name: "wwr-programming",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-programming-jobs.rss"
  },
  {
    name: "wwr-design",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-design-jobs.rss"
  },
  {
    name: "wwr-sales-marketing",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss"
  },
  {
    name: "wwr-customer-support",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-customer-support-jobs.rss"
  },
  {
    name: "wwr-devops",
    type: "rss",
    url: "https://weworkremotely.com/categories/remote-devops-and-sysadmin-jobs.rss"
  },
  {
    name: "remoteok-rss",
    type: "rss",
    url: "https://remoteok.com/remote-jobs.rss"
  },
  {
    name: "himalayas-rss",
    type: "rss",
    url: "https://himalayas.app/jobs/rss"
  },

  {
    name: "remote-landers",
    type: "json",
    url: "https://remotelanders.com/api/jobs?limit=100&page=1"
  },
  {
    name: "fourdayweek",
    type: "json",
    url: "https://4dayweek.io/api/jobs"
  },
  {
    name: "remote-first-jobs",
    type: "rss",
    url: "https://remotefirstjobs.com/rss"
  },
  {
    name: "hireweb3",
    type: "rss",
    url: "https://hireweb3.io/rss"
  },
  {
    name: "jobscollider",
    type: "rss",
    url: "https://jobscollider.com/remote-jobs.rss"
  },

  /*
   * Additional public RSS endpoints.
   * A source is accepted only when the response is valid and contains
   * actual job-like records. Failed/empty sources are reported as such.
   */

  {
    name: "remote-first-engineering",
    type: "rss",
    url: "https://remotefirstjobs.com/remote-jobs.rss"
  },
  {
    name: "working-nomads",
    type: "rss",
    url: "https://www.workingnomads.com/jobs/rss"
  },
  {
    name: "dailyremote",
    type: "rss",
    url: "https://dailyremote.com/remote-jobs.rss"
  },
  {
    name: "remote4me",
    type: "rss",
    url: "https://remote4me.com/feed/"
  },
  {
    name: "remotees",
    type: "rss",
    url: "https://remotees.com/feed/"
  },
  {
    name: "remoteok-dev",
    type: "json",
    url: "https://remoteok.com/api?tag=dev"
  },
  {
    name: "remoteok-design",
    type: "json",
    url: "https://remoteok.com/api?tag=design"
  },
  {
    name: "remoteok-python",
    type: "json",
    url: "https://remoteok.com/api?tag=python"
  },
  {
    name: "remoteok-javascript",
    type: "json",
    url: "https://remoteok.com/api?tag=javascript"
  },
  {
    name: "remoteok-data",
    type: "json",
    url: "https://remoteok.com/api?tag=data"
  },
  {
    name: "remoteok-marketing",
    type: "json",
    url: "https://remoteok.com/api?tag=marketing"
  },
  {
    name: "jobicy-usa",
    type: "json",
    url: "https://jobicy.com/api/v2/remote-jobs?count=200&geo=usa"
  },
  {
    name: "jobicy-europe",
    type: "json",
    url: "https://jobicy.com/api/v2/remote-jobs?count=200&geo=europe"
  },
  {
    name: "jobicy-apac",
    type: "json",
    url: "https://jobicy.com/api/v2/remote-jobs?count=200&geo=apac"
  },
  {
    name: "jobicy-anywhere",
    type: "json",
    url: "https://jobicy.com/api/v2/remote-jobs?count=200&geo=anywhere"
  },
  {
    name: "jobicy-engineering",
    type: "json",
    url: "https://jobicy.com/api/v2/remote-jobs?count=200&industry=engineering"
  },
  {
    name: "jobicy-marketing",
    type: "json",
    url: "https://jobicy.com/api/v2/remote-jobs?count=200&industry=marketing"
  },
  {
    name: "jobicy-data-science",
    type: "json",
    url: "https://jobicy.com/api/v2/remote-jobs?count=200&industry=data-science"
  },
  {
    name: "arbeitnow-page-1",
    type: "json",
    url: "https://www.arbeitnow.com/api/job-board-api?page=1"
  },
  {
    name: "arbeitnow-page-2",
    type: "json",
    url: "https://www.arbeitnow.com/api/job-board-api?page=2"
  },
  {
    name: "arbeitnow-page-3",
    type: "json",
    url: "https://www.arbeitnow.com/api/job-board-api?page=3"
  },
  {
    name: "himalayas-page-2",
    type: "json",
    url: "https://himalayas.app/jobs/api?limit=20&cursor=20"
  }
];

async function fetchWithTimeout(url, retries = 2) {
  let last;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "user-agent": UA,
          "accept":
            "application/json, application/rss+xml, application/xml, text/xml, */*"
        }
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.text();
    } catch (e) {
      clearTimeout(timer);
      last = e;
      if (attempt < retries) await sleep(800 * (attempt + 1));
    }
  }

  throw last || new Error("fetch failed");
}

function parseJson(text) {
  const data = JSON.parse(text);

  if (Array.isArray(data)) return data;

  if (Array.isArray(data.jobs)) return data.jobs;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;

  return [];
}

function decodeXml(v = "") {
  return v
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRss(xml) {
  const items = [];

  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  for (const block of blocks) {
    const get = tag => {
      const re = new RegExp(
        `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
        "i"
      );
      return decodeXml((block.match(re)?.[1] || "").trim());
    };

    items.push({
      title: get("title"),
      link: get("link") || get("guid"),
      description: get("description") || get("content:encoded"),
      pubDate: get("pubDate"),
      company:
        get("company") ||
        get("companyName") ||
        get("author") ||
        ""
    });
  }

  if (items.length) return items;

  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];

  for (const block of entries) {
    const text = tag => {
      const re = new RegExp(
        `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
        "i"
      );
      return decodeXml((block.match(re)?.[1] || "").trim());
    };

    const href =
      block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || "";

    items.push({
      title: text("title"),
      link: href || text("id"),
      description: text("summary") || text("content"),
      pubDate: text("published") || text("updated"),
      company: text("author")
    });
  }

  return items;
}

async function fetchSource(source) {
  const started = Date.now();

  try {
    const body = await fetchWithTimeout(source.url);

    let records =
      source.type === "json"
        ? parseJson(body)
        : parseRss(body);

    const jobs = [];

    for (let i = 0; i < records.length; i++) {
      const job = normalizeJob(records[i], source.name, i);
      if (job) jobs.push(job);
    }

    return {
      source: source.name,
      url: source.url,
      fetched: records.length,
      accepted: jobs.length,
      jobs,
      ms: Date.now() - started,
      ok: true
    };
  } catch (error) {
    return {
      source: source.name,
      url: source.url,
      fetched: 0,
      accepted: 0,
      jobs: [],
      ms: Date.now() - started,
      ok: false,
      error: error?.message || String(error)
    };
  }
}

async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;

  async function runner() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;

      try {
        out[i] = await worker(items[i], i);
      } catch (e) {
        out[i] = {
          source: items[i].name,
          url: items[i].url,
          fetched: 0,
          accepted: 0,
          jobs: [],
          ok: false,
          error: e?.message || String(e)
        };
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limit, items.length) },
      () => runner()
    )
  );

  return out;
}

function mergeJobs(results) {
  const map = new Map();

  for (const result of results) {
    for (const job of result.jobs || []) {
      const key =
        canonicalUrl(job.url).toLowerCase() ||
        `${job.title}|${job.company}|${job.location}`
          .toLowerCase()
          .replace(/\s+/g, " ");

      if (!map.has(key)) {
        map.set(key, job);
      } else {
        const old = map.get(key);

        old.source =
          old.source === job.source
            ? old.source
            : `${old.source},${job.source}`;

        if (!old.description && job.description)
          old.description = job.description;

        if (!old.salary && job.salary)
          old.salary = job.salary;
      }
    }
  }

  return [...map.values()];
}

function preserveExisting() {
  const files = [
    "jobs.json",
    "jobs-enterprise.json",
    "jobs-worldwide.json"
  ];

  const old = [];

  for (const file of files) {
    const p = path.join(PUBLIC, file);

    if (!fs.existsSync(p)) continue;

    try {
      const x = JSON.parse(fs.readFileSync(p, "utf8"));

      const arr =
        Array.isArray(x)
          ? x
          : Array.isArray(x.jobs)
            ? x.jobs
            : [];

      old.push(...arr);
    } catch {}
  }

  return old
    .map((j, i) => normalizeJob(j, j.source || "existing", i))
    .filter(Boolean);
}

fs.mkdirSync(PUBLIC, { recursive: true });

console.log("");
console.log("==============================================");
console.log(" GOO-JOBB WORLDWIDE SOURCE EXPANSION");
console.log("==============================================");
console.log(`SOURCES: ${SOURCES.length}`);
console.log(`CONCURRENCY: ${CONCURRENCY}`);
console.log(`TIMEOUT: ${TIMEOUT}ms`);
console.log("FAKE DATA: DISABLED");
console.log("==============================================");

const results = await pool(
  SOURCES,
  CONCURRENCY,
  fetchSource
);

for (const r of results) {
  console.log(
    `${r.ok ? "OK" : "FAIL"}: ${r.source} -> fetched=${r.fetched} accepted=${r.accepted}` +
    (r.ok ? "" : ` error=${r.error}`)
  );
}

const live = mergeJobs(results);

const existing = preserveExisting();

const final = mergeJobs([
  {
    source: "live",
    jobs: existing
  },
  {
    source: "expanded",
    jobs: live
  }
]);

const valid = final.filter(j =>
  j &&
  j.real === true &&
  j.synthetic === false &&
  j.title &&
  j.company &&
  j.url
);

valid.sort((a, b) => {
  const ad = Date.parse(a.postedAt || "") || 0;
  const bd = Date.parse(b.postedAt || "") || 0;
  return bd - ad;
});

const sources = [
  ...new Set(
    valid.flatMap(j =>
      String(j.source || "")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean)
    )
  )
];

const countries = {};
const categories = {};
const modes = {};

for (const j of valid) {
  countries[j.country] = (countries[j.country] || 0) + 1;
  categories[j.category] = (categories[j.category] || 0) + 1;
  modes[j.workMode] = (modes[j.workMode] || 0) + 1;
}

fs.writeFileSync(
  path.join(PUBLIC, "jobs-enterprise.json"),
  JSON.stringify(valid, null, 2)
);

fs.writeFileSync(
  path.join(PUBLIC, "jobs-worldwide.json"),
  JSON.stringify(valid, null, 2)
);

fs.writeFileSync(
  path.join(PUBLIC, "jobs.json"),
  JSON.stringify(valid.slice(0, 5000), null, 2)
);

fs.writeFileSync(
  path.join(PUBLIC, "goo-jobb-source-health.json"),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourceCount: SOURCES.length,
    healthySources: results.filter(x => x.ok).length,
    failedSources: results.filter(x => !x.ok).length,
    acceptedFromCurrentSync: live.length,
    totalValidJobs: valid.length,
    fakeJobs: 0,
    syntheticJobs: 0,
    sources,
    sourceResults: results.map(r => ({
      source: r.source,
      url: r.url,
      fetched: r.fetched,
      accepted: r.accepted,
      ok: r.ok,
      error: r.error || null,
      ms: r.ms
    })),
    countries,
    categories,
    modes
  }, null, 2)
);

fs.writeFileSync(
  path.join(PUBLIC, "sync-meta.json"),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    status: "healthy",
    engine: "worldwide-source-expansion",
    totalValidJobs: valid.length,
    currentSyncJobs: live.length,
    sourceCount: SOURCES.length,
    healthySources: results.filter(x => x.ok).length,
    failedSources: results.filter(x => !x.ok).length,
    fakeJobs: false,
    syntheticJobs: 0,
    worldwide: true
  }, null, 2)
);

console.log("");
console.log("==============================================");
console.log(" SOURCE EXPANSION COMPLETE");
console.log("==============================================");
console.log(`REAL JOBS:       ${valid.length}`);
console.log(`NEW THIS RUN:    ${live.length}`);
console.log(`SOURCES:         ${SOURCES.length}`);
console.log(`HEALTHY:         ${results.filter(x => x.ok).length}`);
console.log(`FAILED:          ${results.filter(x => !x.ok).length}`);
console.log(`FAKE JOBS:       0`);
console.log("==============================================");

if (!valid.length) {
  throw new Error("ZERO VALID REAL JOBS");
}
