/*
============================================================
GOO-JOBB REAL JOB PERFORMANCE ENGINE
============================================================

Optimization layer only.

Goals:
- fast first paint
- progressive job rendering
- prevent giant DOM
- request cancellation
- debounce search
- render batching
- duplicate-request prevention
- browser caching
- idle prefetch
- memory protection

IMPORTANT:
This layer does NOT fabricate jobs.
It does NOT replace the real aggregator.
It does NOT change job IDs.
It does NOT load 1.47M jobs into the DOM.
*/

(function () {
    "use strict";

    if (window.GOO_JOB_PERFORMANCE) return;

    const PERF = {
        version: "1.0.0",

        // Keep DOM small.
        MAX_VISIBLE_JOBS: 120,

        // Render in small batches so scrolling/input stays responsive.
        RENDER_BATCH: 24,

        // Search debounce.
        SEARCH_DEBOUNCE: 180,

        // Prevent repeated same requests.
        REQUEST_CACHE_MS: 30000,

        // Cache manifest/chunk responses in browser memory.
        memoryCache: new Map(),

        // Active requests.
        controllers: new Map(),

        // Last request timestamps.
        requestTimes: new Map(),

        // Animation-frame queue.
        frameQueue: [],

        framePending: false
    };

    function now() {
        return Date.now();
    }

    function schedule(fn) {
        PERF.frameQueue.push(fn);

        if (PERF.framePending) return;

        PERF.framePending = true;

        requestAnimationFrame(function () {
            PERF.framePending = false;

            const queue = PERF.frameQueue.splice(0);

            for (const task of queue) {
                try {
                    task();
                } catch (e) {
                    console.warn("[GOO-PERF]", e);
                }
            }
        });
    }

    function abort(key) {
        const controller = PERF.controllers.get(key);

        if (controller) {
            try {
                controller.abort();
            } catch (_) {}

            PERF.controllers.delete(key);
        }
    }

    async function fetchFast(url, options = {}) {
        const key = String(url);

        const cached = PERF.memoryCache.get(key);

        if (
            cached &&
            now() - cached.time < PERF.REQUEST_CACHE_MS
        ) {
            return cached.data;
        }

        const previousTime = PERF.requestTimes.get(key) || 0;

        if (
            now() - previousTime < 1000 &&
            cached
        ) {
            return cached.data;
        }

        abort(key);

        const controller = new AbortController();

        PERF.controllers.set(key, controller);
        PERF.requestTimes.set(key, now());

        const timeout = setTimeout(function () {
            try {
                controller.abort();
            } catch (_) {}
        }, options.timeout || 30000);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                cache: options.cache || "force-cache",
                credentials: "omit",
                keepalive: false
            });

            if (!response.ok) {
                throw new Error(
                    "HTTP " + response.status
                );
            }

            const data = await response.arrayBuffer();

            PERF.memoryCache.set(key, {
                time: now(),
                data
            });

            return data;
        } finally {
            clearTimeout(timeout);
            PERF.controllers.delete(key);
        }
    }

    function debounce(fn, delay) {
        let timer = 0;

        return function () {
            const args = arguments;

            clearTimeout(timer);

            timer = setTimeout(function () {
                fn.apply(null, args);
            }, delay);
        };
    }

    function chunkArray(array, size) {
        const result = [];

        for (let i = 0; i < array.length; i += size) {
            result.push(
                array.slice(i, i + size)
            );
        }

        return result;
    }

    function renderBatched(items, renderer, target) {
        if (!Array.isArray(items)) return;

        const limited =
            items.slice(0, PERF.MAX_VISIBLE_JOBS);

        const batches =
            chunkArray(
                limited,
                PERF.RENDER_BATCH
            );

        let index = 0;

        function next() {
            if (index >= batches.length) return;

            const batch = batches[index++];

            schedule(function () {
                for (const item of batch) {
                    try {
                        const node =
                            renderer(item);

                        if (node) {
                            target.appendChild(node);
                        }
                    } catch (e) {
                        console.warn(
                            "[GOO-PERF] render",
                            e
                        );
                    }
                }

                if (
                    "requestIdleCallback" in window
                ) {
                    requestIdleCallback(
                        next,
                        { timeout: 100 }
                    );
                } else {
                    setTimeout(next, 0);
                }
            });
        }

        next();
    }

    function installSearchOptimization() {
        window.GOO_DEBOUNCE_SEARCH =
            debounce(
                function (callback, value) {
                    if (
                        typeof callback ===
                        "function"
                    ) {
                        callback(value);
                    }
                },
                PERF.SEARCH_DEBOUNCE
            );
    }

    function installImageLazyLoading() {
        const process = function () {
            document
                .querySelectorAll(
                    "img:not([loading])"
                )
                .forEach(function (img) {
                    img.loading = "lazy";
                    img.decoding = "async";
                });
        };

        if (
            "MutationObserver" in window
        ) {
            const observer =
                new MutationObserver(
                    function () {
                        schedule(process);
                    }
                );

            observer.observe(
                document.documentElement,
                {
                    childList: true,
                    subtree: true
                }
            );
        }

        schedule(process);
    }

    function installVisibilityOptimization() {
        if (
            !("IntersectionObserver" in window)
        ) {
            return;
        }

        window.GOO_JOB_VISIBILITY =
            new IntersectionObserver(
                function (entries) {
                    for (const entry of entries) {
                        if (!entry.isIntersecting) {
                            continue;
                        }

                        const el =
                            entry.target;

                        if (
                            el.dataset &&
                            el.dataset.src &&
                            !el.src
                        ) {
                            el.src =
                                el.dataset.src;
                        }
                    }
                },
                {
                    rootMargin: "300px"
                }
            );
    }

    function cleanupDuplicateNodes() {
        const selectors = [
            "[data-job-id]",
            "[data-jobid]"
        ];

        for (const selector of selectors) {
            const seen = new Set();

            document
                .querySelectorAll(selector)
                .forEach(function (node) {
                    const id =
                        node.getAttribute(
                            "data-job-id"
                        ) ||
                        node.getAttribute(
                            "data-jobid"
                        );

                    if (!id) return;

                    if (seen.has(id)) {
                        node.remove();
                    } else {
                        seen.add(id);
                    }
                });
        }
    }

    function installPerformanceObserver() {
        if (
            "PerformanceObserver" in window
        ) {
            try {
                const observer =
                    new PerformanceObserver(
                        function () {}
                    );

                observer.observe({
                    type: "longtask",
                    buffered: true
                });
            } catch (_) {}
        }
    }

    installSearchOptimization();
    installImageLazyLoading();
    installVisibilityOptimization();
    installPerformanceObserver();

    window.GOO_JOB_PERFORMANCE = {
        ...PERF,
        fetchFast,
        debounce,
        renderBatched,
        cleanupDuplicateNodes,
        abort
    };

    window.dispatchEvent(
        new CustomEvent(
            "goo:performance-ready"
        )
    );

})();
