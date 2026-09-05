import fs from "node:fs";

const input = "public/jobs-worldwide.json";

if (!fs.existsSync(input)) {
  throw new Error("jobs-worldwide.json missing");
}

const jobs = JSON.parse(
  fs.readFileSync(input, "utf8")
);

const safe = Array.isArray(jobs) ? jobs : [];

const normalize = x =>
  String(x ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const index = safe.map((j, i) => ({
  i,
  id: j.id,
  title: j.title,
  company: j.company,
  companySlug: j.companySlug,
  location: j.location,
  category: j.category,
  employmentType: j.employmentType,
  experience: j.experience,
  remote: !!j.remote,
  salary: j.salary,
  postedAt: j.postedAt,
  url: j.url,
  applyUrl: j.applyUrl,
  source: j.source,
  sourceId: j.sourceId,
  searchText: normalize([
    j.title,
    j.company,
    j.location,
    j.category,
    j.employmentType,
    j.experience,
    j.description
  ].join(" "))
}));

const facet = (field) => {
  const map = new Map();

  for (const j of safe) {
    const value = j[field] || "Other";
    map.set(
      value,
      (map.get(value) || 0) + 1
    );
  }

  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({
      value,
      count
    }));
};

fs.writeFileSync(
  "public/search-index.json",
  JSON.stringify(index)
);

fs.writeFileSync(
  "public/facets.json",
  JSON.stringify(
    {
      categories: facet("category"),
      locations: facet("location"),
      companies: facet("company"),
      sources: facet("source"),
      employmentTypes: facet("employmentType"),
      experience: facet("experience")
    },
    null,
    2
  )
);

fs.writeFileSync(
  "public/companies.json",
  JSON.stringify(
    facet("company"),
    null,
    2
  )
);

console.log(
  `SEARCH INDEX READY: ${index.length} jobs`
);
