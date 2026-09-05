import fs from "node:fs";
import crypto from "node:crypto";

const OUTPUT = "public/jobs.json";
const STATUS = "public/job-sync-status.json";

const SOURCES = [

/* ================= DIRECT JSON ================= */

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
 url:"https://remotive.com/api/remote-jobs"
},

/* ================= RSS ================= */

{
 id:"startupjobs",
 name:"Startup Jobs",
 type:"rss",
 url:"https://startup.jobs/feed"
},

{
 id:"weworkremotely",
 name:"We Work Remotely",
 type:"rss",
 url:"https://weworkremotely.com/remote-jobs.rss"
},

{
 id:"workingnomads",
 name:"Working Nomads",
 type:"rss",
 url:"https://www.workingnomads.com/remote-jobs.rss"
},

{
 id:"remotejobs",
 name:"RemoteJobs.org",
 type:"rss",
 url:"https://remotejobs.org/feed"
},

{
 id:"nodesk",
 name:"NoDesk",
 type:"rss",
 url:"https://nodesk.co/remote-jobs/feed/"
},

{
 id:"remoteleads",
 name:"Remote Leads",
 type:"rss",
 url:"https://remoteleads.io/feed/"
},

{
 id:"dailyremote",
 name:"DailyRemote",
 type:"rss",
 url:"https://dailyremote.com/remote-jobs.rss"
},

{
 id:"jobspresso",
 name:"Jobspresso",
 type:"rss",
 url:"https://jobspresso.co/feed/"
},

{
 id:"remote4me",
 name:"Remote4Me",
 type:"rss",
 url:"https://remote4me.com/feed/"
},

{
 id:"remotees",
 name:"Remotees",
 type:"rss",
 url:"https://remotees.com/feed/"
},

{
 id:"jobboardsearch",
 name:"Job Board Search",
 type:"rss",
 url:"https://jobboardsearch.com/feed/"
},

{
 id:"uk-find-job",
 name:"UK Find a Job",
 type:"rss",
 url:"https://findajob.dwp.gov.uk/search/rss"
},

/* ================= GREENHOUSE ================= */

{
 id:"gh-stripe",
 name:"Stripe",
 type:"greenhouse",
 url:"https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true"
},

{
 id:"gh-anthropic",
 name:"Anthropic",
 type:"greenhouse",
 url:"https://boards-api.greenhouse.io/v1/boards/anthropic/jobs?content=true"
},

{
 id:"gh-databricks",
 name:"Databricks",
 type:"greenhouse",
 url:"https://boards-api.greenhouse.io/v1/boards/databricks/jobs?content=true"
},

{
 id:"gh-figma",
 name:"Figma",
 type:"greenhouse",
 url:"https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true"
},

{
 id:"gh-rippling",
 name:"Rippling",
 type:"greenhouse",
 url:"https://boards-api.greenhouse.io/v1/boards/rippling/jobs?content=true"
},

{
 id:"gh-carta",
 name:"Carta",
 type:"greenhouse",
 url:"https://boards-api.greenhouse.io/v1/boards/carta/jobs?content=true"
},

{
 id:"gh-coursera",
 name:"Coursera",
 type:"greenhouse",
 url:"https://boards-api.greenhouse.io/v1/boards/coursera/jobs?content=true"
},

{
 id:"gh-github",
 name:"GitHub",
 type:"greenhouse",
 url:"https://boards-api.greenhouse.io/v1/boards/github/jobs?content=true"
},

{
 id:"gh-cloudflare",
 name:"Cloudflare",
 type:"greenhouse",
 url:"https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs?content=true"
},

{
 id:"gh-coinbase",
 name:"Coinbase",
 type:"greenhouse",
 url:"https://boards-api.greenhouse.io/v1/boards/coinbase/jobs?content=true"
},

/* ================= LEVER ================= */

{
 id:"lever-netflix",
 name:"Netflix",
 type:"lever",
 url:"https://api.lever.co/v0/postings/netflix?mode=json"
},

{
 id:"lever-palantir",
 name:"Palantir",
 type:"lever",
 url:"https://api.lever.co/v0/postings/palantir?mode=json"
},

{
 id:"lever-shopify",
 name:"Shopify",
 type:"lever",
 url:"https://api.lever.co/v0/postings/shopify?mode=json"
},

{
 id:"lever-affirm",
 name:"Affirm",
 type:"lever",
 url:"https://api.lever.co/v0/postings/affirm?mode=json"
},

{
 id:"lever-lyft",
 name:"Lyft",
 type:"lever",
 url:"https://api.lever.co/v0/postings/lyft?mode=json"
},

{
 id:"lever-uber",
 name:"Uber",
 type:"lever",
 url:"https://api.lever.co/v0/postings/uber?mode=json"
},

{
 id:"lever-lattice",
 name:"Lattice",
 type:"lever",
 url:"https://api.lever.co/v0/postings/lattice?mode=json"
},

{
 id:"lever-vanta",
 name:"Vanta",
 type:"lever",
 url:"https://api.lever.co/v0/postings/vanta?mode=json"
},

