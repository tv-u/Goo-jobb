(function () {
  "use strict";

  const VERSION = "2026.09.06.1";
  const ROOT = "./";

  function addStyle() {
    if (document.getElementById("goo-live-master-css")) return;

    const style = document.createElement("style");
    style.id = "goo-live-master-css";
    style.textContent = `
      .goo-live-master {
        margin:24px auto;
        max-width:1200px;
        padding:0 16px;
      }

      .goo-live-master-box {
        background:linear-gradient(135deg,rgba(255,0,128,.10),rgba(0,255,136,.07));
        border:1px solid rgba(255,255,255,.12);
        border-radius:22px;
        padding:20px;
        box-shadow:0 14px 45px rgba(0,0,0,.25);
        backdrop-filter:blur(12px);
      }

      .goo-live-master-title {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        flex-wrap:wrap;
        margin-bottom:16px;
      }

      .goo-live-master-title h2 {
        margin:0;
        font-size:clamp(20px,4vw,30px);
      }

      .goo-live-live {
        display:inline-flex;
        align-items:center;
        gap:7px;
        padding:7px 11px;
        border-radius:999px;
        background:rgba(0,255,136,.10);
        border:1px solid rgba(0,255,136,.30);
        color:#00ff88;
        font-weight:800;
        font-size:12px;
      }

      .goo-live-dot {
        width:8px;
        height:8px;
        border-radius:50%;
        background:#00ff88;
        box-shadow:0 0 12px #00ff88;
      }

      .goo-live-grid {
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
        gap:12px;
      }

      .goo-live-card {
        padding:15px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,.10);
        background:rgba(255,255,255,.035);
      }

      .goo-live-card strong {
        display:block;
        margin-bottom:7px;
      }

      .goo-live-card small {
        opacity:.72;
        line-height:1.5;
      }

      .goo-live-status {
        margin-top:10px;
        color:#00ff88;
        font-size:11px;
        font-weight:800;
      }
    `;
    document.head.appendChild(style);
  }

  function inject(features) {
    if (!features || !features.length) return;
    if (document.getElementById("goo-live-master")) return;

    const section = document.createElement("section");
    section.id = "goo-live-master";
    section.className = "goo-live-master";

    const box = document.createElement("div");
    box.className = "goo-live-master-box";

    const title = document.createElement("div");
    title.className = "goo-live-master-title";

    title.innerHTML =
      "<h2>GOO-JOBB Live Features</h2>" +
      '<span class="goo-live-live"><span class="goo-live-dot"></span>LIVE SYSTEM</span>';

    const grid = document.createElement("div");
    grid.className = "goo-live-grid";

    features.forEach(function (feature) {
      const card = document.createElement("article");
      card.className = "goo-live-card";
      card.innerHTML =
        "<strong>" + escapeHtml(feature.name || feature.id) + "</strong>" +
        "<small>" + escapeHtml(feature.description || "") + "</small>" +
        '<div class="goo-live-status">● ' +
        escapeHtml(feature.status || "LIVE") +
        "</div>";
      grid.appendChild(card);
    });

    box.appendChild(title);
    box.appendChild(grid);
    section.appendChild(box);

    const main =
      document.querySelector("main") ||
      document.querySelector("#app") ||
      document.querySelector(".container") ||
      document.body;

    if (main === document.body) {
      document.body.appendChild(section);
    } else {
      main.insertBefore(section, main.firstChild);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function boot() {
    addStyle();

    try {
      const url = ROOT + "live/live-features.json?v=" +
        encodeURIComponent(VERSION) + "&t=" + Date.now();

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache"
        }
      });

      if (!response.ok) throw new Error("Feature manifest HTTP " + response.status);

      const data = await response.json();

      window.GooJobbLive = {
        version: data.version || VERSION,
        enabled: data.enabled !== false,
        homeVisible: data.homeVisible !== false,
        features: data.features || [],
        isEnabled: function (id) {
          return this.enabled &&
            this.features.some(function (f) {
              return f.id === id && f.status === "LIVE";
            });
        }
      };

      if (window.GooJobbLive.enabled && window.GooJobbLive.homeVisible) {
        inject(window.GooJobbLive.features);
      }

      window.dispatchEvent(new CustomEvent("goo-jobb-live-ready", {
        detail: window.GooJobbLive
      }));
    } catch (error) {
      console.error("GOO-JOBB Live Runtime:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
