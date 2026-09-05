import fs from "node:fs/promises";

const UA = "GOO-JOBB/2026 (+https://tv-u.github.io/Goo-jobb/)";
const TIMEOUT = 18000;
const MAX_JOBS = 100000;

const sources = [
  {
    id:"arbeitnow",
    name:"Arbeitnow",
    type:"json",
    url:"https://www.arbeitnow.com/api/job-board-api"
  },
  {
    id:"jobicy",
    name:"Jobicy",
    type:"json",
    url:"https://jobicy.com/api/v2/remote-jobs?count=200"
  },
  {
    id:"remoteok",
    name:"Remote OK",
    type:"json",
    url:"https://remoteok.com/api"
  },
  {
    id:"remotive",
    name:"Remotive",
    type:"json",
    url:"https://remotive.com/api/remote-jobs?limit=100"
  },
  {
    id:"workingnomads",
    name:"Working Nomads",
    type:"rss",
    url:"https://www.workingnomads.com/jobs/rss"
  },
  {
    id:"weworkremotely",
    name:"We Work Remotely",
    type:"rss",
    url:"https://weworkremotely.com/remote-jobs.rss"
  },
  {
    id:"jobspresso",
    name:"Jobspresso",
    type:"rss",
    url:"https://jobspresso.co/feed/"
  },
  {
    id:"dailyremote",
    name:"DailyRemote",
    type:"rss",
    url:"https://dailyremote.com/remote-jobs/feed"
  },
  {
    id:"remoteleads",
    name:"Remote Leads",
    type:"rss",
    url:"https://remoteleads.io/feed/"
  },
  {
    id:"remote4me",
    name:"Remote4Me",
    type:"rss",
    url:"https://remote4me.com/feed/"
  },
  {
    id:"jobboardsearch",
    name:"Job Board Search",
    type:"rss",
    url:"https://jobboardsearch.com/feed/"
  },
  {
    id:"uk-find-a-job",
    name:"UK Find a Job",
    type:"rss",
    url:"https://findajob.dwp.gov.uk/search?rss=true"
  },

  ...[
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
  ].map(board => ({
    id:`greenhouse:${board}`,
    name:`Greenhouse:${board}`,
    type:"greenhouse",
    url:`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`
  })),

  ...[
    "openai",
    "linear",
    "ramp",
    "posthog",
    "replit",
    "perplexity",
    "cursor"
  ].map(board => ({
    id:`ashby:${board}`,
    name:`Ashby:${board}`,
    type:"ashby",
    url:`https://api.ashbyhq.com/posting-api/job-board/${board}`
  })),

  ...[
    "palantir",
    "lattice",
    "vanta",
    "verkada",
    "brex"
  ].map(board => ({
    id:`lever:${board}`,
    name:`Lever:${board}`,
    type:"lever",
    url:`https://api.lever.co/v0/postings/${board}?mode=json`
  }))
];

function clean(v){
  return String(v ?? "")
    .replace(/\s+/g," ")
    .trim();
}

function stripHtml(v){
  return clean(
    String(v ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi," ")
      .replace(/<style[\s\S]*?<\/style>/gi," ")
      .replace(/<[^>]+>/g," ")
      .replace(/&nbsp;/gi," ")
      .replace(/&amp;/gi,"&")
      .replace(/&quot;/gi,'"')
      .replace(/&#39;/gi,"'")
  );
}

function slug(v){
  return clean(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,100);
}

function validUrl(v){
  try{
    const u = new URL(v);
    return /^https?:$/.test(u.protocol);
  }catch{
    return false;
  }
}

function canonicalUrl(v){
  try{
    const u = new URL(v);
    u.hash = "";
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gh_src"
    ].forEach(x=>u.searchParams.delete(x));
    return u.toString();
  }catch{
    return "";
  }
}

function hashKey(v){
  let h = 2166136261;
  for(let i=0;i<v.length;i++){
    h ^= v.charCodeAt(i);
    h = Math.imul(h,16777619);
  }
  return (h>>>0).toString(16);
}

function isoDate(v){
  const d = new Date(v || "");
  return Number.isNaN(d.getTime())
    ? new Date().toISOString()
    : d.toISOString();
}

