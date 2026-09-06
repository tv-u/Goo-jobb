import fs from "node:fs";

const OUT="public/jobs-worldwide.json";
const HEALTH="public/worldwide-extra-source-health.json";

const SOURCES=[
 {id:"greenhouse-airbnb",name:"Airbnb Careers",url:"https://boards-api.greenhouse.io/v1/boards/airbnb/jobs"},
 {id:"greenhouse-stripe",name:"Stripe Careers",url:"https://boards-api.greenhouse.io/v1/boards/stripe/jobs"},
 {id:"greenhouse-hubspot",name:"HubSpot Careers",url:"https://boards-api.greenhouse.io/v1/boards/hubspot/jobs"},
 {id:"greenhouse-mozilla",name:"Mozilla Careers",url:"https://boards-api.greenhouse.io/v1/boards/mozilla/jobs"},
 {id:"greenhouse-cloudflare",name:"Cloudflare Careers",url:"https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs"},
 {id:"greenhouse-gitlab",name:"GitLab Careers",url:"https://boards-api.greenhouse.io/v1/boards/gitlab/jobs"},
 {id:"greenhouse-okta",name:"Okta Careers",url:"https://boards-api.greenhouse.io/v1/boards/okta/jobs"},
 {id:"greenhouse-twilio",name:"Twilio Careers",url:"https://boards-api.greenhouse.io/v1/boards/twilio/jobs"},
 {id:"greenhouse-datadog",name:"Datadog Careers",url:"https://boards-api.greenhouse.io/v1/boards/datadog/jobs"},
 {id:"greenhouse-asana",name:"Asana Careers",url:"https://boards-api.greenhouse.io/v1/boards/asana/jobs"}
];

function clean(v=""){
 return String(v??"")
  .replace(/<[^>]*>/g," ")
  .replace(/&amp;/g,"&")
  .replace(/\\s+/g," ")
  .trim();
}

function slug(v=""){
 return clean(v)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\\u0300-\\u036f]/g,"")
  .replace(/[^a-z0-9]+/g,"-")
  .replace(/^-+|-+$/g,"")
  .slice(0,120);
}

function extract(data){
 if(Array.isArray(data)) return data;
 if(Array.isArray(data?.jobs)) return data.jobs;
 if(Array.isArray(data?.results)) return data.results;
 if(Array.isArray(data?.data)) return data.data;
 return [];
}

const health=[];
const additions=[];

for(const source of SOURCES){
 try{
  const r=await fetch(source.url,{
   headers:{
    "accept":"application/json",
    "user-agent":"GOO-JOBB/1.0"
   },
   signal:AbortSignal.timeout(20000)
  });

  if(!r.ok) throw new Error("HTTP "+r.status);

  const data=await r.json();
  const rows=extract(data);

  let accepted=0;

  for(const x of rows){
   const title=clean(x.title||x.name||x.job_title);
   const company=clean(x.company_name||x.company||source.name);
   const location=clean(
    x.location?.name||
    x.location||
    x.content?.location||
    "Worldwide / Unspecified"
   );

   const url=clean(
    x.absolute_url||
    x.url||
    x.job_url||
    x.apply_url||
    ""
   );

   if(!title||!url) continue;

   additions.push({
    id:slug(source.id+"-"+title+"-"+company+"-"+url),
    title,
    company,
    companySlug:slug(company),
    location,
    category:clean(x.departments?.[0]?.name||x.category||"General"),
    employmentType:clean(x.metadata?.find?.(m=>m.name==="Employment Type")?.value||x.employment_type||""),
    experience:clean(x.metadata?.find?.(m=>m.name==="Experience")?.value||""),
    remote:/remote|distributed|work from home/i.test(
      location+" "+title+" "+clean(x.content||x.description||"")
    ),
    salary:"",
    postedAt:x.updated_at||x.created_at||"",
    description:clean(x.content||x.description||""),
    url,
    applyUrl:url,
    source:source.name,
    sourceId:source.id,
    sourceHome:"https://www.greenhouse.com/",
    sourceCredit:source.name,
    fetchedAt:new Date().toISOString(),
    verifiedReal:true
   });

   accepted++;
  }

  health.push({
   id:source.id,
   name:source.name,
   ok:true,
   fetched:rows.length,
   accepted
  });

  console.log("OK",source.name,accepted);

 }catch(e){
  health.push({
   id:source.id,
   name:source.name,
   ok:false,
   fetched:0,
   accepted:0,
   error:String(e.message||e)
  });

  console.log("FAILED",source.name,String(e.message||e));
 }
}

let existing=[];
try{
 existing=JSON.parse(fs.readFileSync(OUT,"utf8"));
}catch{}

if(!Array.isArray(existing)) existing=[];

const map=new Map();

for(const j of existing){
 const key=String(j.url||j.applyUrl||(
  j.title+"|"+j.company+"|"+j.location
 )).toLowerCase().trim();

 if(key) map.set(key,j);
}

for(const j of additions){
 const key=String(j.url||j.applyUrl||(
  j.title+"|"+j.company+"|"+j.location
 )).toLowerCase().trim();

 if(key&&!map.has(key)) map.set(key,j);
}

const merged=[...map.values()]
 .filter(j=>j&&j.title&&j.company&&(j.url||j.applyUrl))
 .sort((a,b)=>{
  const da=Date.parse(a.postedAt||"")||0;
  const db=Date.parse(b.postedAt||"")||0;
  return db-da;
 });

if(!merged.length){
 throw new Error("No valid jobs. Existing dataset preserved.");
}

fs.writeFileSync(OUT,JSON.stringify(merged,null,2));

fs.writeFileSync(
 HEALTH,
 JSON.stringify({
  generatedAt:new Date().toISOString(),
  addedSources:SOURCES.length,
  healthySources:health.filter(x=>x.ok).length,
  failedSources:health.filter(x=>!x.ok).length,
  addedJobs:additions.length,
  finalJobs:merged.length,
  sources:health
 },null,2)
);

console.log("FINAL JOB COUNT:",merged.length);
