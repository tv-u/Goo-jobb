import fs from "node:fs/promises";
import crypto from "node:crypto";

const UA="GOO-JOBB/2026 (+https://tv-u.github.io/Goo-jobb/) real-job-indexer";
const OUT="public/jobs.json";
const STATUS="public/job-sync-status.json";

const feeds=[
["Arbeitnow","https://www.arbeitnow.com/api/job-board-api"],
["Jobicy","https://jobicy.com/api/v2/remote-jobs?count=200"],
["RemoteOK","https://remoteok.com/api"],
["Remotive","https://remotive.com/api/remote-jobs?limit=200"],
["WeWorkRemotely","https://weworkremotely.com/remote-jobs.rss"],
["WorkingNomads","https://www.workingnomads.com/jobsapi"],
["Jobspresso","https://jobspresso.co/feed/"],
["JobBoardSearch","https://jobboardsearch.com/feed"],
["RemoteLeads","https://remoteleads.com/feed/"],
["DailyRemote","https://dailyremote.com/remote-jobs/feed"],
["Remote4Me","https://remote4me.com/feed/"],
["Remotees","https://remotees.com/feed/"],
["UK Find a Job","https://findajob.dwp.gov.uk/search/feed"],
["WWR RSS","https://weworkremotely.com/remote-jobs.rss"],
["Remote OK RSS","https://remoteok.com/remote-jobs.rss"]
];

const greenhouse=[
"stripe","anthropic","databricks","figma","rippling","carta","coursera","github","cloudflare","coinbase",
"notion","hubspot","reddit","asana","airtable","brex","gusto","grammarly","intercom","duolingo"
];

const ashby=[
"openai","vercel","linear","ramp","deel","richtechrobotics","posthog","replit","perplexity","cursor"
];

const lever=[
"netflix","palantir","shopify","affirm","lyft","uber","lattice","vanta","verkada","brex"
];

const headers={
"user-agent":UA,
"accept":"application/json,application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8"
};

async function get(url){
 try{
   const c=new AbortController();const timer=setTimeout(()=>c.abort(),18000);
   const r=await fetch(url,{headers,signal:c.signal,redirect:"follow"});
   clearTimeout(timer);
   if(!r.ok)throw Error("HTTP "+r.status);
   return {url,status:r.status,ct:r.headers.get("content-type")||"",text:await r.text()};
 }catch(e){return {url,error:String(e.message||e)}}
}

function clean(x=""){return String(x).replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim()}
function hash(s){return crypto.createHash("sha256").update(s).digest("hex").slice(0,24)}

function normalize(x,source){
 const title=clean(x.title||x.name||x.position||x.job_title||"");
 const url=x.url||x.link||x.apply_url||x.job_url||x.hostedUrl||x.jobUrl||"";
 if(!title||!url||!/^https?:\/\//i.test(url))return null;
 const company=clean(x.company_name||x.company||x.organization||x.employer||x.companyName||source);
 const location=clean(x.location||x.candidate_required_location||x.jobGeo||x.job_geo||x.city||x.workplace||"");
 const description=clean(x.description||x.content||x.jobDescription||x.snippet||"");
 const published=x.publication_date||x.published||x.created_at||x.createdAt||x.date||x.updated_at||new Date().toISOString();
 const remote=/remote|worldwide|anywhere|work from home|distributed/i.test(`${title} ${location} ${description}`);
 let category=clean(x.category||x.category_name||x.industry||"");
 if(!category){
   const t=(title+" "+description).toLowerCase();
   if(/software|developer|engineer|devops|frontend|backend|full stack|programmer/.test(t))category="Engineering";
   else if(/design|ux|ui|creative/.test(t))category="Design";
   else if(/marketing|seo|content|growth/.test(t))category="Marketing";
   else if(/sales|account executive|business development/.test(t))category="Sales";
   else if(/finance|accounting|financial/.test(t))category="Finance";
   else if(/data scientist|data engineer|analytics|machine learning|ai /.test(t))category="Data";
   else if(/product manager|product owner/.test(t))category="Product";
   else if(/human resources|recruiter|talent/.test(t))category="Human Resources";
   else if(/customer support|customer success/.test(t))category="Customer Support";
   else category="Other";
 }
 return {
   id:hash(`${title}|${company}|${url}`),
   title,company,location,category,description,
   url,source,published,remote,
   tags:clean(x.tags||x.skills||"")
 };
}

function parseXml(txt,source){
 const out=[];
 const blocks=[...txt.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(m=>m[0]);
 for(const b of blocks){
   const val=(tag)=>{
     const m=b.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,"i"));
     return m?m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1"):"";
   };
   let link=val("link");
   if(!link){
     const m=b.match(/<link[^>]+href=["']([^"']+)["']/i);link=m?m[1]:"";
   }
   out.push(normalize({title:val("title"),link,url:link,description:val("description")||val("summary")||val("content"),company:val("company"),location:val("location"),published:val("pubDate")||val("published")||val("updated")},source));
 }
 return out.filter(Boolean);
}

