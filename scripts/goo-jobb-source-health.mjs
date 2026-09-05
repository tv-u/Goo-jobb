import fs from "node:fs/promises";

const file = "scripts/goo-jobb-extra-sources.json";
const registry = JSON.parse(await fs.readFile(file, "utf8"));

const timeoutMs = 15000;

async function check(source) {
  const started = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(source.url, {
      headers: {
        "user-agent": "GOO-JOBB/2026 (+job-aggregator)",
        "accept": "application/json,application/rss+xml,application/xml,text/xml,*/*"
      },
      signal: controller.signal
    });

    clearTimeout(timer);

    const text = await res.text();

    return {
      ...source,
      status: res.status,
      ok: res.ok,
      bytes: text.length,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      ...source,
      status: 0,
      ok: false,
      bytes: 0,
      latencyMs: Date.now() - started,
      error: error?.message || String(error),
      checkedAt: new Date().toISOString()
    };
  }
}

const results = [];

for (const source of registry.sources) {
  process.stdout.write(`CHECK ${source.id} ... `);
  const result = await check(source);
  results.push(result);
  console.log(result.ok ? `OK ${result.status}` : `FAIL ${result.status || result.error}`);
}

const healthy = results.filter(x => x.ok);

await fs.mkdir("public/source-health", { recursive: true });

await fs.writeFile(
  "public/source-health/extra-sources.json",
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: results.length,
    healthy: healthy.length,
    failed: results.length - healthy.length,
    sources: results
  }, null, 2)
);

console.log("");
console.log(`EXTRA SOURCES CHECKED: ${results.length}`);
console.log(`HEALTHY: ${healthy.length}`);
console.log(`FAILED: ${results.length - healthy.length}`);
