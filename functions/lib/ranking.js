export function scoreJob(j,q=""){
  const x=q.toLowerCase().trim();if(!x)return Date.parse(j.posted_at||0)/1e10;
  let s=0;const t=(j.title||"").toLowerCase(),d=(j.description||"").toLowerCase(),c=(j.company||"").toLowerCase();
  if(t===x)s+=100;if(t.includes(x))s+=60;if(c.includes(x))s+=25;if(d.includes(x))s+=10;
  s+=Math.max(0,20-(Date.now()-Date.parse(j.posted_at||0))/86400000);
  return s;
}
