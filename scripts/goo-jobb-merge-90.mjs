import fs from "node:fs/promises";

const extraFile = "scripts/goo-jobb-50-active.json";

let extra = [];

try {
  extra = JSON.parse(await fs.readFile(extraFile, "utf8"));
} catch {
  extra = [];
}

const existingFiles = [
  "public/jobs.json",
  "public/jobs-enterprise.json",
  "public/jobs-worldwide.json"
];

const extraMeta = extra.map(x => ({
  id: x.id,
  name: x.name,
  type: x.type,
  url: x.url,
  live: true,
  checkedAt: x.checkedAt
}));

let existing = {};

try {
  existing = JSON.parse(
    await fs.readFile("public/source-health/extra-sources.json", "utf8")
  );
} catch {}

const oldSources = Array.isArray(existing.sources)
  ? existing.sources
  : [];

const merged = new Map();

for (const source of [...oldSources, ...extraMeta]) {
  const key = source.id || source.name || source.url;

  if (!merged.has(key)) {
    merged.set(key, source);
  }
}

const registry = {
  generatedAt: new Date().toISOString(),
  existingConfiguredSources: oldSources.length,
  newLiveSources: extraMeta.length,
  totalRegisteredSources: merged.size,
  sources: [...merged.values()]
};

await fs.writeFile(
  "public/source-health/source-registry-90.json",
  JSON.stringify(registry, null, 2)
);

for (const file of existingFiles) {
  try {
    const raw = JSON.parse(await fs.readFile(file, "utf8"));

    if (Array.isArray(raw)) {
      for (const job of raw) {
        if (!job.source) job.source = "GOO-JOBB";
      }
    }

    await fs.writeFile(file, JSON.stringify(raw));
  } catch {}
}

console.log(
  `SOURCE REGISTRY: ${registry.totalRegisteredSources} registered`
);
