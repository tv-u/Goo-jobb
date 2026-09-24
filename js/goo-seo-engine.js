(function () {
  "use strict";

  var SITE = "https://tv-u.github.io/Goo-jobb";

  function clean(value) {
    return String(value == null ? "" : value)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function slug(value) {
    return clean(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90);
  }

  function idOf(job) {
    return clean(
      job &&
      (
        job.id ||
        job.job_id ||
        job.jobId ||
        job.uuid ||
        job.guid
      )
    );
  }

  function titleOf(job) {
    return clean(
      job &&
      (
        job.title ||
        job.position ||
        job.name ||
        job.job_title
      )
    );
  }

  function companyOf(job) {
    return clean(
      job &&
      (
        job.company ||
        job.company_name ||
        job.employer ||
        job.organization
      )
    );
  }

  function locationOf(job) {
    return clean(
      job &&
      (
        job.location ||
        job.city ||
        job.country ||
        job.region
      )
    );
  }

  function sourceUrl(job) {
    return clean(
      job &&
      (
        job.url ||
        job.apply_url ||
        job.applyUrl ||
        job.link
      )
    );
  }

  function jobUrl(job) {
    var id = idOf(job);
    var title = titleOf(job);

    if (!id) return "";

    return SITE +
      "/job/" +
      encodeURIComponent(id) +
      (title ? "/" + slug(title) : "");
  }

  function setMeta(name, content) {
    if (!content) return;

    var node = document.querySelector(
      'meta[name="' + name + '"]'
    );

    if (!node) {
      node = document.createElement("meta");
      node.name = name;
      document.head.appendChild(node);
    }

    node.content = content;
  }

  function setCanonical(url) {
    if (!url) return;

    var node = document.querySelector(
      'link[rel="canonical"]'
    );

    if (!node) {
      node = document.createElement("link");
      node.rel = "canonical";
      document.head.appendChild(node);
    }

    node.href = url;
  }

  function addSchema(job) {
    var title = titleOf(job);

    if (!title) return;

    var data = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      "title": title
    };

    var description = clean(
      job.description ||
      job.summary ||
      job.excerpt
    );

    var company = companyOf(job);
    var location = locationOf(job);
    var posted =
      job.datePosted ||
      job.date_posted ||
      job.posted_at ||
      job.created_at;

    var valid =
      job.validThrough ||
      job.valid_through ||
      job.expires_at;

    var source = sourceUrl(job);

    if (description) {
      data.description = description;
    }

    if (posted) {
      data.datePosted = String(posted);
    }

    if (valid) {
      data.validThrough = String(valid);
    }

    if (company) {
      data.hiringOrganization = {
        "@type": "Organization",
        "name": company
      };
    }

    if (location) {
      data.jobLocation = {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": location
        }
      };
    }

    if (source) {
      data.url = source;
    }

    var old = document.getElementById(
      "goo-real-jobposting-schema"
    );

    if (old) {
      old.remove();
    }

    var node = document.createElement("script");

    node.type = "application/ld+json";
    node.id = "goo-real-jobposting-schema";
    node.textContent = JSON.stringify(data);

    document.head.appendChild(node);
  }

  function update(job) {
    if (!job || typeof job !== "object") return;

    var title = titleOf(job);

    if (!title) return;

    var company = companyOf(job);
    var location = locationOf(job);

    var pageTitle = title;

    if (company) {
      pageTitle += " at " + company;
    }

    pageTitle += " — GOO-JOBB";

    document.title = pageTitle.slice(0, 70);

    var parts = [
      title + " job opportunity",
      company ? "at " + company : "",
      location ? "in " + location : "",
      "View real job details and apply through the original source"
    ].filter(Boolean);

    setMeta(
      "description",
      parts.join(". ").slice(0, 158)
    );

    setMeta(
      "robots",
      "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
    );

    var url = jobUrl(job);

    if (url) {
      setCanonical(url);
    }

    addSchema(job);
  }

  function expose(job) {
    if (!job || typeof job !== "object") return;

    try {
      var url = jobUrl(job);

      if (url) {
        Object.defineProperty(job, "gooJobURL", {
          value: url,
          configurable: true,
          enumerable: false
        });
      }
    } catch (_) {}
  }

  function scan() {
    var singles = [
      window.currentJob,
      window.selectedJob,
      window.activeJob,
      window.GOO_CURRENT_JOB,
      window.GOO_SELECTED_JOB
    ];

    for (var i = 0; i < singles.length; i++) {
      var job = singles[i];

      if (job && typeof job === "object") {
        update(job);
        expose(job);
      }
    }

    var arrays = [
      window.jobs,
      window.allJobs,
      window.jobData,
      window.GOO_JOBS,
      window.GOO_JOB_DATA
    ];

    for (var a = 0; a < arrays.length; a++) {
      var list = arrays[a];

      if (!Array.isArray(list)) continue;

      for (var j = 0; j < list.length; j++) {
        expose(list[j]);
      }
    }
  }

  window.GOO_JOB_SEO = {
    slug: slug,
    buildURL: jobUrl,
    update: update,
    schema: addSchema,
    scan: scan
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      scan,
      { once: true }
    );
  } else {
    scan();
  }

  setTimeout(scan, 1500);
  setTimeout(scan, 4000);
  setTimeout(scan, 8000);

})();
