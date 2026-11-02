const DIVISIONS = ["Overall", "Männer", "Frauen", "Mixed"];
let sourceData;
let activeDivision = "Männer";
let activeView = "overall";

function ageGroup(age) {
  const bands = [[24,"16–24"],[29,"25–29"],[34,"30–34"],[39,"35–39"],[44,"40–44"],[49,"45–49"],[54,"50–54"],[59,"55–59"],[64,"60–64"],[69,"65–69"],[74,"70–74"],[79,"75–79"],[84,"80–84"],[89,"85–89"]];
  return (bands.find(([max]) => age <= max) || bands[bands.length-1])[1];
}
function rankTeams(teams, stations) {
  const enriched = teams.map(t => ({...t, stationRanks:{}}));
  for (const station of stations) {
    const sorted = [...enriched].sort((a,b) => station.direction === "asc"
      ? a.results[station.key] - b.results[station.key]
      : b.results[station.key] - a.results[station.key]);
    let previous = null, rank = 0;
    sorted.forEach((team,index) => {
      const value = team.results[station.key];
      if (previous === null || value !== previous) rank = index + 1;
      team.stationRanks[station.key] = rank;
      previous = value;
    });
  }
  enriched.forEach(t => {
    t.averageAge = (Number(t.age1) + Number(t.age2)) / 2;
    t.ageGroup = ageGroup(t.averageAge);
    t.averageRank = stations.reduce((sum,s) => sum + t.stationRanks[s.key],0) / stations.length;
  });
  const sorted = [...enriched].sort((a,b) => a.averageRank - b.averageRank);
  let previous = null, rank = 0;
  sorted.forEach((team,index) => {
    if (previous === null || Math.abs(team.averageRank-previous) > 1e-9) rank = index+1;
    team.overallRank = rank;
    previous = team.averageRank;
  });
  const ageBuckets = new Map();
  for (const t of enriched) {
    const key = t.ageGroup;
    if (!ageBuckets.has(key)) ageBuckets.set(key,[]);
    ageBuckets.get(key).push(t);
  }
  for (const bucket of ageBuckets.values()) {
    bucket.sort((a,b)=>a.averageRank-b.averageRank);
    let prev=null, r=0;
    bucket.forEach((t,i)=>{if(prev===null || Math.abs(t.averageRank-prev)>1e-9)r=i+1;t.ageRank=r;prev=t.averageRank;});
  }
  return enriched;
}
function fmt(value, digits=1) { return Number(value).toLocaleString("de-DE",{maximumFractionDigits:digits}); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function getDivisionTeams() {
  const selected=activeDivision==="Overall"
    ? sourceData.teams
    : sourceData.teams.filter(t=>t.division===activeDivision);
  return rankTeams(selected,sourceData.stations)
    .sort((a,b)=>a.overallRank-b.overallRank || a.name.localeCompare(b.name,"de"));
}
function getVisibleTeams() {
  const age = document.getElementById("age-filter").value;
  let teams=getDivisionTeams();
  if(activeView==="age") {
    teams=teams.filter(t=>!age || t.ageGroup===age)
      .sort((a,b)=>parseInt(a.ageGroup)-parseInt(b.ageGroup) || a.ageRank-b.ageRank || a.name.localeCompare(b.name,"de"));
  } else {
    teams=teams.filter(t=>!age || t.ageGroup===age)
      .sort((a,b)=>a.overallRank-b.overallRank || a.name.localeCompare(b.name,"de"));
  }
  return teams;
}
function renderPodium() {
  const podium=document.getElementById("podium");
  if(activeView==="age" && !document.getElementById("age-filter").value) {
    podium.innerHTML="";
    podium.hidden=true;
    return;
  }
  podium.hidden=false;
  let top=getVisibleTeams().slice(0,3);
  podium.innerHTML=top.map((t,i)=>`
    <button class="podium-card place-${i+1}" data-team-id="${escapeHtml(t.id)}">
      <span class="podium-place">${["1ST","2ND","3RD"][i]}</span>
      <span class="podium-team">${escapeHtml(t.name)}</span>
      <span class="podium-partners">${escapeHtml(t.partner1)} &amp; ${escapeHtml(t.partner2)}</span>
      <span class="podium-score">${fmt(activeView==="age"?t.ageRank:t.averageRank,activeView==="age"?0:2)} <small>${activeView==="age"?"AK-RANG":"Ø RANGPUNKTE"}</small></span>
    </button>`).join("");
  podium.querySelectorAll("[data-team-id]").forEach(b=>b.addEventListener("click",()=>openTeamDetails(b.dataset.teamId)));
}
function renderLeaderboard() {
  const teams=getVisibleTeams();
  const tbody=document.getElementById("leaderboard");
  const rankHeading=document.getElementById("rank-heading");
  rankHeading.textContent=activeView==="age"?"AK-RANG":"RANG";
  const grouped=activeView==="age" && !document.getElementById("age-filter").value;
  let rows="";
  let lastGroup=null;
  for(const t of teams) {
    if(grouped && t.ageGroup!==lastGroup) {
      lastGroup=t.ageGroup;
      rows+=`<tr class="age-group-row"><td colspan="6">${escapeHtml(t.ageGroup)} <span>ALTERSKLASSE</span></td></tr>`;
    }
    const rank=activeView==="age"?t.ageRank:t.overallRank;
    rows+=`
      <tr class="team-row" data-team-id="${escapeHtml(t.id)}" tabindex="0" role="button" aria-label="Details für ${escapeHtml(t.name)} öffnen">
        <td class="rank">${rank}.</td>
        <td class="team-name">${escapeHtml(t.name)}<span class="row-hint">Details ansehen ↗</span></td>
        <td class="partner-names">${escapeHtml(t.partner1)} &amp; ${escapeHtml(t.partner2)}</td>
        <td>${fmt(t.averageAge,1)}</td>
        <td>${escapeHtml(t.ageGroup)} <span class="partner-names">· AK ${t.ageRank}.</span></td>
        <td class="score">${fmt(t.averageRank,2)}</td>
      </tr>`;
  }
  tbody.innerHTML=rows || `<tr><td colspan="6">Keine Teams für diese Auswahl vorhanden.</td></tr>`;
  tbody.querySelectorAll("[data-team-id]").forEach(row=>{
    row.addEventListener("click",()=>openTeamDetails(row.dataset.teamId));
    row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openTeamDetails(row.dataset.teamId);}});
  });
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.division===activeDivision));
  document.querySelectorAll(".view-button").forEach(b=>b.classList.toggle("active",b.dataset.view===activeView));
  document.querySelector(".results-section .section-heading h2").textContent =
    activeView==="age" ? "Altersklassenwertung" : "Gesamtwertung";
  document.getElementById("view-description").textContent=activeView==="age"
    ? (activeDivision==="Overall"
        ? "Altersklassenwertung über alle Divisionen gemeinsam. Teams werden innerhalb derselben Altersklasse verglichen."
        : "Teams werden innerhalb ihrer Division und Altersklasse verglichen. Ohne Altersklassenfilter werden alle Altersklassen gruppiert angezeigt.")
    : (activeDivision==="Overall"
        ? "Alle Teams aus Männer, Frauen und Mixed gemeinsam. Die Rangfolge basiert auf den absoluten Stationsleistungen ohne Lastenausgleich."
        : "Alle Teams einer Division, sortiert nach dem Durchschnitt ihrer acht Stationsränge.");
  renderPodium();
}
function openTeamDetails(teamId) {
  const raw=sourceData.teams.find(t=>t.id===teamId);
  if(!raw)return;
  const comparisonPool=activeDivision==="Overall"
    ? sourceData.teams
    : sourceData.teams.filter(t=>t.division===raw.division);
  const team=rankTeams(comparisonPool,sourceData.stations).find(t=>t.id===teamId);
  const dialog=document.getElementById("team-dialog");
  document.getElementById("dialog-team-name").textContent=team.name;
  document.getElementById("dialog-team-meta").innerHTML=`
    <span>${escapeHtml(team.division)}</span><span>Ø Alter ${fmt(team.averageAge,1)}</span>
    <span>${escapeHtml(team.ageGroup)}</span><span>${activeDivision==="Overall"?"Overallrang":"Divisionsrang"} ${team.overallRank}</span>`;
  const stationRows=sourceData.stations.map(s=>`
    <div class="detail-row">
      <span class="detail-station">${escapeHtml(s.name)}</span>
      <span class="detail-rank">${team.stationRanks[s.key]}. Platz</span>
      <strong>${fmt(team.results[s.key],0)} ${escapeHtml(s.unit)}</strong>
    </div>`).join("");
  document.getElementById("dialog-team-results").innerHTML=`
    <div class="detail-summary"><span>${activeDivision==="Overall"?"OVERALL-WERTUNG":"DIVISIONSWERTUNG"}</span><strong>${fmt(team.averageRank,2)}</strong><small>Ø Stationsrangpunkte</small></div>
    <div class="detail-partners"><span>TEAM</span><strong>${escapeHtml(team.partner1)} &amp; ${escapeHtml(team.partner2)}</strong></div>
    <div class="detail-station-list">${stationRows}</div>`;
  dialog.showModal();
}
function renderStations() {
  const teamId=document.getElementById("team-filter").value;
  const selectedAge=document.getElementById("age-filter").value;
  // When an age class is selected, station ranks are recalculated only
  // among teams from this division and age class.
  const comparisonPool=activeDivision==="Overall"
    ? sourceData.teams
    : sourceData.teams.filter(t=>t.division===activeDivision);
  const ranked=rankTeams(comparisonPool,sourceData.stations);
  const teams=ranked.filter(t=>!selectedAge || t.ageGroup===selectedAge);
  const cards=sourceData.stations.map(s=>{
    const sorted=[...teams].sort((a,b)=>s.direction==="asc"?a.results[s.key]-b.results[s.key]:b.results[s.key]-a.results[s.key]);
    const visible=teamId?sorted.filter(t=>t.id===teamId):sorted.slice(0,3);
    return `<article class="station-card"><h3>${escapeHtml(s.name)}</h3>${visible.map(t=>`
      <div class="station-leader"><span>${t.stationRanks[s.key]}. ${escapeHtml(t.name)}</span><span>${fmt(t.results[s.key],0)} ${escapeHtml(s.unit)}</span></div>`).join("")}</article>`;
  }).join("");
  document.getElementById("station-cards").innerHTML=cards;
  document.querySelector(".stations-section .section-heading h2").textContent =
    selectedAge ? `Stationswertungen · ${selectedAge}` : "Stationswertungen";
}
function init(data) {
  sourceData=data;
  document.title=`${data.event.name} – Ergebnisse`;
  document.getElementById("event-title").textContent=data.event.name;
  document.getElementById("event-subtitle").textContent=data.event.subtitle||"";
  document.getElementById("event-date").textContent=data.event.date||"";
  document.getElementById("event-location").textContent=data.event.location||"";
  document.getElementById("status-pill").textContent=data.event.status||"ERGEBNISSE";
  document.getElementById("data-notice").textContent=data.event.notice||"";
  document.getElementById("total-teams").textContent=data.teams.length;
  document.getElementById("station-count").textContent=data.stations.length;
  const counts={"Overall":"count-overall","Männer":"count-men","Frauen":"count-women","Mixed":"count-mixed"};
  for(const [div,id] of Object.entries(counts)) {
    const el=document.getElementById(id);
    if(el) el.textContent=div==="Overall"?data.teams.length:data.teams.filter(t=>t.division===div).length;
  }
  const ages=[...new Set(data.teams.map(t=>ageGroup((Number(t.age1)+Number(t.age2))/2)))].sort((a,b)=>parseInt(a)-parseInt(b));
  document.getElementById("age-filter").innerHTML='<option value="">Alle Altersklassen</option>'+ages.map(a=>`<option>${a}</option>`).join("");
  const initialTeams=activeDivision==="Overall"?data.teams:data.teams.filter(t=>t.division===activeDivision);
  document.getElementById("team-filter").innerHTML='<option value="">Top 3 je Station</option>'+initialTeams.map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join("");
  renderLeaderboard();renderStations();
}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  activeDivision=b.dataset.division;
  document.getElementById("team-filter").value="";
  const selectedAge=document.getElementById("age-filter").value;
  const candidates=(activeDivision==="Overall"?sourceData.teams:sourceData.teams.filter(t=>t.division===activeDivision))
    .filter(t=>!selectedAge || ageGroup((Number(t.age1)+Number(t.age2))/2)===selectedAge);
  document.getElementById("team-filter").innerHTML='<option value="">Top 3 je Station</option>'+candidates
    .map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join("");
  renderLeaderboard();renderStations();
}));
document.getElementById("age-filter").addEventListener("change",()=>{
  const selectedAge=document.getElementById("age-filter").value;
  const eligible=(activeDivision==="Overall"?sourceData.teams:sourceData.teams.filter(t=>t.division===activeDivision))
    .filter(t=>!selectedAge || ageGroup((Number(t.age1)+Number(t.age2))/2)===selectedAge);
  const current=document.getElementById("team-filter").value;
  document.getElementById("team-filter").innerHTML='<option value="">Top 3 je Station</option>'+eligible
    .map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join("");
  if(!eligible.some(t=>t.id===current)) document.getElementById("team-filter").value="";
  renderLeaderboard();
  renderStations();
});
document.getElementById("team-filter").addEventListener("change",renderStations);
fetch("data/results.json").then(r=>{if(!r.ok)throw new Error("results.json konnte nicht geladen werden");return r.json();}).then(init).catch(err=>{
  document.getElementById("data-notice").textContent="Daten konnten nicht geladen werden. Bitte die Website über einen lokalen Webserver oder GitHub Pages öffnen. "+err.message;
});

document.getElementById("dialog-close").addEventListener("click",()=>document.getElementById("team-dialog").close());
document.getElementById("team-dialog").addEventListener("click",e=>{
  if(e.target===e.currentTarget)e.currentTarget.close();
});

document.querySelectorAll(".view-button").forEach(button=>button.addEventListener("click",()=>{
  activeView=button.dataset.view;
  renderLeaderboard();
}));
