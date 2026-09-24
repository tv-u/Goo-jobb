(function(){
"use strict";

if(window.GOO_RESPONSIVE_MASTER)return;

function refresh(){
 document.documentElement.style.setProperty(
  "--goo-vw",
  (document.documentElement.clientWidth||0)+"px"
 );
 document.documentElement.style.overflowX="hidden";
 if(document.body)document.body.style.overflowX="hidden";
}

function start(){
 refresh();
 window.addEventListener("resize",refresh,{passive:true});
 window.addEventListener("orientationchange",refresh,{passive:true});
 window.addEventListener("pageshow",refresh,{passive:true});
}

if(document.readyState==="loading"){
 document.addEventListener("DOMContentLoaded",start,{once:true});
}else{
 start();
}

window.GOO_RESPONSIVE_MASTER={
 version:"1.0.0",
 refresh:refresh
};

})();
