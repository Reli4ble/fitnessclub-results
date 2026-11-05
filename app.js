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
function teamProfileUrl(teamId) {
  const eventId=currentEventId||sourceData.event.id;
  const base=new URL("./",location.href); return new URL(`share/${encodeURIComponent(eventId)}/${encodeURIComponent(teamId)}/`,base).href;
}
async function shareTeamProfile(teamId) {
  const url=teamProfileUrl(teamId);
  const raw=sourceData.teams.find(t=>t.id===teamId);
  const title=raw?`${raw.name} – ${sourceData.event.name}`:"Teamprofil";
  const status=document.getElementById("dialog-share-status");
  const button=document.getElementById("dialog-share");
  try {
    if(navigator.share) {
      await navigator.share({title,text:`Teamprofil: ${title}`,url});
      status.textContent="Teilen-Menü geöffnet.";
    } else if(navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      status.textContent="Team-Link wurde kopiert.";
      button.textContent="LINK KOPIERT ✓";
    } else {
      const field=document.createElement("textarea");
      field.value=url;field.setAttribute("readonly","");field.style.position="fixed";field.style.opacity="0";
      document.body.appendChild(field);field.select();
      const copied=document.execCommand("copy");field.remove();
      if(!copied) throw new Error("Clipboard nicht verfügbar");
      status.textContent="Team-Link wurde kopiert.";
      button.textContent="LINK KOPIERT ✓";
    }
  } catch(error) {
    if(error && error.name==="AbortError") return;
    status.textContent="Link konnte nicht automatisch geteilt werden. Du kannst die URL aus der Adresszeile kopieren.";
  }
}
function createTeamCertificate(teamId) {
  const raw=sourceData.teams.find(t=>t.id===teamId);
  if(!raw)return;
  const divisionPool=sourceData.teams.filter(t=>t.division===raw.division);
  const ranked=rankTeams(divisionPool,sourceData.stations);
  const team=ranked.find(t=>t.id===teamId);
  if(!team)return;
  const popup=window.open("","_blank");
  const status=document.getElementById("dialog-share-status");
  if(!popup) {
    status.textContent="Der Zertifikat-Tab wurde vom Browser blockiert. Bitte Pop-ups für diese Seite erlauben.";
    return;
  }
  const event=sourceData.event;
  const eventDate=formatEventDate(event.date);
  const rank=team.overallRank;
  const certificateTitle=rank===1?"1. Platz":rank===2?"2. Platz":rank===3?"3. Platz":"Platz "+rank;
  const htmlContent=[
    '<!doctype html>',
    '<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Zertifikat – '+escapeHtml(team.name)+'</title>',
    '<style>',
    '@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#e8ebee;color:#171b20;font-family:Arial,Helvetica,sans-serif}',
    '.toolbar{max-width:1120px;margin:18px auto;display:flex;justify-content:flex-end;gap:10px}.toolbar button{border:0;background:#171b20;color:#fff;padding:12px 18px;font-weight:700;cursor:pointer}',
    '.sheet{width:min(1120px,calc(100% - 32px));min-height:690px;margin:0 auto 28px;background:#fff;padding:12px;box-shadow:0 12px 45px rgba(0,0,0,.12);border:3px solid #111}',
    '.certificate-banner{height:140px;width:100%;padding:0;background:#111;border-bottom:0;position:relative;overflow:hidden}.certificate-banner-image{display:block;width:100%;height:100%;object-fit:cover;object-position:center 44%}',
    '.frame{height:100%;min-height:510px;border:0;outline:1px solid #ffe500;outline-offset:-8px;padding:34px 62px 45px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative;background:linear-gradient(120deg,transparent 0 6%,rgba(0,0,0,.035) 6% 8%,transparent 8% 11%,rgba(0,0,0,.035) 11% 13%,transparent 13% 87%,rgba(0,0,0,.035) 87% 89%,transparent 89% 92%,rgba(0,0,0,.035) 92% 94%,transparent 94%)}',
    '.kicker{font-size:12px;font-weight:900;letter-spacing:6px;text-transform:uppercase;color:#171b20;margin-top:10px}h1{font-size:48px;line-height:1.05;font-style:italic;font-weight:900;letter-spacing:1px;text-transform:uppercase;margin:16px 0 10px;white-space:normal;max-width:100%;overflow-wrap:anywhere}',
    '.intro{font-size:17px;color:#4c5661;margin:0}.team{font-size:42px;font-weight:800;margin:25px 0 8px}.partners{font-size:18px;color:#4c5661}',
    '.award{margin:28px 0 24px;padding:12px 42px;background:#ffe500;clip-path:polygon(8% 0,100% 0,92% 100%,0 100%);font-size:29px;font-style:italic;font-weight:900;letter-spacing:1px;text-transform:uppercase;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.detail{font-size:14px;line-height:1.8;color:#424b55}.detail strong{color:#171b20}.footer{width:100%;display:flex;justify-content:space-between;gap:35px;margin-top:54px;text-align:left}',
    '.signature{width:42%;border-top:1px solid #8a929b;padding-top:9px;font-size:11px;color:#68727d}.signature:last-child{text-align:right}',
    '.event{font-size:10px;letter-spacing:3px;font-weight:900;color:#171b20;text-transform:uppercase;align-self:flex-start;margin:0 0 8px}',
    '@media(max-width:700px){.toolbar{margin:12px 8px;justify-content:center}.toolbar button{width:100%;max-width:440px;padding:14px 10px;font-size:13px}.sheet{width:calc(100% - 16px);min-height:0;padding:8px;margin:0 auto 16px}.certificate-banner{height:clamp(76px,20vw,118px)}.frame{height:auto;min-height:0;padding:clamp(24px,7vw,42px) clamp(12px,4vw,22px) 48px}.kicker{font-size:9px;letter-spacing:3px;margin-top:0}h1{font-size:clamp(19px,5.7vw,30px);letter-spacing:.3px;line-height:1.08;margin:13px 0 10px}.intro{font-size:clamp(13px,3.8vw,16px)}.team{font-size:clamp(25px,7vw,34px);margin:20px 0 6px;overflow-wrap:anywhere}.partners{font-size:clamp(14px,4vw,17px)}.award{font-size:clamp(19px,5.4vw,25px);margin:22px 0 18px;padding:10px 30px}.detail{font-size:clamp(11px,3.3vw,13px);line-height:1.65}.footer{margin-top:30px;gap:18px}.signature{font-size:9px;padding-top:7px}.event{font-size:8px;letter-spacing:2px}}',
    '@media print{body{background:#fff}.toolbar{display:none}.sheet{width:100%;min-height:0;height:190mm;margin:0;padding:0;box-shadow:none}.certificate-banner{height:35mm}.frame{height:145mm;min-height:0;padding:24px 55px}.award{background:#ffe500!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.footer{margin-top:40px}}',
    '</style></head><body>',
    '<div class="toolbar"><button onclick="window.print()">DRUCKEN / ALS PDF SPEICHERN</button></div>',
    '<main class="sheet"><header class="certificate-banner"><img class="certificate-banner-image" src="'+new URL("assets/certificate-banner.png",window.location.href).href+'" alt="HYROX Competition Results"></header><section class="frame"><div class="event">Fitnessclub · Competition Results</div>',
    '<div class="kicker">Ergebniszertifikat</div><h1>Certificate of Achievement</h1><p class="intro">Hiermit wird ausgezeichnet:</p>',
    '<div class="team">'+escapeHtml(team.name)+'</div><div class="partners">'+escapeHtml(team.partner1)+' &amp; '+escapeHtml(team.partner2)+'</div>',
    '<div class="award">'+escapeHtml(certificateTitle)+'</div>',
    '<div class="detail"><strong>'+escapeHtml(team.division)+'</strong> · Divisionsergebnis<br>Erreicht beim <strong>'+escapeHtml(event.name)+'</strong><br>',
    escapeHtml(eventDate)+' · '+escapeHtml(event.location||"Fitnessclub")+'<br>Durchschnittlicher Stationsrang: <strong>'+fmt(team.averageRank,2)+'</strong> · Rang '+rank+' von '+divisionPool.length+' Teams</div>',
    '<div class="footer"><div class="signature">Fitnessclub / Veranstalter</div><div class="signature">Eventorganisation</div></div>',
    '</section></main></body></html>'
  ].join("");
  popup.document.open();
  popup.document.write(htmlContent);
  popup.document.close();
  status.textContent="Zertifikat wurde in einem neuen Tab erstellt.";
}
function openTeamDetails(teamId, options={}) {
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
  if(options.updateUrl!==false) history.pushState({eventId:currentEventId,teamId},"",teamProfileUrl(teamId));
  const shareButton=document.getElementById("dialog-share");
  shareButton.textContent="LINK TEILEN ↗";
  document.getElementById("dialog-share-status").textContent="Dieses Profil kann direkt über seine URL aufgerufen werden.";
  shareButton.onclick=()=>shareTeamProfile(teamId);
  document.getElementById("dialog-certificate").onclick=()=>createTeamCertificate(teamId);
}
function renderStations() {
  const stationKey=document.getElementById("station-filter").value || sourceData.stations[0]?.key;
  const station=sourceData.stations.find(s=>s.key===stationKey) || sourceData.stations[0];
  if(!station)return;
  const selectedAge=document.getElementById("age-filter").value;
  // Ranks are calculated within the selected comparison pool. In Overall,
  // absolute results across divisions are shown and must be interpreted cautiously.
  const comparisonPool=activeDivision==="Overall"
    ? sourceData.teams
    : sourceData.teams.filter(t=>t.division===activeDivision);
  const eligible=comparisonPool.filter(t=>!selectedAge || t.ageGroup===selectedAge);
  const sorted=[...eligible].sort((a,b)=>{
    const delta=Number(a.results[station.key])-Number(b.results[station.key]);
    return (station.direction==="asc"?delta:-delta) || a.name.localeCompare(b.name,"de");
  });
  let previous=null,rank=0;
  const rows=sorted.map((team,index)=>{
    const value=Number(team.results[station.key]);
    if(previous===null || value!==previous) rank=index+1;
    previous=value;
    return `<tr class="station-team-row" data-team-id="${escapeHtml(team.id)}" tabindex="0" role="button" aria-label="Teamprofil ${escapeHtml(team.name)} öffnen">
      <td class="rank">${rank}.</td>
      <td class="team-name">${escapeHtml(team.name)}<span class="row-hint">Details ansehen ↗</span></td>
      <td class="partner-names">${escapeHtml(team.partner1)} &amp; ${escapeHtml(team.partner2)}</td>
      <td><span class="station-division">${escapeHtml(team.division)}</span></td>
      <td class="score station-result">${fmt(value,0)} <small>${escapeHtml(station.unit)}</small></td>
    </tr>`;
  }).join("");
  document.getElementById("station-leaderboard").innerHTML=rows || '<tr><td colspan="5">Keine Teams für diese Auswahl vorhanden.</td></tr>';
  document.getElementById("station-result-heading").textContent=`ERGEBNIS · ${station.unit}`;
  document.querySelector(".stations-section .section-heading h2").textContent=`Stationsrangliste · ${station.name}`;
  document.getElementById("station-description").textContent=
    `${activeDivision==="Overall"?"Alle Divisionen gemeinsam – absolute Werte, nur eingeschränkt vergleichbar.":`Division: ${activeDivision}.`} ${station.direction==="asc"?"Niedriger ist besser.":"Höher ist besser."} ${selectedAge?`Altersklasse: ${selectedAge}.`:""} ${sorted.length} Teams in der Wertung.`;
  document.querySelectorAll("#station-leaderboard [data-team-id]").forEach(row=>{
    row.addEventListener("click",()=>openTeamDetails(row.dataset.teamId));
    row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openTeamDetails(row.dataset.teamId);}});
  });
}
function renderEventStatistics() {
  const teams=sourceData.teams;
  const divisions=["Männer","Frauen","Mixed"];
  const selectedAge=document.getElementById("age-filter").value;
  const divisionTeams=Object.fromEntries(divisions.map(d=>[d,teams.filter(t=>t.division===d && (!selectedAge || t.ageGroup===selectedAge))]));
  const activeTeams=activeDivision==="Overall"
    ? teams.filter(t=>!selectedAge || t.ageGroup===selectedAge)
    : divisionTeams[activeDivision]||[];
  const divisionCount=activeDivision==="Overall" ? divisions.filter(d=>divisionTeams[d].length>0).length : (activeTeams.length?1:0);
  document.getElementById("event-stat-kpis").innerHTML=[
    ["TEAMS",activeTeams.length,activeDivision==="Overall"?"im Event":"in "+activeDivision],
    ["ATHLETEN",activeTeams.length*2,"2 Personen je Team"],
    ["STATIONEN",sourceData.stations.length,"Einzelwertungen"],
    ["DIVISIONEN",divisionCount,"mit Teams in der Auswahl"]
  ].map(([label,value,foot])=>`<article class="event-stat-kpi"><span>${label}</span><strong>${value}</strong><small>${escapeHtml(foot)}</small></article>`).join("");

  const total=divisions.reduce((sum,d)=>sum+divisionTeams[d].length,0);
  document.getElementById("division-statistics").innerHTML=divisions.map(d=>{
    const count=divisionTeams[d].length;
    const percent=total?count/total*100:0;
    return `<div class="division-stat-row"><div class="division-stat-meta"><strong>${d}</strong><span>${count} Teams · ${fmt(percent,1)}%</span></div><div class="division-stat-track"><span style="width:${percent}%"></span></div></div>`;
  }).join("");

  const groups=activeDivision==="Overall"?divisions:[activeDivision];
  const rows=[];
  for(const division of groups){
    const pool=divisionTeams[division];
    for(const station of sourceData.stations){
      if(!pool.length)continue;
      const sorted=[...pool].sort((a,b)=>{
        const delta=Number(a.results[station.key])-Number(b.results[station.key]);
        return (station.direction==="asc"?delta:-delta)||a.name.localeCompare(b.name,"de");
      });
      const values=pool.map(t=>Number(t.results[station.key])).filter(Number.isFinite);
      if(!values.length)continue;
      const best=sorted[0];
      const average=values.reduce((sum,value)=>sum+value,0)/values.length;
      const low=Math.min(...values),high=Math.max(...values);
      rows.push(`<tr><td><span class="station-division">${division}</span></td><td class="stat-station-name">${escapeHtml(station.name)}</td><td class="score">${fmt(best.results[station.key],0)} <small>${escapeHtml(station.unit)}</small></td><td>${escapeHtml(best.name)}</td><td>${fmt(average,1)} <small>${escapeHtml(station.unit)}</small></td><td>${fmt(low,0)}–${fmt(high,0)} <small>${escapeHtml(station.unit)}</small></td></tr>`);
    }
  }
  document.getElementById("statistics-description").textContent=activeDivision==="Overall"
    ?"Bestwert, Durchschnitt und Spannweite werden getrennt für Männer, Frauen und Mixed ausgewiesen."
    :`Bestwert, Durchschnitt und Spannweite für die Division ${activeDivision}.`;
  document.getElementById("statistics-table-title").textContent=activeDivision==="Overall"?"Stationswerte nach Division":`Stationswerte · ${activeDivision}`;
  document.getElementById("event-statistics-table").innerHTML=rows.join("")||'<tr><td colspan="6">Keine Daten für diese Auswahl vorhanden.</td></tr>';
}

