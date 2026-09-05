import fs from "node:fs";

const jobs=JSON.parse(
  fs.readFileSync("public/jobs-worldwide.json","utf8")
);

const normalize=s=>String(s??"")
 .toLowerCase()
 .normalize("NFKD")
 .replace(/[^\p{L}\p{N}\s-]/gu," ")
 .replace(/\s+/g," ")
 .trim();

const tokens=s=>[
  ...new Set(
    normalize(s)
      .split(" ")
      .filter(x=>x.length>=2)
  )
];

const index=jobs.map((j,i)=>({
  id:`job-${i+1}`,
  i,
  title:j.title,
  company:j.company,
  location:j.location,
  category:j.category,
  employmentType:j.employmentType,
  experience:j.experience,
  salary:j.salary,
  remote:!!j.remote,
  postedAt:j.postedAt,
  source:j.source,
  url:j.url,
  applyUrl:j.applyUrl,
  searchTokens:tokens([
    j.title,
    j.company,
    j.location,
    j.category,
    j.employmentType,
    j.experience,
    j.description
  ].join(" "))
}));

const facets={
  categories:{},
  companies:{},
  locations:{},
  sources:{},
  employmentTypes:{},
  experience:{},
  remote:{remote:0,nonRemote:0}
};

for(const j of jobs){
  for(const [bucket,value] of [
    ["categories",j.category],
    ["companies",j.company],
    ["locations",j.location],
    ["sources",j.source],
    ["employmentTypes",j.employmentType],
    ["experience",j.experience]
  ]){
    if(value){
      facets[bucket][value]=
        (facets[bucket][value]||0)+1;
    }
  }

  if(j.remote) facets.remote.remote++;
  else facets.remote.nonRemote++;
}

function sorted(obj){
  return Object.entries(obj)
    .sort((a,b)=>b[1]-a[1])
    .map(([name,count])=>({name,count}));
}

fs.writeFileSync(
  "public/jobs-search-index.json",
  JSON.stringify(index)
);

fs.writeFileSync(
  "public/jobs-facets.json",
  JSON.stringify({
    categories:sorted(facets.categories),
    companies:sorted(facets.companies),
    locations:sorted(facets.locations),
    sources:sorted(facets.sources),
    employmentTypes:sorted(facets.employmentTypes),
    experience:sorted(facets.experience),
    remote:facets.remote
  })
);

const companyMap=new Map();

for(const j of jobs){
  if(!companyMap.has(j.company)){
    companyMap.set(j.company,{
      name:j.company,
      jobs:0,
      locations:new Set(),
      categories:new Set(),
      sources:new Set(),
      remote:0
    });
  }

  const c=companyMap.get(j.company);

  c.jobs++;
  if(j.location)c.locations.add(j.location);
  if(j.category)c.categories.add(j.category);
  if(j.source)c.sources.add(j.source);
  if(j.remote)c.remote++;
}

const companies=[...companyMap.values()]
 .map(c=>({
   name:c.name,
   jobs:c.jobs,
   locations:[...c.locations].slice(0,100),
   categories:[...c.categories].slice(0,100),
   sources:[...c.sources],
   remote:c.remote
 }))
 .sort((a,b)=>b.jobs-a.jobs);

fs.writeFileSync(
  "public/companies-index.json",
  JSON.stringify(companies)
);

console.log(
  `V2 SEARCH INDEX: ${index.length} jobs`
);
console.log(
  `COMPANY INDEX: ${companies.length}`
);
