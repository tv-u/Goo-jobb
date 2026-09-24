(function () {
  "use strict";

  /*
   * GOO-JOBB Adsterra SmartLink controller
   *
   * Rules:
   * - No iframe
   * - No forced redirect
   * - No hidden click
   * - No automatic ad opening
   * - No navigation hijacking
   * - Core job/search/navigation actions remain untouched
   * - SmartLinks are explicit user-click actions only
   */

  const LINKS = [
    "https://www.effectivecpmnetwork.com/x0wcj4zk?key=c2b46070b44982014166acafd6074c3d",
    "https://www.effectivecpmnetwork.com/sa8mca36sv?key=3711015d24018cf89ccb362976c4a2e0",
    "https://www.profitableratecpmnetwork.com/sa8mca36sv?key=3711015d24018cf89ccb362976c4a2e0",
    "https://www.profitableratecpmnetwork.com/x0wcj4zk?key=c2b46070b44982014166acafd6074c3d"
  ];

  const STORAGE_KEY = "goo-jobb-adsterra-smartlink-index";

  function nextLink() {
    let index = 0;

    try {
      index = Number(localStorage.getItem(STORAGE_KEY) || 0);
    } catch (_) {}

    const url = LINKS[index % LINKS.length];

    try {
      localStorage.setItem(
        STORAGE_KEY,
        String((index + 1) % LINKS.length)
      );
    } catch (_) {}

    return url;
  }

  function createAdCard() {
    if (document.getElementById("goo-adsterra-smartlink")) {
      return;
    }

    const card = document.createElement("aside");

    card.id = "goo-adsterra-smartlink";
    card.setAttribute("aria-label", "Sponsored");

    card.innerHTML = `
      <div class="goo-adsterra-inner">
        <span class="goo-adsterra-label">SPONSORED</span>
        <span class="goo-adsterra-text">
          Discover more opportunities
        </span>
        <a
          class="goo-adsterra-btn"
          href="#"
          rel="nofollow sponsored noopener"
          target="_blank"
        >
          Explore
        </a>
      </div>
    `;

    const link = card.querySelector(".goo-adsterra-btn");

    if (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();

        const url = nextLink();

        /*
         * Explicit user action only.
         * Opens a normal new tab without changing the current GOO-JOBB page.
         */
        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      });
    }

    /*
     * Place only after the main content exists.
     * Never replace existing content.
     */
    const main =
      document.querySelector("main") ||
      document.querySelector("#main") ||
      document.querySelector(".main-content");

    if (main) {
      main.appendChild(card);
    } else {
      document.body.appendChild(card);
    }
  }

  function boot() {
    if (!document.body) return;

    /*
     * Delay keeps initial page rendering clean.
     */
    window.setTimeout(createAdCard, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, {
      once: true
    });
  } else {
    boot();
  }
})();
