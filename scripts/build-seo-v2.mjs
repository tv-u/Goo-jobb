import fs from "node:fs";

const jobs=JSON.parse(
  fs.readFileSync("public/jobs-worldwide.json","utf8")
);

const base="https://tv-u.github.io/Goo-jobb";

function slug(s){
 return String(s||"")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^\p{L}\p{N}]+/gu,"-")
  .replace(/^-|-$/g,"")
  .slice(0,100);
}

const urls=[
  `${base}/`,
  `${base}/?remote=true`,
  `${base}/?sort=newest`
];

const categories=[
 ...new Set(
  jobs.map(j=>j.category).filter(Boolean)
 )
];

for(const c of categories){
 urls.push(
  `${base}/?category=${encodeURIComponent(c)}`
 );
}

const companies=[
 ...new Set(
  jobs.map(j=>j.company).filter(Boolean)
 )
];

for(const c of companies.slice(0,5000)){
 urls.push(
  `${base}/?company=${encodeURIComponent(c)}`
 );
}

const locations=[
 ...new Set(
  jobs.map(j=>j.location).filter(Boolean)
 )
];

for(const l of locations.slice(0,5000)){
 urls.push(
  `${base}/?location=${encodeURIComponent(l)}`
 );
}

const unique=[
 ...new Set(urls)
];

const chunks=[];

for(let i=0;i<unique.length;i+=45000){
 chunks.push(
  unique.slice(i,i+45000)
 );
}

for(let i=0;i<chunks.length;i++){
 const body=chunks[i].map(u=>`
 <url>
  <loc>${u.replace(/&/g,"&amp;")}</loc>
  <changefreq>daily</changefreq>
  <priority>0.6</priority>
 </url>`).join("");

 fs.writeFileSync(
  `public/sitemap-${i+1}.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${body}
  </urlset>`
 );
}

const index=chunks.map((_,i)=>`
 <sitemap>
  <loc>${base}/sitemap-${i+1}.xml</loc>
 </sitemap>
`).join("");

fs.writeFileSync(
 "public/sitemap-index.xml",
 `<?xml version="1.0" encoding="UTF-8"?>
 <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
 ${index}
 </sitemapindex>`
);

console.log(
 `SEO URLS: ${unique.length}`
);
