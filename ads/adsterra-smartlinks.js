/* GOOJOBB_ADSTERRA_V4 */
(function(){
"use strict";
var links=[
"https://www.effectivecpmnetwork.com/x0wcj4zk?key=c2b46070b44982014166acafd6074c3d",
"https://www.effectivecpmnetwork.com/sa8mca36sv?key=3711015d24018cf89ccb362976c4a2e0",
"https://www.profitableratecpmnetwork.com/sa8mca36sv?key=3711015d24018cf89ccb362976c4a2e0",
"https://www.profitableratecpmnetwork.com/x0wcj4zk?key=c2b46070b44982014166acafd6074c3d"
];
function ready(){
 if(document.getElementById("goo-adsterra-v4"))return;
 var box=document.createElement("section");
 box.id="goo-adsterra-v4";
 box.setAttribute("aria-label","Sponsored");
 box.innerHTML='<div class="goo-ad-title">Sponsored opportunities</div><div class="goo-ad-sub">Support GOO-JOBB — explore a relevant offer</div><div class="goo-ad-grid"></div>';
 var grid=box.querySelector(".goo-ad-grid");
 links.slice(0,2).forEach(function(url,i){
  var a=document.createElement("a");
  a.href=url;a.target="_blank";a.rel="noopener noreferrer sponsored";
  a.className="goo-ad-btn";a.textContent=i===0?"Explore offer":"View opportunity";
  grid.appendChild(a);
 });
 var style=document.createElement("style");
 style.textContent="#goo-adsterra-v4{box-sizing:border-box;max-width:1100px;margin:28px auto;padding:14px 16px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.025);font-family:inherit;color:inherit}#goo-adsterra-v4 .goo-ad-title{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.7}#goo-adsterra-v4 .goo-ad-sub{font-size:12px;opacity:.65;margin:5px 0 12px}.goo-ad-grid{display:flex;gap:10px;flex-wrap:wrap}.goo-ad-btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 15px;border-radius:10px;text-decoration:none!important;font-weight:700;font-size:13px;border:1px solid rgba(0,255,136,.28);background:rgba(0,255,136,.06);color:inherit!important;transition:transform .18s ease,background .18s ease}.goo-ad-btn:hover{transform:translateY(-1px);background:rgba(0,255,136,.12)}@media(max-width:600px){#goo-adsterra-v4{margin:20px 12px}.goo-ad-btn{flex:1 1 140px}}";
 document.head.appendChild(style);
 var main=document.querySelector("main")||document.querySelector("#app")||document.querySelector(".app")||document.body;
 main.appendChild(box);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
})();