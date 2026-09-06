(()=>{"use strict";
const S={jobs:[],ready:false};

const SKILLS=[
"javascript","typescript","python","java","c++","c#","php","ruby","go","rust",
"react","next.js","vue","angular","node.js","nodejs","express","django","flask",
"spring","laravel","sql","mysql","postgresql","mongodb","redis","graphql",
"aws","azure","gcp","cloudflare","docker","kubernetes","terraform","git",
"github","gitlab","linux","html","css","tailwind","figma","firebase","supabase",
"machine learning","artificial intelligence","ai","data science","data analysis",
"excel","power bi","tableau","salesforce","sap","seo","marketing","sales",
"communication","project management","product management","customer support",
"recruiting","finance","accounting","hr","human resources"
];

function str(v){return v==null?"":String(v)}
function text(j){
return [
j.title,j.company,j.location,j.description,j.category,j.type,j.remote,
j.skills,j.tags,j.salary,j.country,j.city,j.source
].map(str).join(" ").toLowerCase()
}

function words(q){
return str(q).toLowerCase().split(/[^a-z0-9+#.]+/).filter(x=>x.length>1)
}

function scoreJob(j,q){
const query=words(q);
if(!query.length)return 0;
const t=text(j);
const title=str(j.title).toLowerCase();
const skills=str(j.skills).toLowerCase();
const company=str(j.company).toLowerCase();
let score=0;

for(const w of query){
if(t.includes(w))score+=10;
if(title.includes(w))score+=25;
if(skills.includes(w))score+=20;
if(company.includes(w))score+=8;
}

if(j.remote===true||/remote|work from home|wfh|distributed/i.test(t))score+=5;

return score;
}

function search(q,limit=50){
return S.jobs
.map(j=>({...j,_score:scoreJob(j,q)}))
.filter(j=>j._score>0)
.sort((a,b)=>b._score-a._score)
.slice(0,Math.max(1,Number(limit)||50));
}

function extractSkills(value){
const t=str(value).toLowerCase();
return SKILLS.filter(s=>t.includes(s.toLowerCase()));
}

function analyzeResume(value){
const found=extractSkills(value);
const missing=SKILLS.filter(s=>!found.includes(s)).slice(0,15);
return {
skills:found,
skillCount:found.length,
suggestedSkills:missing,
wordCount:words(value).length,
message:found.length
?"Resume skills detected locally."
:"No recognized skills detected yet."
};
}

function matchResume(resume,job){
const a=new Set(extractSkills(resume));
const b=extractSkills(text(job));
const matched=b.filter(x=>a.has(x));
const missing=b.filter(x=>!a.has(x));
const score=b.length?Math.round(matched.length/b.length*100):0;
return {score,matched,missing};
}

function isRemote(job){
const t=text(job);
return job.remote===true||
/remote|work from home|wfh|distributed/i.test(t);
}

function salaryIntel(jobs=S.jobs){
const values=[];
for(const j of jobs){
const m=str(j.salary).match(/\d[\d,.]*/g)||[];
for(const x of m){
const n=Number(x.replace(/,/g,""));
if(Number.isFinite(n)&&n>100)values.push(n);
}
}
if(!values.length)return{available:false,count:0};
return{
available:true,
count:values.length,
min:Math.min(...values),
max:Math.max(...values),
average:Math.round(values.reduce((a,b)=>a+b,0)/values.length)
};
}

async function load(){
const urls=[
"./jobs-worldwide.json",
"./jobs-enterprise.json",
"./jobs.json"
];

for(const u of urls){
try{
const r=await fetch(u+"?localai="+Date.now(),{cache:"no-store"});
if(!r.ok)continue;
const d=await r.json();
const a=Array.isArray(d)?d:(d.jobs||d.data||d.results||[]);
if(Array.isArray(a)&&a.length){
S.jobs=a;
S.ready=true;
break;
}
}catch(e){}
}

window.dispatchEvent(new CustomEvent("goo-jobb-ai-ready",{
detail:{count:S.jobs.length}
}));

return S.jobs;
}

window.GooJobbAI={
version:"2.0-local",
provider:"browser-local",
apiKeyRequired:false,
externalApi:false,
load,
search,
scoreJob,
extractSkills,
analyzeResume,
matchResume,
isRemote,
salaryIntel,
getJobs:()=>S.jobs,
isReady:()=>S.ready
};

load();
})();