function normalizeJob(raw, source){
  const title = clean(
    raw.title ||
    raw.name ||
    raw.position ||
    raw.jobTitle ||
    raw.role
  );

  const company = clean(
    raw.company_name ||
    raw.companyName ||
    raw.company ||
    raw.employer ||
    raw.organization ||
    raw.company?.name ||
    source.name
  );

  const location = clean(
    raw.location ||
    raw.candidate_required_location ||
    raw.locations ||
    raw.jobLocation ||
    raw.workplace ||
    raw.address?.addressLocality ||
    ""
  );

  const description = stripHtml(
    raw.description ||
    raw.jobDescription ||
    raw.descriptionHtml ||
    raw.content ||
    raw.summary ||
    ""
  );

  const url =
    raw.url ||
    raw.apply_url ||
    raw.applyUrl ||
    raw.absolute_url ||
    raw.hostedUrl ||
    raw.jobUrl ||
    raw.link ||
    raw.redirect_url ||
    raw.applyLink ||
    "";

  if(!title || title.length < 2) return null;
  if(!validUrl(url)) return null;

  const applyUrl = url;

  const remote =
    /remote|work from home|worldwide|distributed/i.test(
      `${title} ${location} ${description}`
    );

  const category =
    /software|engineer|developer|devops|backend|frontend|full stack|data|machine learning|ai|cloud|security|cyber/i.test(title)
      ? "Engineering & Technology"
      : /design|ux|ui|creative/i.test(title)
      ? "Design"
      : /marketing|seo|content|growth/i.test(title)
      ? "Marketing"
      : /sales|business development|account executive/i.test(title)
      ? "Sales"
      : /finance|accounting|audit/i.test(title)
      ? "Finance"
      : /human resources|recruiter|talent/i.test(title)
      ? "Human Resources"
      : /customer|support|success/i.test(title)
      ? "Customer Success"
      : /product manager|product management/i.test(title)
      ? "Product"
      : /health|nurse|medical|clinical/i.test(title)
      ? "Healthcare"
      : /teacher|education|instructor|professor/i.test(title)
      ? "Education"
      : "Other";

  return {
    id: hashKey(
      canonicalUrl(applyUrl) ||
      `${title}|${company}|${location}`
    ),
    slug: `${slug(title)}-${hashKey(company+"|"+location)}`,
    title,
    company,
    location: location || (remote ? "Remote" : "Worldwide"),
    remote,
    category,
    description: description.slice(0,20000),
    url: applyUrl,
    applyUrl,
    source: source.name,
    sourceId: source.id,
    publishedAt: isoDate(
      raw.publication_date ||
      raw.published_at ||
      raw.publishedAt ||
      raw.created_at ||
      raw.createdAt ||
      raw.updated_at ||
      raw.updatedAt
    ),
    fetchedAt: new Date().toISOString()
  };
}

function extractJsonJobs(data, source){
  if(Array.isArray(data)){
    return data.map(x=>normalizeJob(x,source)).filter(Boolean);
  }

  if(Array.isArray(data?.jobs)){
    return data.jobs.map(x=>normalizeJob(x,source)).filter(Boolean);
  }

  if(Array.isArray(data?.data)){
    return data.data.map(x=>normalizeJob(x,source)).filter(Boolean);
  }

  if(Array.isArray(data?.postings)){
    return data.postings.map(x=>normalizeJob(x,source)).filter(Boolean);
  }

  return [];
}

function xmlEntities(s){
  return String(s)
    .replace(/&amp;/g,"&")
    .replace(/&lt;/g,"<")
    .replace(/&gt;/g,">")
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'");
}

