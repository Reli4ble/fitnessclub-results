import fs from "node:fs";
import path from "node:path";
const root=path.resolve(process.argv[2]||".");
const catalogue=JSON.parse(fs.readFileSync(path.join(root,"data/events.json"),"utf8"));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const base=new URL(process.argv[3]||"https://reli4ble.github.io/fitnessclub-results/");
let count=0;
for(const event of catalogue.events||[]){
 if(!event.dataFile)continue;
 const data=JSON.parse(fs.readFileSync(path.join(root,event.dataFile),"utf8"));
 for(const team of data.teams||[]){
  const rel="share/"+event.id+"/"+team.id+"/",url=new URL(rel,base).href;
  const title=team.name+" – "+event.name+" | Fitnessclub Results";
  const desc="Ergebnisprofil von "+team.name+" ("+team.partner1+" & "+team.partner2+") bei "+event.name+". Division: "+team.division+".";
  const target="../../../#"+encodeURIComponent(event.id)+"/"+encodeURIComponent(team.id);
  const image=new URL("assets/certificate-banner.png",base).href;
  const out=path.join(root,rel);fs.mkdirSync(out,{recursive:true});
  const page='<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'"><link rel="canonical" href="'+url+'"><meta property="og:type" content="website"><meta property="og:site_name" content="Fitnessclub Competition Results"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+url+'"><meta property="og:image" content="'+image+'"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'"><meta name="twitter:description" content="'+esc(desc)+'"><meta name="twitter:image" content="'+image+'"><meta http-equiv="refresh" content="0;url='+target+'"></head><body><p>Teamprofil wird geöffnet. <a href="'+target+'">Weiter zum Teamprofil</a>.</p></body></html>';
  fs.writeFileSync(path.join(out,"index.html"),page);count++;
 }
}
console.log("Generated "+count+" team share pages in "+root);
