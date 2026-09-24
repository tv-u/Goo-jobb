(function(){
"use strict";

if(window.GOO_PERFORMANCE_SAFE)return;

var state={
  busy:false,
  lastLoad:0,
  attempts:0,
  maxAttempts:3,
  timer:null
};

var selectors=[
  ".job-card",
  ".job-item",
  ".job-result",
  ".job-result-card",
  "[data-job-card]"
];

function uniqueCards(){
  var set=new Set();
  var out=[];

  selectors.forEach(function(selector){
    document.querySelectorAll(selector).forEach(function(el){
      if(!set.has(el)){
        set.add(el);
        out.push(el);
      }
    });
  });

  return out;
}

function findLoader(){
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
    try{
      if(typeof window[names[i]]==="function"){
        return window[names[i]];
      }
    }catch(e){}
  }

  return null;
}

function clickLoader(){
  var selectors=[
    "[data-load-more]",
    "#loadMore",
    "#load-more",
    ".load-more",
    "button[aria-label*='load more' i]",
    "button[aria-label*='more jobs' i]"
  ];

  for(var i=0;i<selectors.length;i++){
    var el=document.querySelector(selectors[i]);

    if(el &&
       !el.disabled &&
       el.offsetParent!==null &&
       !el.dataset.gooPerformanceClicked){

      el.dataset.gooPerformanceClicked="1";

      try{
        el.click();
        return true;
      }catch(e){}
    }
  }

  return false;
}

function loadMore(){
  if(state.busy)return false;

  var now=Date.now();

  if(now-state.lastLoad<700)return false;

  if(state.attempts>=state.maxAttempts){
    state.attempts=0;
  }

  var loader=findLoader();

  state.busy=true;
  state.lastLoad=now;
  state.attempts++;

  var result=false;

  try{
    if(loader){
      result=loader();
    }else{
      result=clickLoader();
    }
  }catch(e){
    result=false;
  }

  window.setTimeout(function(){
    state.busy=false;

    if(!result){
      state.attempts=Math.max(0,state.attempts-1);
    }
  },900);

  return !!result;
}

function nearBottom(){
  var doc=document.documentElement;

  var scrollTop=window.scrollY ||
    window.pageYOffset ||
    doc.scrollTop ||
    0;

  var viewport=window.innerHeight||doc.clientHeight||0;

  var height=Math.max(
    doc.scrollHeight||0,
    document.body ? document.body.scrollHeight : 0
  );

  return height-(scrollTop+viewport)<2800;
}

function onScroll(){
  if(nearBottom()){
    loadMore();
  }
}

function cleanup(){
  document.querySelectorAll(
    ".goo-performance-duplicate,[data-goo-performance-duplicate]"
  ).forEach(function(el){
    if(el && el.parentNode){
      el.parentNode.removeChild(el);
    }
  });
}

function start(){
  window.addEventListener(
    "scroll",
    onScroll,
    {passive:true}
  );

  window.addEventListener(
    "resize",
    function(){
      if(state.timer)clearTimeout(state.timer);

      state.timer=setTimeout(function(){
        if(nearBottom())loadMore();
      },180);
    },
    {passive:true}
  );

  window.setTimeout(loadMore,800);
  window.setTimeout(loadMore,1800);
  window.setTimeout(cleanup,2500);

  if("requestIdleCallback" in window){
    window.requestIdleCallback(cleanup,{timeout:4000});
  }else{
    window.setTimeout(cleanup,4000);
  }
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",start,{once:true});
}else{
  start();
}

window.GOO_PERFORMANCE_SAFE={
  version:"1.0.0",
  loadedJobs:function(){
    return uniqueCards().length;
  },
  loadMore:loadMore
};

})();
