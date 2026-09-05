(() => {

"use strict";

let jobs=[];
let filtered=[];
let visible=0;

const PAGE_SIZE=50;

function $(selector){
 return document.querySelector(selector);
}

function escapeHTML(value=""){
 return String(value)
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;")
  .replace(/'/g,"&#039;");
}

function escapeURL(value=""){

 try{
  const u=new URL(value);

  if(
   u.protocol!=="http:" &&
   u.protocol!=="https:"
  ){
   return "#";
  }

  return u.href;

 }catch{
  return "#";
 }
}

function findResults(){

 return (
  $("#results") ||
  $("#jobs") ||
  document.querySelector("[data-jobs]") ||
  document.querySelector(".jobs-grid") ||
  document.querySelector(".job-list")
 );
}

function getValue(selectors){

 for(const selector of selectors){

  const el=$(selector);

  if(el){
   return String(el.value||"")
    .trim()
    .toLowerCase();
  }
 }

 return "";
}

function getRemote(){

 for(const selector of [
  "#remote",
  "#remoteOnly",
  "input[name='remote']",
  "input[name='remoteOnly']"
 ]){

  const el=$(selector);

  if(el) return !!el.checked;
 }

 return false;
}

function applyFilters(){

 const q=getValue([
  "#q",
  "#search",
  "#searchInput",
  "input[name='q']",
  "input[name='search']"
 ]);

 const location=getValue([
  "#location",
  "#city",
  "input[name='location']",
  "input[name='city']"
 ]);

 const category=getValue([
  "#category",
  "select[name='category']"
 ]);

 const remote=getRemote();

 filtered=jobs.filter(job=>{

  const text=[
   job.title,
   job.company,
   job.location,
   job.description,
   job.category,
   job.source
  ].join(" ").toLowerCase();

  if(q && !text.includes(q)){
   return false;
  }

  if(
   location &&
   !String(job.location)
    .toLowerCase()
    .includes(location)
  ){
   return false;
  }

  if(
   category &&
   String(job.category).toLowerCase()!==category
  ){
   return false;
  }

  if(remote && !job.remote){
   return false;
  }

  return true;
 });

 visible=PAGE_SIZE;

 render();
}

function render(){

 const box=findResults();

 if(!box) return;

 const list=filtered.slice(0,visible);

 if(!list.length){

  box.innerHTML=`
   <div class="empty-state"
        style="padding:40px;text-align:center">
    <h3>No live jobs found</h3>
    <p>Try another keyword or location.</p>
   </div>
  `;

 }else{

  box.innerHTML=list.map(job=>{

   const url=escapeURL(
    job.apply_url || job.url
   );

   return `
   <article
    class="job-card"
    data-source="${escapeHTML(job.source)}"
   >

    <div class="job-card-body">

     <div class="eyebrow">
      ${escapeHTML(job.source)}
     </div>

     <h3>
      ${escapeHTML(job.title)}
     </h3>

     <p class="job-company">
      ${escapeHTML(job.company)}
     </p>

     <p class="job-location">
      ${escapeHTML(job.location)}
      ${job.remote ? " • Remote" : ""}
     </p>

     <div class="job-meta">

      <span>
       ${escapeHTML(job.category)}
      </span>

     </div>

     <a
      class="btn job-apply"
      href="${url}"
      target="_blank"
      rel="noopener noreferrer nofollow"
     >
      View / Apply →
     </a>

    </div>

   </article>
   `;

  }).join("");
 }

 updateCounters();

 const more=$("#more");

 if(more){

  more.style.display=
   visible<filtered.length
    ? ""
    : "none";
 }
}

function updateCounters(){

 const count=filtered.length;

 for(const selector of [
  "#jobCount",
  "#totalJobs",
  "#jobsCount",
  "[data-job-count]"
 ]){

  const el=$(selector);

  if(el){
   el.textContent=
    count.toLocaleString();
  }
 }
}

function populateCategories(){

 const select=
  $("#category") ||
  document.querySelector(
   "select[name='category']"
  );

 if(!select) return;

 const current=select.value;

 const categories=[
  ...new Set(
   jobs
    .map(x=>x.category)
    .filter(Boolean)
  )
 ].sort();

 select.innerHTML=
  `<option value="">All categories</option>`+
  categories.map(category=>`
   <option value="${escapeHTML(category)}">
    ${escapeHTML(
     category
      .replace(/-/g," ")
      .replace(/\b\w/g,x=>x.toUpperCase())
    )}
   </option>
  `).join("");

 select.value=current;
}

async function load(){

 try{

  const response=await fetch(
   "./jobs.json?v="+Date.now(),
   {
    cache:"no-store"
   }
  );

  if(!response.ok){
   throw new Error(
    "jobs.json HTTP "+response.status
   );
  }

  const data=await response.json();

  jobs=Array.isArray(data.jobs)
   ? data.jobs
   : [];

  populateCategories();

  applyFilters();

  console.log(
   "GOO-JOBB LIVE JOBS:",
   jobs.length
  );

 }catch(error){

  console.error(
   "GOO-JOBB LIVE DATA ERROR:",
   error
  );

  const box=findResults();

  if(box){

   box.innerHTML=`
    <div style="padding:40px;text-align:center">
     <h3>Live job feed unavailable</h3>
     <p>Please refresh shortly.</p>
    </div>
   `;
  }
 }
}

function bind(){

 document.addEventListener(
  "input",
  event=>{

   if(
    event.target.matches(
     "#q,#search,#searchInput,#location,#city,input[name='q'],input[name='search'],input[name='location'],input[name='city']"
    )
   ){
    applyFilters();
   }
  }
 );

 document.addEventListener(
  "change",
  event=>{

   if(
    event.target.matches(
     "#category,#remote,#remoteOnly,select[name='category'],input[name='remote'],input[name='remoteOnly']"
    )
   ){
    applyFilters();
   }
  }
 );

 const more=$("#more");

 if(more){

  more.addEventListener(
   "click",
   ()=>{
    visible+=PAGE_SIZE;
    render();
   }
  );
 }
}

bind();
load();

window.GOO_JOBB_LIVE={
 reload:load,
 search:applyFilters,
 get jobs(){
  return jobs;
 },
 get total(){
  return jobs.length;
 }
};

})();
