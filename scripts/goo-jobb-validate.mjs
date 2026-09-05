import fs from "node:fs";

const files = [
  "public/jobs.json",
  "public/jobs-enterprise.json",
  "public/jobs-worldwide.json",
  "public/jobs-search-index.json"
];

let total = 0;

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`SKIP ${file}`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  const arr =
    Array.isArray(data)
      ? data
      : Array.isArray(data.jobs)
        ? data.jobs
        : [];

  console.log(`${file}: ${arr.length}`);
  total = Math.max(total, arr.length);

  for (const job of arr) {
    if (!job.title) throw new Error(`${file}: missing title`);
    if (!job.url) throw new Error(`${file}: missing URL`);
    if (job.synthetic === true) throw new Error(`${file}: synthetic job`);
  }
}

if (!total) {
  throw new Error("No jobs available after build");
}

console.log(`VALIDATION OK: ${total} records`);