function renderDigitalAwards() {
 const host=document.getElementById("digital-awards"),divisions=["Männer","Frauen","Mixed"],cards=[];
 for(const division of divisions){
  const pool=sourceData.teams.filter(t=>t.division===division);if(!pool.length)continue;
  const ranked=rankTeams(pool,sourceData.stations),champion=ranked.find(t=>t.overallRank===1);
  if(champion)cards.push({team:champion,title:"Division Champion",detail:division+" · Gesamtsieg",icon:"🏆"});
  for(const station of sourceData.stations){
   const best=pool.reduce((current,t)=>!current|| (station.direction==="asc"?t.results[station.key]<current.results[station.key]:t.results[station.key]>current.results[station.key])?t:current,null);
   if(best)cards.push({team:best,title:"Station Champion",detail:division+" · "+station.name,icon:"⚡"});
  }
 }
 host.innerHTML=cards.map(a=>`<button class="digital-award-card" data-team-id="${escapeHtml(a.team.id)}"><span class="award-icon">${a.icon}</span><span class="award-type">${escapeHtml(a.title)}</span><strong>${escapeHtml(a.team.name)}</strong><small>${escapeHtml(a.detail)}</small></button>`).join("")||'<p class="comparison-empty">Noch keine Auszeichnungen verfügbar.</p>';
 host.querySelectorAll("[data-team-id]").forEach(b=>b.addEventListener("click",()=>openTeamDetails(b.dataset.teamId)));
}

