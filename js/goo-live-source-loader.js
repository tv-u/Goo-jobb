(() => {
  "use strict";

  const DATA_URL = new URL(
    "data/live-jobs.json",
    document.baseURI
  ).href;

  const state = {
    jobs: [],
    meta: null,
    loaded: false,
    error: null
  };

  function normalizeJob(job) {
    return {
      ...job,

      id: String(job.id || ""),

      title: String(
        job.title || ""
      ).trim(),

      company: String(
        job.company || ""
      ).trim(),

      location: String(
        job.location || ""
      ).trim(),

      salary: String(
        job.salary || ""
      ).trim(),

      description: String(
        job.description || ""
      ),

      descriptionText: String(
        job.descriptionText || ""
      ),

      url: String(
        job.url || ""
      ).trim(),

      originalApplyUrl: String(
        job.originalApplyUrl ||
        job.url ||
        ""
      ).trim(),

      source: String(
        job.source || ""
      ).trim(),

      sourceAttribution: String(
        job.sourceAttribution ||
        job.source ||
        ""
      ).trim(),

      sourceId: String(
        job.sourceId || ""
      ),

      live: job.live !== false
    };
  }

  async function loadLiveJobs() {
    try {

      const response = await fetch(
        DATA_URL,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Accept": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (
        !data ||
        !Array.isArray(
          data.jobs
        )
      ) {
        throw new Error(
          "Invalid live dataset"
        );
      }

      state.jobs = data.jobs
        .filter(
          job =>
            job &&
            job.title &&
            job.url
        )
        .map(
          normalizeJob
        );

      state.meta = {
        generatedAt:
          data.generatedAt || null,

        jobCount:
          state.jobs.length,

        sourceCount:
          Number(
            data.sourceCount || 0
          ),

        healthySources:
          Number(
            data.healthySources || 0
          ),

        failedSources:
          Number(
            data.failedSources || 0
          )
      };

      state.loaded = true;

      window.GOO_LIVE_JOBS =
        state.jobs;

      window.GOO_LIVE_META =
        state.meta;

      window.GOO_LIVE_STATE =
        state;

      window.dispatchEvent(
        new CustomEvent(
          "goo:live-jobs-ready",
          {
            detail: {
              jobs: state.jobs,
              meta: state.meta
            }
          }
        )
      );

      return state;

    } catch (error) {

      state.error =
        String(error);

      window.GOO_LIVE_STATE =
        state;

      window.dispatchEvent(
        new CustomEvent(
          "goo:live-jobs-error",
          {
            detail: {
              error:
                state.error
            }
          }
        )
      );

      console.warn(
        "[GOO-JOBB] Live jobs unavailable:",
        error
      );

      return state;
    }
  }

  window.GOO_LOAD_LIVE_JOBS =
    loadLiveJobs;

  window.GOO_SEARCH_LIVE_JOBS =
    function searchLiveJobs(
      query
    ) {

      const q = String(
        query || ""
      )
        .toLowerCase()
        .trim();

      if (!q) {
        return state.jobs.slice();
      }

      return state.jobs.filter(
        job => {

          const haystack = [
            job.title,
            job.company,
            job.location,
            job.salary,
            job.descriptionText,
            job.skills,
            job.source
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(q);
        }
      );
    };

  window.GOO_GET_LIVE_JOB =
    function getLiveJob(
      id
    ) {

      return state.jobs.find(
        job =>
          String(job.id) ===
          String(id)
      ) || null;
    };

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      loadLiveJobs,
      {
        once: true
      }
    );

  } else {

    loadLiveJobs();

  }

})();
