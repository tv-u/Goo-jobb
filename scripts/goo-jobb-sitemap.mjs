import fs from "node:fs";
import path from "node:path";

const PUBLIC = path.join(process.cwd(),"public");
const SITE = "https://tv-u.github.io/Goo-jobb";

const urls = new Set();

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const full = path.join(dir,entry.name);

    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name === "index.html") {
      const rel = path.relative(PUBLIC,full).replaceAll("\\","/");
      const u = rel === "index.html"
        ? `${SITE}/`
        : `${SITE}/${rel.replace(/\/index\.html$/,"")}/`;
      urls.add(u);
    }
  }
}

walk(PUBLIC);

const jobUrls = [...urls].filter(x=>x.includes("/jobs/"));
const pageUrls = [...urls].filter(x=>!x.includes("/jobs/"));

function xml(list) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    list.map(u=>`<url><loc>${u}</loc></url>`).join("\n") +
    `\n</urlset>`;
}

fs.writeFileSync(path.join(PUBLIC,"sitemap-jobs.xml"),xml(jobUrls));
fs.writeFileSync(path.join(PUBLIC,"sitemap-pages.xml"),xml(pageUrls));

fs.writeFileSync(
  path.join(PUBLIC,"sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap>
<sitemap><loc>${SITE}/sitemap-jobs.xml</loc></sitemap>
</sitemapindex>`
);

console.log("JOB URLS:",jobUrls.length);
console.log("PAGE URLS:",pageUrls.length);
