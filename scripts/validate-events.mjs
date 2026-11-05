import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const errors=[];
const read=(file)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){errors.push(`${file}: ${e.message}`);return null;}};
const catalogue=read(path.join(root,'data/events.json'));
if(catalogue){
 if(!Array.isArray(catalogue.events)||!catalogue.events.length)errors.push('events.json: events must be a non-empty array');
 const ids=new Set();
 for(const entry of catalogue.events||[]){
  if(ids.has(entry.id))errors.push(`Duplicate event id: ${entry.id}`);ids.add(entry.id);
  if(typeof entry.dataFile!=='string'||!entry.dataFile.startsWith('data/events/')||entry.dataFile.includes('..')){errors.push(`Invalid dataFile for ${entry.id}`);continue;}
  const file=path.join(root,entry.dataFile);if(!fs.existsSync(file)){errors.push(`Missing event file: ${entry.dataFile}`);continue;}
  const data=read(file);if(!data)continue;
  if(data.event?.id!==entry.id)errors.push(`${entry.dataFile}: event.id mismatch`);
  const stations=data.stations||[],teams=data.teams||[],keys=stations.map(s=>s.key);
  if(!stations.length)errors.push(`${entry.dataFile}: no stations`);if(!teams.length)errors.push(`${entry.dataFile}: no teams/results`);
  if(new Set(keys).size!==keys.length)errors.push(`${entry.dataFile}: duplicate station keys`);
  if(new Set(teams.map(t=>t.id)).size!==teams.length)errors.push(`${entry.dataFile}: duplicate team ids`);
  for(const team of teams){for(const station of stations){const value=team.results?.[station.key];if(typeof value!=='number'||!Number.isFinite(value)||value<0)errors.push(`${entry.dataFile}: team ${team.id}, missing/invalid result ${station.key}`);}for(const key of Object.keys(team.results||{}))if(!keys.includes(key))errors.push(`${entry.dataFile}: team ${team.id}, unknown result key ${key}`);}
 }
}
if(errors.length){console.error('Event data validation failed:');errors.forEach(e=>console.error(` - ${e}`));process.exit(1);}
console.log('Event data validation passed.');
