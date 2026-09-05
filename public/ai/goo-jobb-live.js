(()=>{

"use strict";

const DATA="/Goo-jobb/jobs-worldwide.json";

async function refresh(){

  try{

    const r=await fetch(
      DATA+"?t="+Date.now(),
      {
        cache:"no-store",
        headers:{"Accept":"application/json"}
      }
    );

    if(!r.ok) return;

    const jobs=await r.json();

    window.GOO_JOBB_LIVE={
      jobs:Array.isArray(jobs)?jobs:[],
      count:Array.isArray(jobs)?jobs.length:0,
      updatedAt:new Date().toISOString()
    };

    document.dispatchEvent(
      new CustomEvent("goo-jobb-live-ready",{
        detail:window.GOO_JOBB_LIVE
      })
    );

  }catch(e){
    console.warn("GOO-JOBB live data unavailable");
  }
}

refresh();

})();
