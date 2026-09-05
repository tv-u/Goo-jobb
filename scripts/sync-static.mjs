import fs from "node:fs/promises";

const SOURCES = [
  ["Arbeitnow","json","https://www.arbeitnow.com/api/job-board-api"],
  ["Jobicy","json","https://jobicy.com/api/v2/remote-jobs"],
  ["Remote OK","json","https://remoteok.com/api"],
  ["Remotive","json","https://remotive.com/api/remote-jobs"],
  ["Himalayas","json","https://himalayas.app/jobs/api"],
  ["We Work Remotely","rss","https://weworkremotely.com/remote-jobs.rss"],
  ["Startup Jobs","rss","https://startup.jobs/feed"],
  ["Working Nomads","rss","https://www.workingnomads.com/jobs/feed"],
  ["RemoteFR","rss","https://remotefr.com/feed"],
  ["Remote Leads","rss","https://remoteleads.io/feed"]
];

const clean = s => String(s ?? "")
  .replace(/<script[\s\S]*?<\/script>/gi," ")
  .replace(/<style[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]+>/g," ")
  .replace(/&nbsp;/gi," ")
  .replace(/&amp;/gi,"&")
  .replace(/&lt;/gi,"<")
  .replace(/&gt;/gi,">")
  .replace(/\s+/g," ")
  .trim();

const slug = s => clean(s)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^\w\s-]/g,"")
  .replace(/\s+/g,"-")
  .replace(/-+/g,"-")
  .slice(0,150);

function text(xml,tag){
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,"i"));
  return m ? clean(m[1]) : "";
}

function parseRSS(xml, source){
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return items.map(x => {
    const title = text(x,"title");
    const link = text(x,"link");
    const description = text(x,"description");
    const pub = text(x,"pubDate");
    if(!title || !link) return null;

    return {
      id: `${source}:${link}`,
      slug: slug(`${title}-${source}-${link}`),
      title,
      company: source,
      description,
      location: "",
      country: "",
      city: "",
      remote: /remote/i.test(title+" "+description),
      category: /software|developer|engineer|programming|tech/i.test(title)
        ? "technology"
        : /data|analytics|scientist/i.test(title)
        ? "data"
        : /marketing|sales|growth/i.test(title)
        ? "marketing"
        : "other",
      apply_url: link,
      source_url: link,
      source,
      published_at: pub ? new Date(pub).toISOString() : new Date().toISOString()
    };
  }).filter(Boolean);
}

function parseJSON(data,source){
  const arr = Array.isArray(data)
    ? data
    : Array.isArray(data.jobs)
    ? data.jobs
    : Array.isArray(data.data)
    ? data.data
    : [];

  return arr.map(j => {
    const title = j.title || j.position || j.name || "";
    const company = j.company_name || j.company || j.companyName || source;
    const url = j.url || j.apply_url || j.link || j.job_url || "";

    if(!title || !url) return null;

    const location =
      j.location ||
      j.candidate_required_location ||
      j.city ||
      "";

    const description =
      j.description ||
      j.job_description ||
      j.excerpt ||
      "";

    return {
      id: `${source}:${j.id || url}`,
      slug: slug(`${title}-${company}-${j.id || url}`),
      title: clean(title),
      company: clean(company),
      description: clean(description),
      location: clean(location),
      country: clean(j.country || ""),
      city: clean(j.city || ""),
      remote: Boolean(
        j.remote ||
        /remote/i.test(`${title} ${location} ${description}`)
      ),
      category:
        /software|developer|engineer|programming|devops|frontend|backend/i.test(title)
          ? "technology"
          : /data|analytics|scientist|machine learning|ai/i.test(title)
          ? "data"
          : /marketing|sales|growth/i.test(title)
          ? "marketing"
          : /finance|accounting/i.test(title)
          ? "finance"
          : "other",
      apply_url: url,
      source_url: url,
      source,
      published_at: j.publication_date ||
                    j.published_at ||
                    j.date ||
                    new Date().toISOString()
    };
  }).filter(Boolean);
}

async function fetchSource(name,type,url){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),15000);

  try {
    const r = await fetch(url,{
      signal:controller.signal,
      headers:{
        "user-agent":"GOO-JOBB-Static-Sync/1.0",
        "accept":"application/json,application/rss+xml,application/xml,text/xml,*/*"
      }
    });

    if(!r.ok) throw new Error(`HTTP ${r.status}`);

    const body = await r.text();

    if(body.length > 10000000)
      throw new Error("response too large");

    if(type === "rss")
      return parseRSS(body,name);

    try {
      return parseJSON(JSON.parse(body),name);
    } catch {
      return [];
    }
  } finally {
    clearTimeout(timer);
  }
}

const all = [];
const health = [];

for(const [name,type,url] of SOURCES){
  try{
    const jobs = await fetchSource(name,type,url);

    all.push(...jobs);

    health.push({
      source:name,
      status:"ok",
      jobs:jobs.length,
      synced_at:new Date().toISOString()
    });

    console.log(`OK   ${name}: ${jobs.length}`);
  }catch(error){
    health.push({
      source:name,
      status:"error",
      jobs:0,
      error:String(error.message || error),
      synced_at:new Date().toISOString()
    });

    console.log(`FAIL ${name}: ${error.message}`);
  }
}

const unique = new Map();

for(const job of all){
  const key =
    String(job.apply_url || job.id)
      .toLowerCase()
      .trim();

  if(!unique.has(key))
    unique.set(key,job);
}

const jobs = [...unique.values()]
  .sort((a,b) =>
    new Date(b.published_at || 0) -
    new Date(a.published_at || 0)
  );

const output = {
  generated_at:new Date().toISOString(),
  total:jobs.length,
  sources:health,
  jobs
};

await fs.mkdir("data",{recursive:true});

await fs.writeFile(
  "data/jobs.json",
  JSON.stringify(output)
);

await fs.writeFile(
  "data/health.json",
  JSON.stringify({
    generated_at:output.generated_at,
    total:output.total,
    sources:health
  },null,2)
);

console.log("");
console.log(`TOTAL REAL JOBS: ${jobs.length}`);
