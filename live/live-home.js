(function () {
  "use strict";

  const VERSION = "2026.09.06.1";

  function boot() {
    const badge = document.createElement("div");
    badge.id = "goo-live-sync-badge";
    badge.style.cssText =
      "position:fixed;right:12px;bottom:72px;z-index:9999;" +
      "padding:8px 11px;border-radius:999px;" +
      "background:#111;color:#00ff88;border:1px solid rgba(0,255,136,.35);" +
      "font:800 11px system-ui;box-shadow:0 8px 25px rgba(0,0,0,.35);" +
      "pointer-events:none";

    badge.textContent = "GOO-JOBB • LIVE " + VERSION;
    document.body.appendChild(badge);

    setTimeout(function () {
      badge.style.opacity = ".65";
    }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  } else {
    boot();
  }
})();
