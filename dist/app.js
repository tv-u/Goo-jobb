const $=s=>document.querySelector(s);

let ALL=[];
let cursor=0;

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#39;"
}[m]));

const fmt=n=>Number(n||0).toLocaleString();

function toast(msg){
  const x=$("#toast");
  if(!x)return;
  x.textContent=msg;
  x.style.display="block";
  setTimeout(()=>x.style.display="none",2200);
}

async function loadData(){
  try{
    const r=await fetch("./jobs.json?"+Date.now(),{
      cache:"no-store"
    });

    if(!r.ok)
      throw new Error("jobs.json HTTP "+r.status);

    const d=await r.json();

    ALL=Array.isArray(d.jobs)?d.jobs:[];

    const sources=Array.isArray(d.sources)
      ? d.sources.filter(x=>x.status==="ok").length
      : 0;

    if($("#s1"))$("#s1").textContent=fmt(ALL.length);
    if($("#s2")){
      $("#s2").textContent=fmt(
        new Set(ALL.map(x=>x.company).filter(Boolean)).size
      );
    }
    if($("#s3"))$("#s3").textContent=fmt(sources);
    if($("#s4")){
      $("#s4").textContent=fmt(
        new Set(
          ALL.map(x=>x.country || x.location).filter(Boolean)
        ).size
      );
    }
    if($("#statJobs"))$("#statJobs").textContent=fmt(ALL.length);

    render();
  }catch(e){
    console.error(e);

    if($("#results"))
      $("#results").innerHTML=
        `<div class="empty">
          Unable to load jobs right now. Please retry.
        </div>`;

    if($("#jobs"))
      $("#jobs").innerHTML=
        `<div class="empty">
          Unable to load jobs right now. Please retry.
        </div>`;
  }
}

function card(j){
  const location=[
    j.city,
    j.region,
    j.country,
    j.location
  ].filter(Boolean).join(", ");

  return `
  <article class="job">
    <div>
      <span class="tag">${esc(j.category||"Job")}</span>

      <h3>
        <a
          href="${esc(j.apply_url||j.source_url||"#")}"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          ${esc(j.title||"Untitled job")}
        </a>
      </h3>

      <p>
        <strong>${esc(j.company||j.source||"Company")}</strong>
        ${location?" · "+esc(location):""}
        ${j.remote?" · Remote":""}
      </p>

      <p class="muted">
        Source: ${esc(j.source||"Public career feed")}
      </p>

      ${
        j.description
        ? `<p class="muted">${esc(j.description).slice(0,240)}…</p>`
        : ""
      }

      <div class="apply">
        <a
          class="btn"
          href="${esc(j.apply_url||j.source_url||"#")}"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          Apply →
        </a>
      </div>
    </div>
  </article>`;
}

function getFiltered(){
  const q=($("#q")?.value||"").trim().toLowerCase();
  const loc=($("#location")?.value||"").trim().toLowerCase();
  const cat=($("#category")?.value||"").trim().toLowerCase();
  const remote=$("#remote")?.checked;

  let rows=ALL.filter(j=>{
    const hay=[
      j.title,
      j.company,
      j.description,
      j.location,
      j.country,
      j.city,
      j.category
    ].join(" ").toLowerCase();

    if(q && !hay.includes(q))return false;
    if(loc && !hay.includes(loc))return false;
    if(cat && String(j.category||"").toLowerCase()!==cat)return false;
    if(remote && !j.remote)return false;

    return true;
  });

  const sort=$("#sort")?.value||"new";

  if(sort==="new"){
    rows.sort((a,b)=>
      new Date(b.published_at||0) -
      new Date(a.published_at||0)
    );
  }

  return rows;
}

function render(){
  const rows=getFiltered();

  const slice=rows.slice(0,cursor+24);

  const target=$("#results")||$("#jobs");

  if(!target)return;

  if(!slice.length){
    target.innerHTML=
      `<div class="empty">No matching jobs found.</div>`;
  }else{
    target.innerHTML=slice.map(card).join("");
  }

  cursor=slice.length;

  const more=$("#more");
  if(more)
    more.style.display=
      cursor<rows.length ? "block" : "none";

  const heading=$("#heading");
  if(heading)
    heading.textContent=
      `${rows.length.toLocaleString()} jobs`;
}

function searchSubmit(e){
  e.preventDefault();
  cursor=0;
  render();

  const section=$("#jobs");
  if(section)
    section.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
}

document.addEventListener("DOMContentLoaded",()=>{
  $("#search")?.addEventListener("submit",searchSubmit);

  $("#sort")?.addEventListener("change",()=>{
    cursor=0;
    render();
  });

  $("#category")?.addEventListener("change",()=>{
    cursor=0;
    render();
  });

  $("#remote")?.addEventListener("change",()=>{
    cursor=0;
    render();
  });

  $("#more")?.addEventListener("click",()=>{
    render();
  });

  document.querySelectorAll("[data-q]").forEach(b=>{
    b.addEventListener("click",()=>{
      if($("#q"))
        $("#q").value=b.dataset.q||"";
      cursor=0;
      render();
    });
  });

  loadData();
});