function renderHeadToHead() {
  const selectA=document.getElementById("compare-team-a"),selectB=document.getElementById("compare-team-b"),output=document.getElementById("head-to-head-results");
  const division=activeDivision==="Overall"?"Männer":activeDivision,teams=sourceData.teams.filter(t=>t.division===division).sort((a,b)=>a.name.localeCompare(b.name,"de"));
  const oldA=selectA.value,oldB=selectB.value,options=teams.map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join("");
  selectA.innerHTML=options;selectB.innerHTML=options;
  if(teams.some(t=>t.id===oldA))selectA.value=oldA;if(teams.some(t=>t.id===oldB))selectB.value=oldB;
  if(!selectA.value&&teams[0])selectA.value=teams[0].id;if(!selectB.value&&teams[1])selectB.value=teams[1].id;
  document.getElementById("comparison-context").textContent=`Division: ${division} · ${teams.length} Teams`;
  if(teams.length<2){output.innerHTML='<p class="comparison-empty">Für einen direkten Vergleich werden mindestens zwei Teams in derselben Division benötigt.</p>';return;}
  const a=teams.find(t=>t.id===selectA.value),b=teams.find(t=>t.id===selectB.value);
  if(!a||!b)return;if(a.id===b.id){output.innerHTML='<p class="comparison-empty">Bitte zwei unterschiedliche Teams auswählen.</p>';return;}
  const ranked=rankTeams(teams,sourceData.stations),ra=ranked.find(t=>t.id===a.id),rb=ranked.find(t=>t.id===b.id);let winsA=0,winsB=0,ties=0;
  const rows=sourceData.stations.map(s=>{const av=Number(a.results[s.key]),bv=Number(b.results[s.key]),delta=av-bv,w=delta===0?"tie":((s.direction==="asc"?delta<0:delta>0)?"a":"b");if(w==="a")winsA++;else if(w==="b")winsB++;else ties++;const label=w==="tie"?"Gleichstand":w==="a"?a.name:b.name;return `<tr><td>${escapeHtml(s.name)}</td><td>${fmt(av,0)} <small>${escapeHtml(s.unit)} · Rang ${ra.stationRanks[s.key]}</small></td><td>${fmt(bv,0)} <small>${escapeHtml(s.unit)} · Rang ${rb.stationRanks[s.key]}</small></td><td><strong>${escapeHtml(label)}</strong><small>${delta>0?"+":""}${fmt(delta,0)} ${escapeHtml(s.unit)} (A − B)</small></td></tr>`;}).join("");
  const winner=Math.abs(ra.averageRank-rb.averageRank)<1e-9?"Unentschieden":ra.averageRank<rb.averageRank?a.name:b.name;
  output.innerHTML=`<div class="comparison-scoreboard"><article><span>TEAM A</span><h3>${escapeHtml(a.name)}</h3><strong>${fmt(ra.averageRank,2)}</strong><small>Ø Stationsrang · Platz ${ra.overallRank}</small></article><div class="comparison-vs">VS</div><article><span>TEAM B</span><h3>${escapeHtml(b.name)}</h3><strong>${fmt(rb.averageRank,2)}</strong><small>Ø Stationsrang · Platz ${rb.overallRank}</small></article></div><div class="comparison-summary"><strong>${escapeHtml(winner)}</strong><span>Stationsduelle: A ${winsA} · Gleichstand ${ties} · B ${winsB}</span></div><div class="table-wrap"><table class="comparison-table"><thead><tr><th>STATION</th><th>${escapeHtml(a.name)}</th><th>${escapeHtml(b.name)}</th><th>VORTEIL</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function init(data) {
  sourceData=data;
  document.title=`${data.event.name} – Ergebnisse`;
  document.getElementById("event-title").textContent=data.event.name;
  document.getElementById("event-subtitle").textContent=data.event.subtitle||"";
  document.getElementById("event-date").textContent=data.event.date||"";
  document.getElementById("event-location").textContent=data.event.location||"";
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
  document.getElementById("station-filter").innerHTML=data.stations.map(st=>`<option value="${escapeHtml(st.key)}">${escapeHtml(st.name)}</option>`).join("");
  renderLeaderboard();renderStations();renderEventStatistics();renderHeadToHead();renderDigitalAwards();
}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  activeDivision=b.dataset.division;
  renderLeaderboard();renderStations();renderEventStatistics();renderHeadToHead();
}));
document.getElementById("age-filter").addEventListener("change",()=>{
  renderLeaderboard();
  renderStations();
  renderEventStatistics();
  renderHeadToHead();
});
document.getElementById("station-filter").addEventListener("change",renderStations);
document.getElementById("compare-team-a").addEventListener("change",renderHeadToHead);
document.getElementById("compare-team-b").addEventListener("change",renderHeadToHead);
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
function showEvents(){document.getElementById("events-page").hidden=false;document.getElementById("results-page").hidden=true;document.getElementById("nav-results").hidden=true;document.getElementById("nav-events").classList.add("active");document.getElementById("nav-results").classList.remove("active");history.replaceState(null,"",location.pathname+"#events");}
function openEvent(id,teamId=null,options={}) {
  const event=eventIndex.find(e=>e.id===id); if(!event)return;
  if(!event.dataFile){alert("Für dieses Event sind noch keine Ergebnisse hinterlegt.");return;}
  fetch(event.dataFile).then(r=>{if(!r.ok)throw new Error("Eventdaten konnten nicht geladen werden");return r.json();}).then(data=>{
    currentEventId=id; init(data); document.getElementById("events-page").hidden=true; document.getElementById("results-page").hidden=false; document.getElementById("nav-results").hidden=false; document.getElementById("nav-events").classList.remove("active"); document.getElementById("nav-results").classList.add("active");
    if(options.preserveHash!==true) history.replaceState({eventId:id},"",location.pathname+"#"+encodeURIComponent(id));
    window.scrollTo(0,0);
    if(teamId) {
      if(data.teams.some(t=>t.id===teamId)) openTeamDetails(teamId,{updateUrl:false});
      else history.replaceState({eventId:id},"",location.pathname+"#"+encodeURIComponent(id));
    }
  }).catch(err=>{document.getElementById("events-empty").textContent=err.message;document.getElementById("events-empty").hidden=false;});
}
function readHashRoute() {
  const raw=location.hash.slice(1);
  if(!raw||raw==="events") return {page:"events"};
  const parts=raw.split("/");
  try { return {page:"event",eventId:decodeURIComponent(parts[0]),teamId:parts[1]?decodeURIComponent(parts[1]):null}; }
  catch { return {page:"events"}; }
}
function restoreRoute() {
  const route=readHashRoute();
  if(route.page==="events"){showEvents();return;}
  if(eventIndex.some(e=>e.id===route.eventId)) openEvent(route.eventId,route.teamId,{preserveHash:true});
  else showEvents();
}
fetch("data/events.json").then(r=>{if(!r.ok)throw new Error("events.json konnte nicht geladen werden");return r.json();}).then(data=>{eventIndex=data.events||[];renderEventIndex();restoreRoute();}).catch(err=>{document.getElementById("events-empty").textContent="Eventübersicht konnte nicht geladen werden: "+err.message;document.getElementById("events-empty").hidden=false;});
window.addEventListener("popstate",restoreRoute);
document.getElementById("nav-events").addEventListener("click",showEvents);
document.getElementById("brand-home").addEventListener("click",e=>{e.preventDefault();showEvents();});
document.getElementById("nav-results").addEventListener("click",()=>{document.getElementById("events-page").hidden=true;document.getElementById("results-page").hidden=false;document.getElementById("nav-events").classList.remove("active");document.getElementById("nav-results").classList.add("active");window.scrollTo(0,0);});

function closeTeamProfile() {
  const dialog=document.getElementById("team-dialog");
  if(dialog.open) dialog.close();
  history.replaceState({eventId:currentEventId},"",location.pathname+"#"+encodeURIComponent(currentEventId||sourceData.event.id));
}
document.getElementById("dialog-close").addEventListener("click",closeTeamProfile);
document.getElementById("team-dialog").addEventListener("click",e=>{
  if(e.target===e.currentTarget) closeTeamProfile();
});
document.getElementById("team-dialog").addEventListener("cancel",e=>{
  e.preventDefault();closeTeamProfile();
});

document.querySelectorAll(".view-button").forEach(button=>button.addEventListener("click",()=>{
  activeView=button.dataset.view;
  renderLeaderboard();
}));
