(() => {
  "use strict";

  const state = {
    jobs: [],
    loaded: false
  };

  const STOP = new Set([
    "the","and","for","with","from","that","this","your","you",
    "are","our","job","jobs","work","will","have","has","into",
    "using","years","role","team","company","remote"
  ]);

  function tokens(text) {
    return [...new Set(
      String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9+#.\- ]/g, " ")
        .split(/\s+/)
        .filter(x => x.length > 2 && !STOP.has(x))
    )];
  }

  function score(query, job) {
    const q = new Set(tokens(query));
    if (!q.size) return 0;

    const hay = tokens([
      job.title,
      job.company,
      job.description,
      ...(job.skills || []),
      job.category,
      job.location
    ].join(" "));

    const h = new Set(hay);
    let matches = 0;

    for (const token of q) {
      if (h.has(token)) matches++;
    }

    return matches / q.size;
  }

  async function load() {
    if (state.loaded) return state.jobs;

    const candidates = [
      "./jobs-worldwide.json",
      "./jobs-enterprise.json",
      "./jobs.json"
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(`${url}?ai=${Date.now()}`, {
          cache: "no-store"
        });

        if (!res.ok) continue;

        const data = await res.json();

        const jobs = Array.isArray(data)
          ? data
          : Array.isArray(data.jobs)
            ? data.jobs
            : [];

        if (jobs.length) {
          state.jobs = jobs;
          state.loaded = true;
          break;
        }
      } catch {}
    }

    return state.jobs;
  }

  async function match(query, limit = 20) {
    const jobs = await load();

    return jobs
      .map(job => ({
        job,
        score: score(query, job)
      }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  function analyzeResume(text) {
    const skillCatalog = [
      "javascript","typescript","react","next.js","node.js","python",
      "java","c++","c#","php","sql","mysql","postgresql","mongodb",
      "aws","azure","gcp","docker","kubernetes","git",
      "machine learning","artificial intelligence","data analysis",
      "excel","power bi","figma","salesforce","marketing",
      "seo","content","sales","customer support","project management"
    ];

    const lower = String(text || "").toLowerCase();

    const found = skillCatalog.filter(skill =>
      lower.includes(skill.toLowerCase())
    );

    return {
      skills: found,
      skillCount: found.length,
      wordCount: String(text || "").trim()
        ? String(text).trim().split(/\s+/).length
        : 0,
      recommendations: [
        "Add measurable achievements.",
        "Mention tools and technologies explicitly.",
        "Use role-specific keywords.",
        "Keep application links and contact information current."
      ]
    };
  }

  window.GooJobbAI = {
    load,
    match,
    analyzeResume,
    version: "extra-ai-1.0"
  };

  window.dispatchEvent(
    new CustomEvent("goo-jobb-ai-ready", {
      detail: window.GooJobbAI
    })
  );
})();
