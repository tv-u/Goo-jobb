(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const escapeHTML = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const safe = value =>
    String(value ?? "").trim();

  async function loadJSON(url) {
    const response = await fetch(
      `${url}?v=${Date.now()}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`${response.status} ${url}`);
    }

    return response.json();
  }

  function profile() {
    const key = "goo-jobb-profile";

    const read = () => {
      try {
        return JSON.parse(
          localStorage.getItem(key) || "{}"
        );
      } catch {
        return {};
      }
    };

    const write = data => {
      localStorage.setItem(
        key,
        JSON.stringify(data)
      );
    };

    return { read, write };
  }

  function renderProfile() {
    const form = $("#goo-profile-form");
    if (!form) return;

    const p = profile().read();

    for (const input of $$("[data-profile]", form)) {
      input.value = p[input.dataset.profile] || "";
    }

    form.addEventListener("submit", e => {
      e.preventDefault();

      const data = {};

      for (const input of $$("[data-profile]", form)) {
        data[input.dataset.profile] = input.value.trim();
      }

      profile().write(data);

      const status = $("#profile-status");

      if (status) {
        status.textContent =
          "Profile saved locally on this device.";
      }
    });
  }

  function setupResumeTool() {
    const form = $("#resume-tool-form");
    const output = $("#resume-tool-output");

    if (!form || !output) return;

    form.addEventListener("submit", e => {
      e.preventDefault();

      const name =
        $("#resume-name")?.value.trim() || "Candidate";

      const role =
        $("#resume-role")?.value.trim() ||
        "Professional";

      const skills =
        $("#resume-skills")?.value.trim() || "";

      const experience =
        $("#resume-experience")?.value.trim() || "";

      const summary =
        `${name} — ${role}. ` +
        `Experienced professional with strengths in ` +
        `${skills || "relevant professional skills"}. ` +
        `${experience || "Focused on delivering measurable results."}`;

      output.value = summary;
    });
  }

  function setupCoverTool() {
    const form = $("#cover-tool-form");
    const output = $("#cover-tool-output");

    if (!form || !output) return;

    form.addEventListener("submit", e => {
      e.preventDefault();

      const role =
        $("#cover-role")?.value.trim() ||
        "the position";

      const company =
        $("#cover-company")?.value.trim() ||
        "your company";

      const skills =
        $("#cover-skills")?.value.trim() ||
        "my relevant experience";

      output.value =
`Dear Hiring Team,

I am applying for ${role} at ${company}.

My background in ${skills} has prepared me to contribute effectively to this role. I am particularly interested in the opportunity because it aligns with my experience, professional goals, and interest in creating measurable business impact.

I would welcome the opportunity to discuss how my experience could contribute to your team.

Best regards,
Candidate`;
    });
  }

  function setupInterviewTool() {
    const form = $("#interview-tool-form");
    const output = $("#interview-output");

    if (!form || !output) return;

    form.addEventListener("submit", e => {
      e.preventDefault();

      const role =
        $("#interview-role")?.value.trim() ||
        "the target role";

      const questions = [
        `Why are you interested in ${role}?`,
        "Tell me about a measurable result you achieved.",
        "Describe a difficult problem and how you solved it.",
        "How do you prioritize competing responsibilities?",
        "Describe a situation where you disagreed with a teammate.",
        "What would your first 30 days in this role look like?",
        "What professional skill are you currently improving?",
        "Why should we choose you for this position?"
      ];

      output.innerHTML =
        questions
          .map(
            (q, i) =>
              `<li><strong>${i + 1}.</strong> ${escapeHTML(q)}</li>`
          )
          .join("");
    });
  }

  function setupSkillAssessment() {
    const form = $("#skill-test-form");
    const output = $("#skill-test-output");

    if (!form || !output) return;

    form.addEventListener("submit", e => {
      e.preventDefault();

      const answers = $$(
        "input[type=radio]:checked",
        form
      );

      let score = 0;

      for (const answer of answers) {
        if (answer.dataset.correct === "true") {
          score++;
        }
      }

      const total = $$(
        "[data-question]",
        form
      ).length;

      output.textContent =
        `Score: ${score}/${total}. ` +
        `Review incorrect answers and repeat the assessment to improve.`;
    });
  }

  async function renderCompanies() {
    const root = $("#career-company-list");
    if (!root) return;

    try {
      const data =
        await loadJSON("../career-companies.json");

      const companies =
        Array.isArray(data.companies)
          ? data.companies
          : [];

      root.innerHTML = companies
        .slice(0, 300)
        .map(c => `
          <article class="career-card">
            <h3>${escapeHTML(c.name)}</h3>
            <p>${c.jobs} live source listing${c.jobs === 1 ? "" : "s"}</p>
            <p>${escapeHTML(
              c.locations.slice(0, 5).join(" • ")
            )}</p>
            <a href="../jobs/?company=${encodeURIComponent(c.name)}">
              View jobs
            </a>
          </article>
        `)
        .join("");

    } catch (error) {
      root.textContent =
        "Company data could not be loaded.";
    }
  }

  async function renderSalaries() {
    const root = $("#career-salary-list");
    if (!root) return;

    try {
      const data =
        await loadJSON("../career-salaries.json");

      const rows =
        Array.isArray(data.salaries)
          ? data.salaries
          : [];

      root.innerHTML = rows
        .slice(0, 300)
        .map(j => `
          <article class="career-card">
            <h3>${escapeHTML(j.title)}</h3>
            <p>${escapeHTML(j.company)}</p>
            <p>${escapeHTML(j.location)}</p>
            <strong>
              ${j.salaryMin ?? "—"}
              ${j.salaryMax ? ` – ${j.salaryMax}` : ""}
              ${escapeHTML(j.currency || "")}
            </strong>
            <p>
              <a href="${escapeHTML(j.url)}"
                 target="_blank"
                 rel="noopener noreferrer nofollow">
                 Source listing
              </a>
            </p>
          </article>
        `)
        .join("");

    } catch {
      root.textContent =
        "Salary source data unavailable.";
    }
  }

  async function renderTaxonomy() {
    const root = $("#career-taxonomy");
    if (!root) return;

    try {
      const data =
        await loadJSON("../career-taxonomy.json");

      const categories =
        data.categories || [];

      const locations =
        data.locations || [];

      root.innerHTML = `
        <section>
          <h2>Real job categories</h2>
          <div class="career-grid">
            ${categories.slice(0, 100).map(x => `
              <a class="career-card"
                 href="../jobs/?category=${encodeURIComponent(x.name)}">
                <strong>${escapeHTML(x.name)}</strong>
                <span>${x.jobs} listings</span>
              </a>
            `).join("")}
          </div>
        </section>

        <section>
          <h2>Real job locations</h2>
          <div class="career-grid">
            ${locations.slice(0, 100).map(x => `
              <a class="career-card"
                 href="../jobs/?location=${encodeURIComponent(x.name)}">
                <strong>${escapeHTML(x.name)}</strong>
                <span>${x.jobs} listings</span>
              </a>
            `).join("")}
          </div>
        </section>
      `;

    } catch {
      root.textContent =
        "Taxonomy data unavailable.";
    }
  }

  function injectGlobalCareerNav() {
    if (document.querySelector("#goo-career-nav")) return;

    const nav = document.createElement("div");

    nav.id = "goo-career-nav";

    nav.innerHTML = `
      <div class="goo-career-nav-inner">
        <a href="/Goo-jobb/career/">Career Hub</a>
        <a href="/Goo-jobb/career/jobs/">Jobs</a>
        <a href="/Goo-jobb/career/tools/">AI Tools</a>
        <a href="/Goo-jobb/career/profile/">My Profile</a>
        <a href="/Goo-jobb/career/company/">Companies</a>
        <a href="/Goo-jobb/career/salary/">Salaries</a>
        <a href="/Goo-jobb/career/paths/">Career Paths</a>
        <a href="/Goo-jobb/career/talent/">Talent</a>
      </div>
    `;

    document.body.prepend(nav);
  }

  function boot() {
    injectGlobalCareerNav();
    renderProfile();
    setupResumeTool();
    setupCoverTool();
    setupInterviewTool();
    setupSkillAssessment();
    renderCompanies();
    renderSalaries();
    renderTaxonomy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
