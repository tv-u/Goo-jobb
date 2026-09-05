import fs from "node:fs/promises";

const sources = JSON.parse(
  await fs.readFile("scripts/goo-jobb-50-new-sources.json", "utf8")
);

const timeout = 12000;

async function test(source) {
  const started = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(source.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "GOO-JOBB-Real-Jobs-Aggregator/1.0",
        "Accept":
          "application/json, application/rss+xml, application/xml, text/xml, text/plain, */*"
      }
    });

    const body = await response.text();

    clearTimeout(timer);

    const looksLikeJobs =
      /job|career|position|employment|vacancy|remote/i.test(body);

    return {
      ...source,
      http: response.status,
      ok: response.ok,
      bytes: body.length,
      looksLikeJobs,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      ...source,
      http: 0,
      ok: false,
      bytes: 0,
      looksLikeJobs: false,
      latencyMs: Date.now() - started,
      error: error.message,
      checkedAt: new Date().toISOString()
    };
  }
}

const results = [];

for (const source of sources) {
  process.stdout.write(`TEST ${source.id} ... `);

  const result = await test(source);

  results.push(result);

  console.log(
    result.ok && result.looksLikeJobs
      ? `ACTIVE ${result.http} ${result.bytes}B`
      : `SKIP ${result.http || result.error || "not-job-feed"}`
  );
}

const active = results.filter(
  x => x.ok && x.looksLikeJobs && x.bytes > 100
);

await fs.mkdir("public/source-health", { recursive: true });

await fs.writeFile(
  "public/source-health/new-50.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      candidates: results.length,
      active: active.length,
      inactive: results.length - active.length,
      sources: results
    },
    null,
    2
  )
);

await fs.writeFile(
  "scripts/goo-jobb-50-active.json",
  JSON.stringify(active, null, 2)
);

console.log("");
console.log(`NEW CANDIDATES : ${results.length}`);
console.log(`LIVE CANDIDATES: ${active.length}`);
console.log(`FAILED         : ${results.length - active.length}`);
