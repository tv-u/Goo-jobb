const countries={"india":"IN","united states":"US","usa":"US","united kingdom":"GB","uk":"GB","canada":"CA","australia":"AU","germany":"DE","france":"FR","netherlands":"NL","singapore":"SG","ireland":"IE","remote":"REMOTE"};
export function normalizeLocation(v=""){
  const raw=String(v).replace(/\s+/g," ").trim(); const low=raw.toLowerCase();
  let country="",code="";
  for(const [n,c] of Object.entries(countries))if(low.includes(n)){country=n==="usa"?"United States":n.replace(/\b\w/g,x=>x.toUpperCase());code=c;break}
  const remote=/remote|work from home|anywhere|distributed/i.test(raw);
  const parts=raw.split(",").map(x=>x.trim()).filter(Boolean);
  return {location:raw,country,country_code:code,city:parts[0]||"",remote_type:remote?"remote":"onsite"};
}