function tag(block,name){
  const re = new RegExp(
    `<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,
    "i"
  );
  const m = block.match(re);
  return m ? xmlEntities(stripHtml(m[1])) : "";
}

function linkTag(block){
  const a = block.match(
    /<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i
  );
  if(a) return xmlEntities(stripHtml(a[1]));

  const b = block.match(
    /<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i
  );
  return b ? b[1] : "";
}

function parseFeed(xml,source){
  const blocks = xml.match(
    /<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi
  ) || [];

  return blocks.map(block=>{
    const url = linkTag(block);

    return normalizeJob({
      title:tag(block,"title"),
      description:
        tag(block,"description") ||
        tag(block,"content") ||
        tag(block,"summary"),
      location:
        tag(block,"location") ||
        tag(block,"job:location"),
      published_at:
        tag(block,"pubDate") ||
        tag(block,"published") ||
        tag(block,"updated"),
      url
    },source);
  }).filter(Boolean);
}

async function fetchText(url){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),TIMEOUT);

  try{
    const r = await fetch(url,{
      signal:controller.signal,
      headers:{
        "User-Agent":UA,
        "Accept":
          "application/json, application/rss+xml, application/atom+xml, text/xml, */*"
      }
    });

    if(!r.ok){
      throw new Error(`HTTP ${r.status}`);
    }

    return {
      status:r.status,
      contentType:r.headers.get("content-type") || "",
      text:await r.text()
    };
  }finally{
    clearTimeout(timer);
  }
}

async function runSource(source){
  try{
    const result = await fetchText(source.url);
    let jobs = [];

    if(
      source.type === "rss" ||
      /xml|rss|atom/i.test(result.contentType)
    ){
      jobs = parseFeed(result.text,source);
    }else{
      let data;

      try{
        data = JSON.parse(result.text);
      }catch{
        jobs = parseFeed(result.text,source);
      }

      if(data){
        if(source.type === "ashby"){
          jobs = (data.jobs || data.postings || [])
            .map(x=>normalizeJob({
              title:x.title,
              description:x.descriptionPlain || x.descriptionHtml || x.description,
              location:
                Array.isArray(x.location)
                  ? x.location.join(", ")
                  : x.location,
              url:x.jobUrl || x.applyUrl || x.hostedUrl,
              publishedAt:x.publishedAt || x.createdAt,
              company:x.companyName || source.name
            },source))
            .filter(Boolean);
        }else{
          jobs = extractJsonJobs(data,source);
        }
      }
    }

    return {
      source,
      ok:true,
      count:jobs.length,
      jobs
    };
  }catch(error){
    return {
      source,
      ok:false,
      count:0,
      jobs:[],
      error:String(error?.message || error)
    };
  }
}

function dedupe(jobs){
  const map = new Map();

  for(const job of jobs){
    const key =
      canonicalUrl(job.applyUrl) ||
      `${job.title}|${job.company}|${job.location}`.toLowerCase();

    if(!map.has(key)){
      map.set(key,job);
    }
  }

  return [...map.values()];
}

function sortJobs(jobs){
  return jobs.sort((a,b)=>
    new Date(b.publishedAt) -
    new Date(a.publishedAt)
  );
}

async function main(){
  console.log("========================================");
  console.log("GOO-JOBB REAL JOB ENGINE");
  console.log("Starting...");
  console.log(`Connectors: ${sources.length}`);
  console.log("========================================");

  const started = Date.now();
  const results = [];

  const BATCH = 10;

  for(let i=0;i<sources.length;i+=BATCH){
    const batch = sources.slice(i,i+BATCH);

    const out = await Promise.all(
      batch.map(runSource)
    );

    results.push(...out);

    for(const r of out){
      console.log(
        `${r.source.name}: ${r.ok ? r.count : "ERROR"}`
        + (r.error ? ` ${r.error}` : "")
      );
    }
  }

  let jobs = dedupe(
    results.flatMap(x=>x.jobs)
  );

  jobs = sortJobs(jobs).slice(0,MAX_JOBS);

  const now = new Date().toISOString();

  const sourceStatus = results.map(r=>({
    id:r.source.id,
    name:r.source.name,
    type:r.source.type,
    endpoint:r.source.url,
    ok:r.ok,
    jobs:r.count,
    error:r.error || null,
    checkedAt:now
  }));

  const payload = {
    version:1,
    generatedAt:now,
    total:jobs.length,
    maxCapacity:MAX_JOBS,
    realOnly:true,
    jobs
  };

  const status = {
    generatedAt:now,
    totalJobs:jobs.length,
    connectorCount:sources.length,
    activeSources:sourceStatus.filter(x=>x.ok && x.jobs>0).length,
    failedSources:sourceStatus.filter(x=>!x.ok).length,
    elapsedMs:Date.now()-started,
    sources:sourceStatus
  };

  await fs.mkdir("public",{recursive:true});

  await fs.writeFile(
    "public/jobs.json",
    JSON.stringify(payload),
    "utf8"
  );

  await fs.writeFile(
    "public/job-sync-status.json",
    JSON.stringify(status,null,2),
    "utf8"
  );

  await fs.writeFile(
    "public/jobs-count.txt",
    String(jobs.length),
    "utf8"
  );

  console.log("========================================");
  console.log("REAL JOB DATA:");
  console.log(`Jobs: ${jobs.length}`);
  console.log(`Active sources: ${status.activeSources}`);
  console.log(`Connectors: ${status.connectorCount}`);
  console.log(`Failed sources: ${status.failedSources}`);
  console.log(`Time: ${status.elapsedMs} ms`);
  console.log("========================================");

  if(jobs.length === 0){
    throw new Error("ZERO REAL JOBS — deployment stopped");
  }
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});
