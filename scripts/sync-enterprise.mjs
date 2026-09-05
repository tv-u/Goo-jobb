import fs from'fs/promises';
const A=[
['jobicy','https://jobicy.com/api/v2/remote-jobs?count=200'],
['remoteok','https://remoteok.com/api'],
['remotive','https://remotive.com/api/remote-jobs?limit=100'],
['arbeitnow','https://www.arbeitnow.com/api/job-board-api'],
['wwr','https://weworkremotely.com/remote-jobs.rss'],
['workingnomads','https://www.workingnomads.com/jobs/rss']
];
const get=async([n,u])=>{try{let r=await fetch(u,{headers:{'user-agent':'GOO-JOBB/Enterprise'},signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(r.status);let t=await r.text();return[n,t]}catch(e){return[n,'']}};
const X=await Promise.all(A.map(get));let jobs=[],seen=new Set();
for(const[n,t]of X){try{let j=JSON.parse(t);j=j.jobs||j.data||j;if(Array.isArray(j))for(const x of j){let title=x.title||x.position||x.name;if(!title)continue;let url=x.url||x.apply_url||x.job_url;if(!url)continue;let k=(title+'|'+(x.company||x.company_name||'')+'|'+url).toLowerCase();if(seen.has(k))continue;seen.add(k);jobs.push({id:k.slice(0,180),title,company:x.company||x.company_name||'Unknown',location:x.location||'Remote / Worldwide',category:x.category||x.tags||'General',url,source:n,date:x.date||x.publication_date||new Date().toISOString(),description:x.description||''})}}catch{}}
jobs.sort((a,b)=>new Date(b.date)-new Date(a.date));
await fs.writeFile('public/jobs.json',JSON.stringify(jobs));
await fs.writeFile('public/job-sync-status.json',JSON.stringify({updated:new Date().toISOString(),jobs:jobs.length,sources:A.length}));
console.log(`GOO-JOBB REAL JOBS: ${jobs.length}`);
if(!jobs.length)process.exit(1);
