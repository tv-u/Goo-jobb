(() => {
  "use strict";

  const state = {
    jobs: [],
    ready: false
  };

  function uniqueJobs(jobs) {

    const map = new Map();

    for (const job of jobs || []) {

      if (
        !job ||
        !job.title ||
        !job.url
      ) {
        continue;
      }

      const key =
        String(
          job.url
        )
          .split("#")[0]
          .replace(
            /\/$/,
            ""
          )
          .toLowerCase();

      if (!map.has(key)) {
        map.set(
          key,
          job
        );
      }
    }

    return [
      ...map.values()
    ];
  }

  function integrate(event) {

    const incoming =
      event?.detail?.jobs ||
      window.GOO_LIVE_JOBS ||
      [];

    state.jobs =
      uniqueJobs(
        incoming
      );

    state.ready =
      true;

    window.GOO_LIVE_INTEGRATION =
      state;

    window.dispatchEvent(
      new CustomEvent(
        "goo:jobs-merged-ready",
        {
          detail: {
            jobs: state.jobs,
            count: state.jobs.length
          }
        }
      )
    );
  }

  window.GOO_GET_ALL_LIVE_JOBS =
    () => state.jobs.slice();

  window.GOO_FIND_LIVE_JOB =
    id =>
      state.jobs.find(
        job =>
          String(job.id) ===
          String(id)
      ) || null;

  window.addEventListener(
    "goo:live-jobs-ready",
    integrate
  );

  if (
    Array.isArray(
      window.GOO_LIVE_JOBS
    )
  ) {
    integrate({
      detail: {
        jobs:
          window.GOO_LIVE_JOBS
      }
    });
  }

})();