{
 id:"lever-verkada",
 name:"Verkada",
 type:"lever",
 url:"https://api.lever.co/v0/postings/verkada?mode=json"
},

{
 id:"lever-brex",
 name:"Brex",
 type:"lever",
 url:"https://api.lever.co/v0/postings/brex?mode=json"
}

];

const sleep = ms => new Promise(r => setTimeout(r,ms));

function clean(value=""){
 return String(value ?? "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi,"$1")
  .replace(/<script[\s\S]*?<\/script>/gi," ")
  .replace(/<style[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]+>/g," ")
  .replace(/&nbsp;/gi," ")
  .replace(/&amp;/gi,"&")
  .replace(/&quot;/gi,'"')
  .replace(/&#39;/gi,"'")
  .replace(/\s+/g," ")
  .trim();
}

function hash(value){
 return crypto
  .createHash("sha256")
  .update(value)
  .digest("hex");
}

function category(title,description){

 const x = `${title} ${description}`.toLowerCase();

 const rules = [

 ["engineering",/software|developer|engineer|programmer|frontend|backend|full.?stack|devops|sre|qa|cloud|coding|javascript|typescript|python|java|golang|rust|react|node/],

 ["data-ai",/data scientist|data engineer|machine learning|artificial intelligence|\bai\b|analytics|analyst|nlp|computer vision/],

 ["cybersecurity",/cybersecurity|cyber security|information security|infosec|security engineer|soc analyst|penetration test/],

 ["design",/designer|ux|ui|graphic design|product design|creative/],

 ["marketing",/marketing|seo|sem|growth|content marketing|social media|brand/],

 ["sales",/sales|account executive|business development|bdr|sdr|revenue/],

 ["customer-support",/customer support|customer success|help desk|technical support|customer service/],

 ["finance",/finance|financial|accounting|accountant|bookkeeper|audit|investment/],

 ["human-resources",/human resources|\bhr\b|recruiter|recruiting|talent acquisition|people operations/],

 ["legal",/legal|lawyer|attorney|compliance|privacy/],

 ["operations",/operations|project manager|program manager|supply chain|logistics|procurement/],

 ["healthcare",/healthcare|medical|clinical|nurse|doctor|pharmacy/],

 ["education",/education|teacher|instructor|professor|academic|tutor/],

 ["product",/product manager|product management|product owner/]

 ];

 for(const [name,re] of rules){
  if(re.test(x)) return name;
 }

 return "other";
}

function isRemote(text){
 return /remote|work from home|work-from-home|worldwide|anywhere|distributed|telecommute/i.test(text);
}

function normalize(raw,source){

 const title = clean(
  raw.title ||
  raw.name ||
  raw.position ||
  raw.jobTitle ||
  raw.job_title
 );

 const description = clean(
  raw.description ||
  raw.content ||
  raw.content_html ||
  raw.summary ||
  raw.body ||
  raw.snippet
 );

 const company = clean(
  raw.company_name ||
  raw.company ||
  raw.companyName ||
  raw.organization ||
  raw.employer ||
  raw.hiringOrganization?.name ||
  source.name
 );

 let location = clean(
  raw.location ||
  raw.jobLocation ||
  raw.candidate_required_location ||
  raw.candidate_required_locations ||
  raw.city ||
  raw.country
 );

 if(Array.isArray(raw.locations)){
  location = raw.locations
   .map(x=>clean(
    typeof x==="string"
     ? x
     : x.name || x.city || x.country
   ))
   .filter(Boolean)
   .join(", ");
 }

 if(!location) location="Worldwide";

 const url =
  raw.url ||
  raw.job_url ||
  raw.apply_url ||
  raw.absolute_url ||
  raw.hostedUrl ||
  raw.hosted_url ||
  raw.link ||
  raw.applyUrl ||
  "";

 if(!title || !url) return null;

 const published =
  raw.publication_date ||
  raw.publicationDate ||
  raw.created_at ||
  raw.createdAt ||
  raw.created ||
  raw.date ||
  raw.published ||
  raw.publishedAt ||
  raw.updated_at ||
  raw.updatedAt ||
  new Date().toISOString();

 const canonical = String(url).trim();

 const id = hash(
  `${company}|${title}|${location}|${canonical}`
   .toLowerCase()
 );

 const text = `${title} ${description} ${location}`;

 return {
  id,
  title,
  company,
  location,
  description,
  url:canonical,
  apply_url:canonical,
  source:source.name,
  source_id:source.id,
  category:category(title,description),
  remote:isRemote(text),
  published_at:published,
  fetched_at:new Date().toISOString()
 };
}

function xmlTag(xml,tag){

 const re = new RegExp(
  `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
  "i"
 );

 const match = xml.match(re);

 return match
  ? clean(match[1])
  : "";
}

function parseRSS(xml,source){

 const jobs=[];

 const items =
  xml.match(/<item[\s\S]*?<\/item>/gi) || [];

 for(const item of items){

  let link =
   xmlTag(item,"link") ||
   xmlTag(item,"guid");

  const job = normalize({
   title:xmlTag(item,"title"),
   description:
    xmlTag(item,"description") ||
    xmlTag(item,"content:encoded"),
   link,
   published:
    xmlTag(item,"pubDate") ||
    xmlTag(item,"published") ||
    xmlTag(item,"dc:date")
  },source);

  if(job) jobs.push(job);
 }

 return jobs;
}

async function fetchOne(source){

 const started=Date.now();

 try{

  const controller=new AbortController();

  const timeout=setTimeout(
   ()=>controller.abort(),
   30000
  );

  const response=await fetch(
   source.url,
   {
    signal:controller.signal,
    headers:{
     "user-agent":
      "GOO-JOBB-Live-Aggregator/5.0",
     "accept":
      "application/json,application/rss+xml,application/xml,text/xml,text/plain,*/*"
    }
   }
  );

  clearTimeout(timeout);

  if(!response.ok){
   throw new Error(`HTTP ${response.status}`);
  }

  const body=await response.text();

  if(!body || body.length<5){
   throw new Error("Empty response");
  }

  let jobs=[];

  if(source.type==="rss"){

   jobs=parseRSS(body,source);

  }else{

   const json=JSON.parse(body);

   let array=[];

   if(Array.isArray(json)){
    array=json;
   }

   if(Array.isArray(json.jobs)){
    array=json.jobs;
   }

   if(Array.isArray(json.data)){
    array=json.data;
   }

   if(Array.isArray(json.postings)){
    array=json.postings;
   }

   jobs=array
    .map(x=>normalize(x,source))
    .filter(Boolean);
  }

  return {
   source,
   jobs,
   ok:true,
   ms:Date.now()-started,
   error:null
  };

 }catch(error){

  return {
   source,
   jobs:[],
   ok:false,
   ms:Date.now()-started,
   error:String(error?.message || error)
  };
 }
}

async function main(){

 console.log("");
 console.log("==========================================");
 console.log("GOO-JOBB LIVE 40 SOURCE ENGINE");
 console.log("==========================================");
 console.log("");

 const started=Date.now();

 const results=[];

 /*
  PARALLEL FETCH
  This is much faster than sequential fetching.
 */
 const batchSize=10;

 for(
  let i=0;
  i<SOURCES.length;
  i+=batchSize
 ){

  const batch=SOURCES.slice(
   i,
   i+batchSize
  );

  const output=await Promise.all(
   batch.map(fetchOne)
  );

  results.push(...output);

  for(const r of output){

   if(r.ok){
    console.log(
     `✓ ${r.source.name}: ${r.jobs.length} jobs (${r.ms}ms)`
    );
   }else{
    console.log(
     `✗ ${r.source.name}: ${r.error}`
    );
   }
  }

  await sleep(50);
 }

 /*
  DEDUPE
 */
 const unique=new Map();

 for(const result of results){

  for(const job of result.jobs){

   if(!unique.has(job.id)){
    unique.set(job.id,job);
   }
  }
 }

 const jobs=[...unique.values()];

 /*
  newest first
 */
 jobs.sort((a,b)=>{

  const A=Date.parse(a.published_at)||0;
  const B=Date.parse(b.published_at)||0;

  return B-A;
 });

 /*
  stats
 */
 const successful=
  results.filter(x=>x.ok);

 const failed=
  results.filter(x=>!x.ok);

 const categories={};

 for(const job of jobs){
  categories[job.category] =
   (categories[job.category]||0)+1;
 }

 const status={
  version:"5.0",
  generated_at:new Date().toISOString(),
  duration_ms:Date.now()-started,
  source_count:SOURCES.length,
  successful_sources:successful.length,
  failed_sources:failed.length,
  total_unique_jobs:jobs.length,
  categories,
  sources:results.map(r=>({
   id:r.source.id,
   name:r.source.name,
   type:r.source.type,
   url:r.source.url,
   ok:r.ok,
   jobs:r.jobs.length,
   latency_ms:r.ms,
   error:r.error
  }))
 };

 const payload={
  version:"5.0",
  generated_at:status.generated_at,
  total:jobs.length,
  source_count:SOURCES.length,
  jobs
 };

 fs.mkdirSync("public",{recursive:true});

 fs.writeFileSync(
  OUTPUT,
  JSON.stringify(payload)
 );

 fs.writeFileSync(
  STATUS,
  JSON.stringify(status,null,2)
 );

 console.log("");
 console.log("==========================================");
 console.log("LIVE SYNC FINISHED");
 console.log("==========================================");
 console.log(`Sources       : ${SOURCES.length}`);
 console.log(`Successful    : ${successful.length}`);
 console.log(`Failed        : ${failed.length}`);
 console.log(`Unique jobs   : ${jobs.length}`);
 console.log(`Duration      : ${status.duration_ms} ms`);
 console.log("==========================================");

 if(jobs.length===0){

  console.error("");
  console.error(
   "ERROR: ZERO LIVE JOBS RECEIVED."
  );
  console.error(
   "No fake records were generated."
  );

  process.exit(1);
 }
}

main();
