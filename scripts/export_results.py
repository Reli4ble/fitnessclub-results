#!/usr/bin/env python3
"""Exportiert ein einzelnes Event aus der privaten Multi-Event-Excelmappe.
Interne Athleten-IDs, Nachnamen-Kürzel und Geburtsdaten werden nicht exportiert.
"""
import argparse
import json
import re
from datetime import date, datetime
from pathlib import Path
from openpyxl import load_workbook

STATION_KEYS = ["skiErg", "sledPush", "sledPull", "burpees", "row", "farmersCarry", "lunges", "wallBalls"]
STATION_COLUMNS = ["SkiErg", "Sled Push", "Sled Pull", "Burpees", "Row", "Farmers Carry", "Lunges", "Wall Balls"]
STATUS_MAP = {"Geplant": "planned", "Abgeschlossen": "completed", "Ergebnisse veröffentlicht": "results"}


def as_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value).strip())
    except (TypeError, ValueError):
        raise SystemExit(f"Ungültiges oder fehlendes Datum: {value!r}")


def completed_age(birth, event):
    years = event.year - birth.year
    if (event.month, event.day) < (birth.month, birth.day):
        years -= 1
    return years


def age_group(age):
    for upper, label in [
        (25, "16–24"), (30, "25–29"), (35, "30–34"), (40, "35–39"),
        (45, "40–44"), (50, "45–49"), (55, "50–54"), (60, "55–59"),
        (65, "60–64"), (70, "65–69"), (75, "70–74"), (80, "75–79"),
        (85, "80–84"),
    ]:
        if age < upper:
            return label
    return "85–89"


