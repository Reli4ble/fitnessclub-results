const DIVISIONS = ["Overall", "Männer", "Frauen", "Mixed"];
let sourceData;
let eventIndex=[];
let currentEventId=null;
let activeDivision = "Männer";
let activeView = "overall";

function ageGroup(age) {
  if (age === null || age === undefined || !Number.isFinite(Number(age))) return null;
  const bands = [[24,"16–24"],[29,"25–29"],[34,"30–34"],[39,"35–39"],[44,"40–44"],[49,"45–49"],[54,"50–54"],[59,"55–59"],[64,"60–64"],[69,"65–69"],[74,"70–74"],[79,"75–79"],[84,"80–84"],[89,"85–89"]];
  return (bands.find(([max]) => Number(age) <= max) || bands[bands.length-1])[1];
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
    const hasAges = t.age1 !== null && t.age1 !== undefined && t.age2 !== null && t.age2 !== undefined;
    t.averageAge = hasAges ? (Number(t.age1) + Number(t.age2)) / 2 : null;
    t.ageGroup = hasAges ? ageGroup(t.averageAge) : null;
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
    if (!t.ageGroup) continue;
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
        <td>${t.averageAge===null?"–":fmt(t.averageAge,1)}</td>
        <td>${t.ageGroup?`${escapeHtml(t.ageGroup)} <span class="partner-names">· AK ${t.ageRank}.</span>`:"–"}</td>
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
function polarPoint(cx,cy,r,angle){return [cx+Math.cos(angle)*r,cy+Math.sin(angle)*r];}
function renderTeamRadar(team, stations, maxRank){
  const cx=150,cy=132,r=88;
  const values=stations.map(s=>Math.max(0,Math.min(100,((maxRank-team.stationRanks[s.key]+1)/maxRank)*100)));
  const angle=i=>(-Math.PI/2)+(Math.PI*2*i/stations.length);
  const rings=[25,50,75,100].map(level=>{
    const pts=stations.map((_,i)=>polarPoint(cx,cy,r*level/100,angle(i)).join(',')).join(' ');
    return `<polygon points="${pts}" class="radar-grid" />`;
  }).join('');
  const axes=stations.map((s,i)=>{const [x,y]=polarPoint(cx,cy,r,angle(i));return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="radar-axis"/>`;}).join('');
  const points=values.map((v,i)=>polarPoint(cx,cy,r*v/100,angle(i)).join(',')).join(' ');
  const labels=stations.map((s,i)=>{const [x,y]=polarPoint(cx,cy,r+20,angle(i));const anchor=x<cx-8?'end':x>cx+8?'start':'middle';return `<text x="${x}" y="${y+3}" text-anchor="${anchor}" class="radar-label">${escapeHtml(s.shortName||s.name)}</text>`;}).join('');
  return `<svg class="team-radar" viewBox="0 0 300 265" role="img" aria-label="Normalisiertes Stationsprofil. Höhere Werte bedeuten bessere Platzierungen.">${rings}${axes}<polygon points="${points}" class="radar-area"/><polyline points="${points}" class="radar-line"/>${values.map((v,i)=>{const [x,y]=polarPoint(cx,cy,r*v/100,angle(i));return `<circle cx="${x}" cy="${y}" r="3.5" class="radar-dot"/>`;}).join('')}${labels}</svg>`;
}
function renderCumulativeRank(team, stations){
  let sum=0;
  const values=stations.map((s,i)=>{sum+=team.stationRanks[s.key];return sum/(i+1);});
  const min=1,max=Math.max(2,...values.map(v=>v));
  const x=i=>28+i*(284/Math.max(1,stations.length-1));
  const y=v=>18+(v-min)/(max-min||1)*94;
  const path=values.map((v,i)=>`${i?'L':'M'} ${x(i)} ${y(v)}`).join(' ');
  return `<svg class="rank-trend" viewBox="0 0 340 145" role="img" aria-label="Kumulierte durchschnittliche Stationsrangpunkte; niedriger ist besser."><line x1="28" y1="18" x2="312" y2="18" class="trend-grid"/><line x1="28" y1="112" x2="312" y2="112" class="trend-grid"/><path d="${path}" class="trend-line"/>${values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3.5" class="trend-dot"><title>${escapeHtml(stations[i].name)}: ${fmt(v,2)} Ø-Rang</title></circle>`).join('')}<text x="28" y="133" class="trend-label">${escapeHtml(stations[0].shortName||stations[0].name)}</text><text x="312" y="133" text-anchor="end" class="trend-label">${escapeHtml(stations[stations.length-1].shortName||stations[stations.length-1].name)}</text><text x="28" y="11" class="trend-label">Besser ↑</text></svg>`;
}
function openTeamDetails(teamId) {
  const raw=sourceData.teams.find(t=>t.id===teamId);
  if(!raw)return;
  // Station ranks and the normalized profile are calculated within the team's own division,
  // because the divisions use different loads and must not be mixed in this comparison.
  const divisionPool=sourceData.teams.filter(t=>t.division===raw.division);
  const rankedDivision=rankTeams(divisionPool,sourceData.stations);
  const team=rankedDivision.find(t=>t.id===teamId);
  const overall=rankTeams(sourceData.teams,sourceData.stations).find(t=>t.id===teamId);
  const maxRank=divisionPool.length;
  const dialog=document.getElementById("team-dialog");
  document.getElementById("dialog-team-name").textContent=team.name;
  document.getElementById("dialog-team-meta").innerHTML=`
    <span>${escapeHtml(team.division)}</span><span>${team.averageAge===null?"Alter nicht erfasst":"Ø Alter "+fmt(team.averageAge,1)}</span>
    ${team.ageGroup?`<span>${escapeHtml(team.ageGroup)}</span>`:""}<span>Divisionsrang ${team.overallRank}</span><span>Overallrang ${overall.overallRank}</span>`;
  const stationRows=sourceData.stations.map(s=>{
    const rank=team.stationRanks[s.key];
    const width=Math.max(8,((maxRank-rank+1)/maxRank)*100);
    return `<div class="performance-row"><div class="performance-top"><span>${escapeHtml(s.name)}</span><strong>${fmt(team.results[s.key],0)} ${escapeHtml(s.unit)}</strong></div><div class="performance-bottom"><div class="performance-track"><span style="width:${width}%"></span></div><small>Platz ${rank} von ${maxRank}</small></div></div>`;
  }).join("");
  document.getElementById("dialog-team-results").innerHTML=`
    <div class="team-kpi-grid">
      <div class="team-kpi"><span>DIVISIONSPLATZ</span><strong>${team.overallRank}.</strong></div>
      <div class="team-kpi"><span>Ø STATIONSRANG</span><strong>${fmt(team.averageRank,2)}</strong></div>
      <div class="team-kpi"><span>STATIONEN</span><strong>${sourceData.stations.length}/${sourceData.stations.length}</strong></div>
    </div>
    <div class="detail-partners"><span>TEAM</span><strong>${escapeHtml(team.partner1)} &amp; ${escapeHtml(team.partner2)}</strong></div>
    <div class="team-visual-grid">
      <section class="team-visual-card"><p class="eyebrow">PERFORMANCE RADAR</p><h3>Stationsprofil</h3>${renderTeamRadar(team,sourceData.stations,maxRank)}<p class="chart-note">Innerhalb der Division normalisiert. 100 = beste Platzierung.</p></section>
      <section class="team-visual-card"><p class="eyebrow">RANK DEVELOPMENT</p><h3>Kumulierte Rangpunkte</h3>${renderCumulativeRank(team,sourceData.stations)}<p class="chart-note">Durchschnitt der bis dahin absolvierten Stationsränge. Niedriger ist besser.</p></section>
    </div>
    <section class="team-station-performance"><p class="eyebrow">STATION PERFORMANCE</p><h3>Einzelergebnisse</h3><div class="performance-list">${stationRows}</div></section>`;
  dialog.showModal();
  history.replaceState(null,"",location.pathname+`#${encodeURIComponent(currentEventId||sourceData.event.id)}/${encodeURIComponent(teamId)}`);
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
  const ageGroupsAvailable = data.event.ageGroupsAvailable !== false && data.teams.every(t => t.age1 !== null && t.age1 !== undefined && t.age2 !== null && t.age2 !== undefined);
  document.querySelector(".view-switch").hidden = !ageGroupsAvailable;
  document.getElementById("age-filter").parentElement.hidden = !ageGroupsAvailable;
  document.querySelectorAll(".view-button[data-view='age']").forEach(b => b.hidden = !ageGroupsAvailable);
  if (!ageGroupsAvailable) activeView = "overall";
  const ages=[...new Set(data.teams.map(t=>t.ageGroup || ageGroup(t.averageAge)).filter(Boolean))].sort((a,b)=>parseInt(a)-parseInt(b));
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
function eventDateValue(value){ if(!value)return null; const d=new Date(value+ (value.length===10?"T00:00:00":"")); return Number.isNaN(d.getTime())?null:d; }
function formatEventDate(value){const d=eventDateValue(value);return d?d.toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"}):"Termin folgt";}
function eventFlagSvg(countryCode){
  const flags={
    DE:'<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="120" height="26.67" fill="#111"/><rect y="26.67" width="120" height="26.66" fill="#d00"/><rect y="53.33" width="120" height="26.67" fill="#ffce00"/></svg>',
    NL:'<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="120" height="26.67" fill="#ae1c28"/><rect y="26.67" width="120" height="26.66" fill="#fff"/><rect y="53.33" width="120" height="26.67" fill="#21468b"/></svg>',
    AT:'<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="120" height="80" fill="#ed2939"/><rect y="26.67" width="120" height="26.66" fill="#fff"/></svg>',
    CH:'<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="120" height="80" fill="#d52b1e"/><path d="M48 14h24v18h18v16H72v18H48V48H30V32h18z" fill="#fff"/></svg>',
    FR:'<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="40" height="80" fill="#002395"/><rect x="40" width="40" height="80" fill="#fff"/><rect x="80" width="40" height="80" fill="#ed2939"/></svg>',
    IT:'<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="40" height="80" fill="#009246"/><rect x="40" width="40" height="80" fill="#fff"/><rect x="80" width="40" height="80" fill="#ce2b37"/></svg>',
    ES:'<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="120" height="20" fill="#aa151b"/><rect y="20" width="120" height="40" fill="#f1bf00"/><rect y="60" width="120" height="20" fill="#aa151b"/></svg>',
    BE:'<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="40" height="80" fill="#111"/><rect x="40" width="40" height="80" fill="#fae042"/><rect x="80" width="40" height="80" fill="#ed2939"/></svg>',
    US:'<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="120" height="80" fill="#fff"/><path d="M0 0h120v6H0zm0 12h120v6H0zm0 12h120v6H0zm0 12h120v6H0zm0 12h120v6H0zm0 12h120v6H0zm0 12h120v2H0z" fill="#b22234"/><rect width="52" height="43" fill="#3c3b6e"/><g fill="#fff"><circle cx="9" cy="8" r="2"/><circle cx="22" cy="8" r="2"/><circle cx="35" cy="8" r="2"/><circle cx="9" cy="21" r="2"/><circle cx="22" cy="21" r="2"/><circle cx="35" cy="21" r="2"/><circle cx="9" cy="34" r="2"/><circle cx="22" cy="34" r="2"/><circle cx="35" cy="34" r="2"/></g></svg>'
  };
  const code=String(countryCode||"").trim().toUpperCase();
  return flags[code]||"";
}
function eventCard(event,featured=false){
  const status=event.status==="planned"?"GEPLANT":event.status==="completed"?"ABGESCHLOSSEN":"ERGEBNISSE VERÖFFENTLICHT";
  const action=event.status==="results"?"ERGEBNISSE ANSEHEN →":event.status==="planned"?"EVENTDETAILS →":"ERGEBNISSE FOLGEN →";
  const flag=eventFlagSvg(event.countryCode);
  return `<button class="event-card ${featured?"featured":""}" data-event-id="${escapeHtml(event.id)}">${flag?`<span class="event-flag" aria-hidden="true">${flag}</span>`:""}<span class="event-status">${status}</span><span><span class="event-title">${escapeHtml(event.name)}</span><span class="event-meta">${escapeHtml(formatEventDate(event.date))} · ${escapeHtml(event.location||"Fitnessclub")}</span></span><span class="event-action">${action}</span></button>`;
}
function renderEventIndex(){
  const now=new Date(); now.setHours(0,0,0,0);
  const planned=eventIndex.filter(e=>e.status==="planned").sort((a,b)=>(eventDateValue(a.date)||new Date(8640000000000000))-(eventDateValue(b.date)||new Date(8640000000000000)));
  const past=eventIndex.filter(e=>e.status==="results"||e.status==="completed").sort((a,b)=>(eventDateValue(b.date)||new Date(0))-(eventDateValue(a.date)||new Date(0)));
  const featured=planned[0]||null;
  document.getElementById("featured-event-section").hidden=!featured;
  document.getElementById("featured-event").innerHTML=featured?eventCard(featured,true):"";
  document.getElementById("past-events").innerHTML=past.map(e=>eventCard(e)).join("");
  document.getElementById("events-empty").hidden=!!(featured||past.length);
  document.querySelectorAll("[data-event-id]").forEach(b=>b.addEventListener("click",()=>openEvent(b.dataset.eventId)));
}
function showEvents(){document.getElementById("events-page").hidden=false;document.getElementById("results-page").hidden=true;document.getElementById("nav-results").hidden=true;document.getElementById("status-pill").textContent="EVENTS";history.replaceState(null,"",location.pathname+"#events");}
function openEvent(id){
  const event=eventIndex.find(e=>e.id===id); if(!event)return;
  if(!event.dataFile){alert("Für dieses Event sind noch keine Ergebnisse hinterlegt.");return;}
  fetch(event.dataFile).then(r=>{if(!r.ok)throw new Error("Eventdaten konnten nicht geladen werden");return r.json();}).then(data=>{
    currentEventId=id; init(data); document.getElementById("events-page").hidden=true; document.getElementById("results-page").hidden=false; document.getElementById("nav-results").hidden=false; document.getElementById("status-pill").textContent=event.status==="planned"?"GEPLANT":"ERGEBNISSE"; history.replaceState(null,"",location.pathname+"#"+encodeURIComponent(id)); window.scrollTo(0,0);
  }).catch(err=>{document.getElementById("events-empty").textContent=err.message;document.getElementById("events-empty").hidden=false;});
}
fetch("data/events.json").then(r=>{if(!r.ok)throw new Error("events.json konnte nicht geladen werden");return r.json();}).then(data=>{eventIndex=data.events||[];renderEventIndex();if(location.hash.length>1&&location.hash!=="#events"){const id=decodeURIComponent(location.hash.slice(1));if(eventIndex.some(e=>e.id===id))openEvent(id);}}).catch(err=>{document.getElementById("events-empty").textContent="Eventübersicht konnte nicht geladen werden: "+err.message;document.getElementById("events-empty").hidden=false;});
document.getElementById("nav-events").addEventListener("click",showEvents);
document.getElementById("brand-home").addEventListener("click",e=>{e.preventDefault();showEvents();});
document.getElementById("nav-results").addEventListener("click",()=>{document.getElementById("events-page").hidden=true;document.getElementById("results-page").hidden=false;window.scrollTo(0,0);});

document.getElementById("dialog-close").addEventListener("click",()=>{document.getElementById("team-dialog").close();history.replaceState(null,"",location.pathname+"#"+encodeURIComponent(currentEventId||sourceData.event.id));});
document.getElementById("team-dialog").addEventListener("click",e=>{
  if(e.target===e.currentTarget){e.currentTarget.close();history.replaceState(null,"",location.pathname+"#"+encodeURIComponent(currentEventId||sourceData.event.id));}
});

document.querySelectorAll(".view-button").forEach(button=>button.addEventListener("click",()=>{
  activeView=button.dataset.view;
  renderLeaderboard();
}));
