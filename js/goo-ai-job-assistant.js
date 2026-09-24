(function(){
"use strict";

if(window.GOO_AI_JOB_ASSISTANT)return;

const STOP=new Set([
"the","and","for","with","from","this","that","your","you","are","our",
"job","jobs","work","working","role","roles","years","year","will","have",
"has","into","their","they","them","about","over","under","using","use",
"required","requirements","preferred","apply","company","location","india"
]);

const SKILLS=[
"javascript","typescript","react","next.js","node.js","node",
"python","java","c++","c#","php","ruby","go","rust","sql",
"mysql","postgresql","mongodb","redis","aws","azure","gcp",
"docker","kubernetes","git","github","html","css","tailwind",
"angular","vue","svelte","flutter","android","ios",
"machine learning","artificial intelligence","ai","data science",
"data analysis","excel","power bi","tableau","salesforce",
"figma","ui/ux","marketing","seo","content writing",
"customer service","project management","communication",
"finance","accounting","hr","recruitment","operations"
];

function text(el){
return (el&&el.textContent||"").replace(/\s+/g," ").trim();
}

function cards(){
const selectors=[
".job-card",".job-item",".job-result",".job-result-card",
"[data-job-card]","[data-job-id]","article"
];
const out=[];
const seen=new Set();

selectors.forEach(s=>{
document.querySelectorAll(s).forEach(el=>{
if(!seen.has(el)){
seen.add(el);
out.push(el);
}
});
});

return out;
}

function normalize(s){
return String(s||"").toLowerCase().replace(/[^a-z0-9+#.]+/g," ");
}

function tokens(s){
return normalize(s).split(/\s+/).filter(x=>x.length>2&&!STOP.has(x));
}

function skills(s){
const n=normalize(s);
return SKILLS.filter(x=>n.includes(normalize(x)));
}

function jobData(el){
const t=text(el);
const a=el.querySelector("a[href]");
return {
el:el,
text:t,
title:text(el.querySelector("h1,h2,h3,h4,.job-title,[data-job-title]"))||t.slice(0,100),
url:a?a.href:""
};
}

function analyze(){
const data=cards().map(jobData);
const all=data.map(x=>x.text).join(" ");
const found=skills(all);

return {
jobs:data.length,
skills:[...new Set(found)],
keywords:[...new Set(tokens(all))].slice(0,80)
};
}

function scoreJob(job,profile){
const jt=normalize(job.text);
const wanted=skills(profile);
if(!wanted.length)return 0;

let hit=0;
wanted.forEach(s=>{
if(jt.includes(normalize(s)))hit++;
});

return Math.round((hit/wanted.length)*100);
}

function panel(){
if(document.getElementById("goo-ai-panel"))return;

const box=document.createElement("aside");
box.id="goo-ai-panel";
box.innerHTML=
'<div class="goo-ai-head">'+
'<div><b>GOO AI</b><small>Local Job Assistant</small></div>'+
'<button id="goo-ai-close" type="button">×</button>'+
'</div>'+
'<div class="goo-ai-body">'+
'<p class="goo-ai-note">Runs locally on this page. No API key, login or job data upload.</p>'+
'<label>Your skills / target role</label>'+
'<textarea id="goo-ai-profile" placeholder="Example: Python, SQL, React, remote, data analyst"></textarea>'+
'<button id="goo-ai-analyze" type="button">Analyze Live Jobs</button>'+
'<div id="goo-ai-result"></div>'+
'</div>';

document.body.appendChild(box);

document.getElementById("goo-ai-close").onclick=()=>{
box.classList.remove("open");
};

document.getElementById("goo-ai-analyze").onclick=run;
}

function run(){
const result=document.getElementById("goo-ai-result");
const profile=document.getElementById("goo-ai-profile").value.trim();
const info=analyze();

if(!profile){
result.innerHTML=
'<div class="goo-ai-card">'+
'<b>Tell me your skills first.</b>'+
'<p>Example: Python, SQL, AWS, data analysis</p>'+
'</div>';
return;
}

const jobs=cards().map(jobData);

if(!jobs.length){
result.innerHTML=
'<div class="goo-ai-card">'+
'<b>No loaded jobs yet.</b>'+
'<p>Scroll/search the Jobs page so real jobs load, then run the analysis again.</p>'+
'</div>';
return;
}

const ranked=jobs
.map(j=>({j:j,s:scoreJob(j,profile)}))
.filter(x=>x.s>0)
.sort((a,b)=>b.s-a.s)
.slice(0,8);

let html=
'<div class="goo-ai-card">'+
'<b>Local AI analysis</b>'+
'<p>Analyzed '+jobs.length+' currently loaded real job cards.</p>'+
'<p><b>Detected skills:</b> '+(info.skills.slice(0,20).join(", ")||"None detected")+'</p>'+
'</div>';

if(ranked.length){
html+='<div class="goo-ai-card"><b>Skill-match results</b>';
ranked.forEach(x=>{
const title=x.j.title.replace(/</g,"&lt;");
const url=x.j.url;
html+='<div class="goo-ai-job">'+
'<div><b>'+title+'</b><span>'+x.s+'% keyword match</span></div>'+
(url?'<a href="'+url.replace(/"/g,"&quot;")+'">Open job →</a>':'')+
'</div>';
});
html+='</div>';
}else{
html+='<div class="goo-ai-card"><b>No keyword match found</b><p>Try broader skills or another target role.</p></div>';
}

result.innerHTML=html;
}

function open(){
panel();
document.getElementById("goo-ai-panel").classList.add("open");
}

function button(){
if(document.getElementById("goo-ai-launch"))return;

const b=document.createElement("button");
b.id="goo-ai-launch";
b.type="button";
b.innerHTML="✦ GOO AI";
b.title="Open local AI Job Assistant";
b.onclick=open;
document.body.appendChild(b);
}

function start(){
button();
}

if(document.readyState==="loading"){
document.addEventListener("DOMContentLoaded",start,{once:true});
}else{
start();
}

window.GOO_AI_JOB_ASSISTANT={
version:"1.0.0",
open:open,
analyze:analyze,
loadedJobs:function(){return cards().length}
};

})();