def records(ws):
    headers = [ws.cell(1, c).value for c in range(1, ws.max_column + 1)]
    for r in range(2, ws.max_row + 1):
        values = [ws.cell(r, c).value for c in range(1, len(headers) + 1)]
        if any(v is not None for v in values):
            yield {str(k).strip(): v for k, v in zip(headers, values) if k is not None}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", help="Private Excel master workbook")
    parser.add_argument("--event-id", help="Event-ID; default: selection in sheet Event")
    parser.add_argument("--output-dir", default="data")
    args = parser.parse_args()

    wb = load_workbook(args.workbook, data_only=True)
    required = {"Events", "Athleten", "Event-Ergebnisse", "Event", "Einstellungen"}
    if not required.issubset(wb.sheetnames):
        raise SystemExit("Workbook benötigt die Blätter: " + ", ".join(sorted(required)))

    event_id = str(args.event_id or wb["Event"]["B4"].value or "").strip()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", event_id):
        raise SystemExit("Event-ID fehlt oder ist ungültig.")

    event = next((r for r in records(wb["Events"]) if str(r.get("Event-ID") or "").strip() == event_id), None)
    if not event:
        raise SystemExit(f"Event {event_id!r} ist im Blatt Events nicht vorhanden.")
    name = str(event.get("Eventname") or "").strip()
    if not name:
        raise SystemExit("Eventname fehlt.")
    event_date = as_date(event.get("Eventdatum"))
    location = str(event.get("Veranstaltungsort") or "Fitnessclub").strip()
    status_label = str(event.get("Status") or "").strip()
    if status_label not in STATUS_MAP:
        raise SystemExit(f"Ungültiger Eventstatus: {status_label!r}")
    subtitle = str(event.get("Untertitel") or "HYROX-orientierter Club-Wettkampf").strip()

    # Private roster is only used for ID lookup and never copied to public JSON.
    athletes = {}
    for r in records(wb["Athleten"]):
        aid = str(r.get("Athleten-ID (privat)") or "").strip()
        if not aid:
            continue
        if aid in athletes:
            raise SystemExit(f"Doppelte Athleten-ID: {aid}")
        athletes[aid] = {
            "name": str(r.get("Vorname") or "").strip(),
            "birth": r.get("Geburtsdatum (optional, privat)"),
        }

    settings = wb["Einstellungen"]
    stations = []
    for i, key in enumerate(STATION_KEYS, start=2):
        station_name = settings.cell(i, 1).value
        if not station_name:
            raise SystemExit(f"Stationsname fehlt in Einstellungen, Zeile {i}.")
        direction = str(settings.cell(i, 3).value or "Mehr ist besser")
        stations.append({
            "key": key, "name": str(station_name),
            "unit": str(settings.cell(i, 2).value or ""),
            "direction": "asc" if "Weniger" in direction else "desc",
        })

    teams = []
    for row_no, r in enumerate(records(wb["Event-Ergebnisse"]), start=2):
        if str(r.get("Event-ID") or "").strip() != event_id:
            continue
        team_name = str(r.get("Teamname") or "").strip()
        division = str(r.get("Division") or "").strip()
        if not team_name or division not in {"Männer", "Frauen", "Mixed"}:
            raise SystemExit(f"Zeile {row_no}: Teamname oder Division fehlt/ist ungültig.")

        id1 = str(r.get("Athleten-ID Partner 1 (privat)") or "").strip()
        id2 = str(r.get("Athleten-ID Partner 2 (privat)") or "").strip()
        if not id1 or not id2 or id1 == id2 or id1 not in athletes or id2 not in athletes:
            raise SystemExit(f"Zeile {row_no}, {team_name}: Athleten-IDs fehlen, sind doppelt oder unbekannt.")
        p1, p2 = athletes[id1], athletes[id2]
        if not p1["name"] or not p2["name"]:
            raise SystemExit(f"Zeile {row_no}, {team_name}: Vorname fehlt im Athletenstamm.")

        if p1["birth"] and p2["birth"]:
            age1 = completed_age(as_date(p1["birth"]), event_date)
            age2 = completed_age(as_date(p2["birth"]), event_date)
            average = (age1 + age2) / 2
            group = age_group(average)
        else:
            age1 = age2 = average = group = None

        results = {}
        for key, column in zip(STATION_KEYS, STATION_COLUMNS):
            value = r.get(column)
            if value is None or value == "":
                raise SystemExit(f"Zeile {row_no}, {team_name}: Stationswert {column} fehlt.")
            try:
                results[key] = float(value)
            except (TypeError, ValueError):
                raise SystemExit(f"Zeile {row_no}, {team_name}: Stationswert {column} ist ungültig.")

        teams.append({
            "id": f"team-{len(teams) + 1}", "name": team_name, "division": division,
            "partner1": p1["name"], "partner2": p2["name"],
            "age1": age1, "age2": age2, "averageAge": average, "ageGroup": group,
            "results": results,
        })

    if not teams:
        raise SystemExit(f"Keine Teams für Event {event_id!r} gefunden.")
    payload = {
        "event": {
            "id": event_id, "name": name, "subtitle": subtitle,
            "date": event_date.isoformat(), "location": location,
            "status": STATUS_MAP[status_label],
            "ageGroupsAvailable": all(t["averageAge"] is not None for t in teams),
            "notice": "Ergebnisse des Fitnessclub-Wettkampfs. Die Ranglisten werden aus den Stationswerten berechnet.",
        },
        "stations": stations, "teams": teams,
    }

    # Privacy guard before writing any public files.
    serialized = json.dumps(payload, ensure_ascii=False)
    if any(aid in serialized for aid in athletes):
        raise SystemExit("Datenschutzprüfung fehlgeschlagen: interne Athleten-ID im Export.")

    root = Path(args.output_dir)
    event_dir = root / "events"
    event_dir.mkdir(parents=True, exist_ok=True)
    event_file = event_dir / f"{event_id}.json"
    event_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    index_file = root / "events.json"
    index = json.loads(index_file.read_text(encoding="utf-8")) if index_file.exists() else {"events": []}
    previous = next((e for e in index.get("events", []) if e.get("id") == event_id), {})
    entry = {
        "id": event_id, "name": name, "date": event_date.isoformat(),
        "location": location, "status": STATUS_MAP[status_label],
        "subtitle": subtitle, "dataFile": f"data/events/{event_id}.json",
    }
    if previous.get("countryCode"):
        entry["countryCode"] = previous["countryCode"]
    index["events"] = [e for e in index.get("events", []) if e.get("id") != event_id] + [entry]
    index["events"].sort(key=lambda e: e.get("date") or "", reverse=True)
    index_file.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"{len(teams)} Teams und {len(stations)} Stationen exportiert: {event_file}")
    print("Datenschutzprüfung: keine internen Athleten-IDs, Nachnamen-Kürzel oder Geburtsdaten exportiert.")


if __name__ == "__main__":
    main()
