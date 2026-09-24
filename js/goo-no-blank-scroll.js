(function(){
  "use strict";

  /*
   * GOO-JOBB REAL-JOBS ONLY SCROLL SAFETY LAYER
   * Never creates fake jobs.
   * Never replaces the real jobs source.
   */

  var busy=false;
  var lastRun=0;
  var minGap=350;

  function getLoader(){
    var names=[
      "loadMoreJobs",
      "loadNextJobs",
      "loadMore",
      "loadNextChunk",
      "loadNextBatch",
      "renderMoreJobs",
      "renderNextBatch",
      "ensureJobsLoaded"
    ];

    for(var i=0;i<names.length;i++){
      var fn=window[names[i]];
      if(typeof fn==="function") return fn;
    }

    return null;
  }

  function clickLoader(){
    var selectors=[
      "[data-load-more]",
      "#loadMore",
      "#load-more",
      ".load-more",
      "[aria-label*='Load more' i]",
      "[aria-label*='load more' i]"
    ];

    for(var i=0;i<selectors.length;i++){
      var el=document.querySelector(selectors[i]);

      if(
        el &&
        !el.disabled &&
        el.getAttribute("aria-disabled")!=="true" &&
        el.offsetParent!==null
      ){
        el.click();
        return true;
      }
    }

    return false;
  }

  function preload(){
    if(busy) return;

    var now=Date.now();
    if(now-lastRun<minGap) return;

    lastRun=now;
    busy=true;

    try{
      var fn=getLoader();

      if(fn){
        var result=fn();

        if(result && typeof result.then==="function"){
          result.catch(function(){}).finally(function(){
            busy=false;
          });
        }else{
          setTimeout(function(){
            busy=false;
          },250);
        }

        return;
      }

      clickLoader();

    }catch(e){
      /* Never break the real application. */
    }

    setTimeout(function(){
      busy=false;
    },250);
  }

  function nearBottom(){
    var doc=document.documentElement;
    var remaining=doc.scrollHeight-(window.scrollY+window.innerHeight);

    if(remaining<3000){
      preload();
    }
  }

  function setupObserver(){
    if(!("IntersectionObserver" in window)) return;

    var sentinel=document.createElement("div");
    sentinel.className="goo-scroll-loader";
    sentinel.setAttribute("aria-hidden","true");

    sentinel.style.width="100%";
    sentinel.style.height="2px";
    sentinel.style.pointerEvents="none";

    document.body.appendChild(sentinel);

    var observer=new IntersectionObserver(function(entries){
      for(var i=0;i<entries.length;i++){
        if(entries[i].isIntersecting){
          preload();
          break;
        }
      }
    },{
      root:null,
      rootMargin:"3500px 0px 3500px 0px",
      threshold:0
    });

    observer.observe(sentinel);
  }

  function start(){
    window.addEventListener("scroll",nearBottom,{passive:true});
    window.addEventListener("resize",nearBottom,{passive:true});

    setTimeout(preload,400);
    setTimeout(preload,1200);
    setTimeout(preload,2200);

    setupObserver();

    setTimeout(nearBottom,800);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",start,{once:true});
  }else{
    start();
  }

  window.GOO_NO_BLANK_SCROLL={
    version:"3.0.0",
    preload:preload,
    countJobs:function(){
      return document.querySelectorAll(
        ".job-card,.job-item,.job,.job-result,.job-result-card,[data-job-card]"
      ).length;
    }
  };
})();
