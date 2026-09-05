(() => {
  "use strict";

  const AI = {
    version: "4.0.0",
    jobs: [],
    loaded: false,

    norm(v) {
      return String(v ?? "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}+#.\- ]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    },

    tokens(v) {
      return new Set(
        this.norm(v)
          .split(" ")
          .filter(x => x.length > 2)
      );
    },

    text(job) {
      return this.norm([
        job.title,
        job.company,
        job.location,
        job.country,
        job.category,
        job.description,
        job.skills,
        Array.isArray(job.tags) ? job.tags.join(" ") : job.tags
      ].join(" "));
    },

    async load() {
      if (this.loaded) return this.jobs;

      const candidates = [
        "./jobs-worldwide.json",
        "./jobs-enterprise.json",
        "./jobs.json"
      ];

      for (const url of candidates) {
        try {
          const r = await fetch(url + "?v=" + Date.now(), {
            cache: "no-store"
          });

          if (!r.ok) continue;

          const d = await r.json();
          const arr = Array.isArray(d)
            ? d
            : (d.jobs || d.results || []);

          if (Array.isArray(arr) && arr.length) {
            this.jobs = arr;
            this.loaded = true;
            return arr;
          }
        } catch {}
      }

      return [];
    },

    match(query, limit = 20) {
      const q = this.tokens(query);

      return this.jobs
        .map(job => {
          const t = this.tokens(this.text(job));
          let hit = 0;

          for (const word of q) {
            if (t.has(word)) hit++;
          }

          const score = q.size
            ? Math.round((hit / q.size) * 100)
            : 0;

          return {
            ...job,
            aiScore: score
          };
        })
        .filter(x => x.aiScore > 0)
        .sort((a,b) => b.aiScore - a.aiScore)
        .slice(0, limit);
    },

    extractSkills(text) {
      const catalog = [
        "javascript","typescript","python","java","c++","c#",
        "go","golang","rust","php","ruby","swift","kotlin",
        "react","next.js","vue","angular","node.js","node",
        "express","django","flask","spring","docker","kubernetes",
        "aws","azure","gcp","cloudflare","terraform","linux",
        "git","github","sql","mysql","postgresql","mongodb",
        "redis","graphql","rest","api","html","css","tailwind",
        "machine learning","ai","data science","excel","salesforce",
        "figma","product management","project management"
      ];

      const n = this.norm(text);

      return catalog.filter(skill =>
        n.includes(this.norm(skill))
      );
    },

    analyzeResume(text) {
      const skills = this.extractSkills(text);
      const words = this.norm(text).split(/\s+/).filter(Boolean);

      return {
        wordCount: words.length,
        skills,
        skillCount: skills.length,
        quality:
          skills.length >= 10 ? "Strong"
          : skills.length >= 5 ? "Good"
          : "Needs improvement"
      };
    },

    skillGap(resume, job) {
      const have = new Set(
        this.extractSkills(resume).map(x => this.norm(x))
      );

      const need = this.extractSkills(
        this.text(job)
      );

      return {
        matched: need.filter(x => have.has(this.norm(x))),
        missing: need.filter(x => !have.has(this.norm(x)))
      };
    },

    summarize(job) {
      const title = job.title || "Job";
      const company = job.company || "Company";
      const location = job.location || job.country || "Worldwide";
      const description =
        String(job.description || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      return `${title} at ${company}. Location: ${location}. ` +
        (description
          ? description.slice(0, 420) +
            (description.length > 420 ? "…" : "")
          : "Review the original listing for complete requirements.");
    },

    coverLetter(job, profile) {
      const title = job.title || "the position";
      const company = job.company || "your company";

      return `Dear Hiring Team,

I am interested in the ${title} opportunity at ${company}. ` +
        `My background and skills align with the requirements of this role, ` +
        `and I would welcome the opportunity to contribute to your team.

${profile || "I bring a practical, results-focused approach and a strong willingness to learn and deliver measurable results."}

Thank you for considering my application.

Kind regards`;
    },

    interview(job) {
      const title = job.title || "this role";

      return [
        `Why are you interested in the ${title} position?`,
        "Describe a difficult problem you solved and how you approached it.",
        "Which skills from your background are most relevant to this role?",
        "Tell us about a project where you had measurable impact.",
        "How do you prioritize competing deadlines?",
        "Describe a mistake you made and what you learned from it.",
        "How do you keep your technical or professional skills current?"
      ];
    }
  };

  window.GooJobbAI = AI;

  window.dispatchEvent(
    new CustomEvent("goo-jobb-ai-ready", { detail: AI })
  );
})();
