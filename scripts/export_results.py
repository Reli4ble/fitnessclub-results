#!/usr/bin/env python3
"""Exportiert ein Event aus der Fitnessclub-Auswertungsmappe in eine Eventdatei.
Bestehende Events in data/events.json bleiben erhalten; dieselbe Event-ID wird aktualisiert.
"""
import argparse, json, re
from pathlib import Path
from datetime import date, datetime
from openpyxl import load_workbook

STATION_KEYS=["skiErg","sledPush","sledPull","burpees","row","farmersCarry","lunges","wallBalls"]
STATUS_MAP={"Geplant":"planned","Abgeschlossen":"completed","Ergebnisse veröffentlicht":"results"}

def age_group(age):
    bands=[(24,"16–24"),(29,"25–29"),(34,"30–34"),(39,"35–39"),(44,"40–44"),(49,"45–49"),(54,"50–54"),(59,"55–59"),(64,"60–64"),(69,"65–69"),(74,"70–74"),(79,"75–79"),(84,"80–84"),(89,"85–89")]
    for maximum,label in bands:
        if age<=maximum:return label
    return "85–89"

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("workbook",help="Pfad zur Excel-Arbeitsmappe")
    parser.add_argument("--output-dir",default="data",help="Datenverzeichnis der Website")
    args=parser.parse_args()
    wb=load_workbook(args.workbook,data_only=True)
    if "Event" not in wb.sheetnames: raise SystemExit("Tabellenblatt 'Event' fehlt.")
    ev=wb["Event"]
    values={str(ev.cell(r,1).value):ev.cell(r,2).value for r in range(4,10)}
    event_id=str(values.get("Event-ID") or "").strip()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",event_id): raise SystemExit("Event-ID muss aus Kleinbuchstaben, Zahlen und einzelnen Bindestrichen bestehen.")
    name=str(values.get("Eventname") or "").strip()
    if not name: raise SystemExit("Eventname fehlt.")
    event_date=values.get("Eventdatum")
    if isinstance(event_date,(datetime,date)): date_str=event_date.strftime("%Y-%m-%d")
    elif event_date: date_str=str(event_date).strip()
    else: raise SystemExit("Eventdatum fehlt.")
    location=str(values.get("Veranstaltungsort") or "Fitnessclub").strip()
    status_label=str(values.get("Status") or "").strip()
    if status_label not in STATUS_MAP: raise SystemExit("Ungültiger Status im Blatt Event.")
    subtitle=str(values.get("Untertitel") or "HYROX-orientierter Club-Wettkampf").strip()
    ws=wb["Teams & Ergebnisse"]; settings=wb["Einstellungen"]
    stations=[]
    for i,key in enumerate(STATION_KEYS,start=2):
        st_name=settings.cell(i,1).value; unit=settings.cell(i,2).value or ""; direction=settings.cell(i,3).value or "Mehr ist besser"
        stations.append({"key":key,"name":str(st_name),"unit":str(unit),"direction":"asc" if "Weniger" in str(direction) else "desc"})
    teams=[]
    for row in range(2,ws.max_row+1):
        name_cell=ws.cell(row,1).value; division=ws.cell(row,2).value
        if not name_cell or not division: continue
        age1,age2=ws.cell(row,3).value,ws.cell(row,4).value
        if age1 is None or age2 is None:
            # Altersklassen sind optional. Wenn nicht beide Partneralter vorliegen,
            # werden beide Alterswerte und die abgeleiteten Felder als null exportiert.
            age1=age2=avg=age_group_label=None
        else:
            age1,age2=float(age1),float(age2)
            avg=(age1+age2)/2
            age_group_label=age_group(avg)
        results={}
        for col,key in enumerate(STATION_KEYS,start=7):
            value=ws.cell(row,col).value
            if value is None: raise SystemExit(f"Zeile {row}: Für Team {name_cell!r} fehlt Stationswert {key}.")
            results[key]=float(value)
        teams.append({"id":f"team-{len(teams)+1}","name":str(name_cell),"division":str(division),"partner1":str(ws.cell(row,15).value or ""),"partner2":str(ws.cell(row,16).value or ""),"age1":age1,"age2":age2,"averageAge":avg,"ageGroup":age_group_label,"results":results})
    if not teams: raise SystemExit("Keine Teams zum Export gefunden.")
    age_groups_available=all(t["averageAge"] is not None for t in teams)
    payload={"event":{"id":event_id,"name":name,"subtitle":subtitle,"date":date_str,"location":location,"status":status_label,"ageGroupsAvailable":age_groups_available,"notice":"Ergebnisse des Fitnessclub-Wettkampfs. Die Ranglisten werden aus den Stationswerten berechnet."},"stations":stations,"teams":teams}
    root=Path(args.output_dir); event_dir=root/"events"; event_dir.mkdir(parents=True,exist_ok=True)
    event_file=event_dir/f"{event_id}.json"; event_file.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8")
    index_file=root/"events.json"
    index=json.loads(index_file.read_text(encoding="utf-8")) if index_file.exists() else {"events":[]}
    entry={"id":event_id,"name":name,"date":date_str,"location":location,"status":STATUS_MAP[status_label],"subtitle":subtitle,"dataFile":f"data/events/{event_id}.json"}
    index["events"]=[e for e in index.get("events",[]) if e.get("id")!=event_id]+[entry]
    index["events"].sort(key=lambda e:e.get("date") or "",reverse=True)
    index_file.write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"{len(teams)} Teams und {len(stations)} Stationen exportiert: {event_file}")
    print(f"Eventübersicht aktualisiert: {index_file}")
if __name__=="__main__":main()