function parseJson(text,source){
 let d;try{d=JSON.parse(text)}catch{return []}
 let a=Array.isArray(d)?d:(d.jobs||d.data||d.results||d.postings||d.items||[]);
 if(!Array.isArray(a))return [];
 return a.map(x=>normalize(x,source)).filter(Boolean);
}

async function one(source,url,kind="auto"){
 const r=await get(url);
 if(r.error)return {source,url,count:0,error:r.error,jobs:[]};
 let jobs=[];
 if(kind==="xml"||/xml|rss|atom/i.test(r.ct)||/<(rss|feed|item|entry)\b/i.test(r.text.slice(0,500)))jobs=parseXml(r.text,source);
 else jobs=parseJson(r.text,source);
 return {source,url,count:jobs.length,error:null,jobs};
}

async function greenhouseBoard(board){
 return one("Greenhouse:"+board,`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,"json");
}

async function ashbyBoard(board){
 return one("Ashby:"+board,`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`,"json");
}

async function leverBoard(board){
 return one("Lever:"+board,`https://api.lever.co/v0/postings/${encodeURIComponent(board)}?mode=json`,"json");
}

const tasks=[
 ...feeds.map(x=>()=>one(x[0],x[1])),
 ...greenhouse.map(x=>()=>greenhouseBoard(x)),
 ...ashby.map(x=>()=>ashbyBoard(x)),
 ...lever.map(x=>()=>leverBoard(x))
];

const results=[];
for(let i=0;i<tasks.length;i+=10){
 const batch=await Promise.all(tasks.slice(i,i+10).map(f=>f()));
 results.push(...batch);
 console.log(`BATCH ${Math.floor(i/10)+1}:`,batch.map(x=>`${x.source}=${x.count}${x.error?" ERROR":""}`).join(" | "));
}

const map=new Map();
for(const r of results){
 for(const j of r.jobs){
   const key=(j.url||"").replace(/[?#].*$/,"").replace(/\/$/,"").toLowerCase();
   if(!key)continue;
   const old=map.get(key);
   if(!old||String(j.description).length>String(old.description).length)map.set(key,j);
 }
}

let jobs=[...map.values()].filter(j=>j.title&&j.url);
jobs.sort((a,b)=>new Date(b.published||0)-new Date(a.published||0));

const generated_at=new Date().toISOString();
const payload={
 version:2,
 generated_at,
 total:jobs.length,
 source_count:results.filter(x=>x.count>0).length,
 connector_count:results.length,
 jobs
};

await fs.writeFile(OUT,JSON.stringify(payload));
await fs.writeFile(STATUS,JSON.stringify({
 generated_at,
 total:jobs.length,
 connectors:results.map(({jobs,...x})=>x)
},null,2));

console.log("\n========================================");
console.log("GOO-JOBB REAL JOB SYNC COMPLETE");
console.log("CONNECTORS:",results.length);
console.log("ACTIVE SOURCES:",payload.source_count);
console.log("UNIQUE REAL JOBS:",payload.total);
console.log("OUTPUT:",OUT);
console.log("========================================");

if(jobs.length===0){
 console.error("NO JOBS RETURNED. Dataset NOT fabricated.");
 process.exit(2);
}
