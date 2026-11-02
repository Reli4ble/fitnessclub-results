#!/usr/bin/env python3
"""Exportiert Teams & Ergebnisse aus der Club-Wettkampf-Excel nach data/results.json."""
import argparse
import json
from pathlib import Path
from openpyxl import load_workbook

STATION_KEYS = ["skiErg","sledPush","sledPull","burpees","row","farmersCarry","lunges","wallBalls"]

def age_group(age):
    bands=[(24,"16–24"),(29,"25–29"),(34,"30–34"),(39,"35–39"),(44,"40–44"),(49,"45–49"),(54,"50–54"),(59,"55–59"),(64,"60–64"),(69,"65–69"),(74,"70–74"),(79,"75–79"),(84,"80–84"),(89,"85–89")]
    for maximum,label in bands:
        if age <= maximum: return label
    return "85–89"

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("workbook",help="Pfad zur Excel-Arbeitsmappe")
    parser.add_argument("--output",default="data/results.json",help="Zielpfad der JSON-Datei")
    parser.add_argument("--event-name",default="Fitnessclub Wettkampf")
    parser.add_argument("--date",default="Ergebnisse")
    parser.add_argument("--location",default="Fitnessclub")
    args=parser.parse_args()

    wb=load_workbook(args.workbook,data_only=True)
    ws=wb["Teams & Ergebnisse"]
    settings=wb["Einstellungen"]
    stations=[]
    for i,key in enumerate(STATION_KEYS,start=2):
        name=settings.cell(i,1).value
        unit=settings.cell(i,2).value or ""
        direction=settings.cell(i,3).value or "Mehr ist besser"
        stations.append({"key":key,"name":str(name),"unit":str(unit),
                         "direction":"asc" if "Weniger" in str(direction) else "desc"})

    teams=[]
    for row in range(2,ws.max_row+1):
        name=ws.cell(row,1).value
        division=ws.cell(row,2).value
        if not name or not division:
            continue
        age1,age2=ws.cell(row,3).value,ws.cell(row,4).value
        if age1 is None or age2 is None:
            raise ValueError(f"Zeile {row}: Für Team {name!r} fehlen Partneralter.")
        age1,age2=float(age1),float(age2)
        avg=(age1+age2)/2
        results={}
        for col,key in enumerate(STATION_KEYS,start=7):
            value=ws.cell(row,col).value
            if value is None:
                raise ValueError(f"Zeile {row}: Für Team {name!r} fehlt Stationswert {key}.")
            results[key]=float(value)
        teams.append({
            "id":f"team-{len(teams)+1}",
            "name":str(name),
            "division":str(division),
            "partner1":str(ws.cell(row,15).value or ""),
            "partner2":str(ws.cell(row,16).value or ""),
            "age1":age1,"age2":age2,"averageAge":avg,
            "ageGroup":age_group(avg),"results":results
        })

    payload={"event":{"name":args.event_name,"subtitle":"HYROX-orientierter Club-Wettkampf",
        "date":args.date,"location":args.location,"status":"ERGEBNISSE",
        "notice":"Ergebnisse des Fitnessclub-Wettkampfs. Die Ranglisten werden aus den Stationswerten berechnet."},
        "stations":stations,"teams":teams}
    output=Path(args.output)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"{len(teams)} Teams und {len(stations)} Stationen exportiert: {output}")

if __name__=="__main__": main()
