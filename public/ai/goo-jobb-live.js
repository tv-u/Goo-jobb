(() => {
  "use strict";

  const esc = s => String(s ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

  const css = `
#goo-ai-v4{
position:relative;
z-index:20;
margin:24px auto;
max-width:1180px;
padding:22px;
border:1px solid rgba(255,0,128,.28);
border-radius:22px;
background:linear-gradient(135deg,rgba(255,0,128,.08),rgba(0,255,136,.05));
backdrop-filter:blur(16px);
box-shadow:0 20px 70px rgba(0,0,0,.35);
font-family:system-ui,sans-serif
}
#goo-ai-v4 h2{margin:0 0 8px;font-size:24px}
#goo-ai-v4 .sub{opacity:.7;margin-bottom:18px}
#goo-ai-v4 .row{display:flex;gap:10px;flex-wrap:wrap}
#goo-ai-v4 input,#goo-ai-v4 textarea{
flex:1;min-width:220px;padding:13px 14px;
border-radius:12px;border:1px solid rgba(255,255,255,.14);
background:rgba(0,0,0,.35);color:inherit;outline:none
}
#goo-ai-v4 button{
padding:12px 16px;border:0;border-radius:12px;
cursor:pointer;font-weight:700
}
#goo-ai-v4 .result{
margin-top:14px;padding:14px;border-radius:14px;
background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08)
}
#goo-ai-v4 .score{font-weight:800}
#goo-ai-v4 .tools{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
#goo-ai-v4 small{opacity:.65}
`;

  function mount() {
    if (document.getElementById("goo-ai-v4")) return;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const box = document.createElement("section");
    box.id = "goo-ai-v4";

    box.innerHTML = `
      <h2>GOO-JOBB Local AI</h2>
      <div class="sub">
        API-key-free browser AI/NLP for job search, matching,
        resume analysis and career tools.
      </div>

      <div class="row">
        <input id="goo-ai-query"
          placeholder="Try: remote Python developer with AWS">
        <button id="goo-ai-search">AI Search</button>
      </div>

      <div id="goo-ai-results"></div>

      <hr style="margin:20px 0;opacity:.12">

      <div class="row">
        <textarea id="goo-ai-resume" rows="5"
          placeholder="Paste your resume text here for local skill analysis"></textarea>
        <button id="goo-ai-resume-btn">Analyze Resume</button>
      </div>

      <div id="goo-ai-resume-result"></div>

      <small>
        Local processing: resume text is analyzed in this browser.
      </small>
    `;

    const target =
      document.querySelector("main") ||
      document.body;

    target.prepend(box);

    document.getElementById("goo-ai-search")
      .addEventListener("click", search);

    document.getElementById("goo-ai-query")
      .addEventListener("keydown", e => {
        if (e.key === "Enter") search();
      });

    document.getElementById("goo-ai-resume-btn")
      .addEventListener("click", resume);
  }

  async function search() {
    const q =
      document.getElementById("goo-ai-query").value.trim();

    const out =
      document.getElementById("goo-ai-results");

    if (!q) {
      out.innerHTML = `<div class="result">Enter a job search.</div>`;
      return;
    }

    out.innerHTML =
      `<div class="result">AI is searching the live dataset…</div>`;

    await window.GooJobbAI.load();

    const results =
      window.GooJobbAI.match(q, 12);

    if (!results.length) {
      out.innerHTML =
        `<div class="result">No matching jobs found.</div>`;
      return;
    }

    out.innerHTML = results.map(job => `
      <div class="result">
        <div>
          <strong>${esc(job.title || "Untitled job")}</strong>
          ${job.company ? ` · ${esc(job.company)}` : ""}
        </div>

        <div class="score">
          AI match: ${job.aiScore}%
        </div>

        <div>
          ${esc(job.location || job.country || "Worldwide")}
        </div>

        <div class="tools">
          ${job.url
            ? `<a href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">
                 <button>Open Job</button>
               </a>`
            : ""}
          <button data-summary="${esc(
            JSON.stringify(job)
          )}">Summary</button>
        </div>
      </div>
    `).join("");

    out.querySelectorAll("[data-summary]")
      .forEach(btn => {
        btn.addEventListener("click", () => {
          try {
            const job = JSON.parse(btn.dataset.summary);
            alert(window.GooJobbAI.summarize(job));
          } catch {}
        });
      });
  }

  function resume() {
    const text =
      document.getElementById("goo-ai-resume").value.trim();

    const out =
      document.getElementById("goo-ai-resume-result");

    if (!text) {
      out.innerHTML =
        `<div class="result">Paste your resume text first.</div>`;
      return;
    }

    const r =
      window.GooJobbAI.analyzeResume(text);

    out.innerHTML = `
      <div class="result">
        <strong>Resume AI Analysis</strong><br>
        Quality: ${esc(r.quality)}<br>
        Words: ${r.wordCount}<br>
        Skills detected: ${r.skillCount}<br>
        ${r.skills.length
          ? esc(r.skills.join(", "))
          : "No recognized skills detected."}
      </div>
    `;
  }

  function start() {
    if (!window.GooJobbAI) {
      window.addEventListener(
        "goo-jobb-ai-ready",
        mount,
        { once:true }
      );
    } else {
      mount();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
