# Fitnessclub Competition Results

**Website-Version: v1.3.0**  
**Release-Datum: 03.11.2026**

Statische Ergebnis-Website für GitHub Pages. Keine Datenbank, kein Backend und kein Login. Die Website wird über GitHub Actions aus `main` (Produktion) und `develop` (Preview) gemeinsam veröffentlicht.

## Version 1.3.0

- Erweiterte Team-Detailansichten mit Stations-Radar (innerhalb der Division normalisiert).
- Kumulierte durchschnittliche Stationsrangpunkte über die acht Stationen.
- Stationswerte, Einheiten, Stationsplatzierungen sowie Divisions- und Overallrang in der Teamansicht.
- Mobile Darstellung der Team-Visualisierungen.

## Inhalt

- `index.html`, `styles.css`, `app.js`: Website
- `data/events.json`: öffentlicher Eventkatalog
- `data/events/<event-id>.json`: Ergebnisdaten je Event
- `scripts/export_results.py`: Excel-Export für Event-Stammdaten und Ergebnisse

## Deployment und Branch-Modell

- `main`: produktive Website unter `https://reli4ble.github.io/fitnessclub-results/`
- `develop`: Vorschau unter `https://reli4ble.github.io/fitnessclub-results/preview/`
- Feature-Branches werden per Pull Request nach `develop` gemergt.
- Nach erfolgreichem Preview-Test wird `develop` per Pull Request nach `main` übernommen.
- GitHub Actions erstellt ein gemeinsames Pages-Artefakt. Der Build prüft, dass sowohl `_site/index.html` als auch `_site/preview/index.html` vorhanden sind.
- Der Workflow verwendet Ubuntu 24.04 sowie Node.js-24-kompatible Actions.

## Lokal ansehen

Im Projektverzeichnis:

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` öffnen. `index.html` nicht per Doppelklick (`file://`) öffnen, da der Browser den JSON-Abruf blockieren kann.

## Ergebnisse aus Excel übernehmen

Voraussetzung: Python 3 und `openpyxl`.

```bash
python3 -m pip install openpyxl
python3 scripts/export_results.py "/pfad/zur/Fitnessclub_Auswertung.xlsx"
```

Das Skript liest die Event-Stammdaten aus dem Tabellenblatt `Event` sowie Teams, Partnernamen, Alter und Stationswerte aus `Teams & Ergebnisse`. Die Event-ID bestimmt den Dateinamen unter `data/events/`. Ein vorhandenes Event wird aktualisiert; andere Eventdateien bleiben erhalten.

Nach dem Export die Änderungen prüfen und committen:

```bash
git add data/events.json data/events/
git commit -m "data: publish event results"
git push
```

Der Export schreibt Rohdaten. Die Website berechnet Stationsränge, Divisionswertungen und Overall-Wertung aus den Stationswerten.

## Website-Funktionen

- Eventübersicht mit kommenden und vergangenen Events.
- Separate Eventdateien; der Eventkatalog verweist über `dataFile` auf die jeweilige JSON-Datei.
- Division-spezifische Ranglisten: Männer, Frauen und Mixed.
- Ergänzende Overall-Wertung über alle Divisionen; sie vergleicht absolute Messwerte ohne Ausgleich unterschiedlicher Lasten oder Bedingungen.
- Podium, Stationsübersicht und Team-Detailansichten.
- Altersklassenwertung und Altersfilter nur, wenn für alle Teams die erforderlichen Altersangaben vorhanden sind und `ageGroupsAvailable` nicht explizit `false` ist.
- Fehlen Altersangaben, werden sie als `null` geführt; Altersklassenfunktionen werden für das Event ausgeblendet.

## Datenmodell und Wertung

- Divisionen werden getrennt ausgewertet: Männer, Frauen, Mixed.
- Stationsrang gemäß `direction` je Station (`desc` = höher ist besser, `asc` = niedriger ist besser).
- Gesamtwertung: arithmetischer Mittelwert der acht Stationsränge; niedriger ist besser.
- Gleichstände verwenden Competition Ranking (1, 1, 3).
- Altersklasse basiert auf dem Mittelwert der beiden Partneralter.
- Altersklassenrang wird innerhalb derselben Division und Altersklasse berechnet.
- Overall vergleicht absolute Stationsleistungen ohne Ausgleich unterschiedlicher Lasten oder Bedingungen und ist daher nur eine ergänzende Vergleichswertung.

## Datenschutz

GitHub Pages ist öffentlich. Vor Veröffentlichung ist sicherzustellen, dass die betroffenen Personen der Veröffentlichung ihrer Namen und Ergebnisse zugestimmt haben.

## Versionierung

Die Website wird unabhängig von der Excel-Datei nach Semantic Versioning versioniert (`MAJOR.MINOR.PATCH`):

- **MAJOR**: inkompatible Änderungen an Datenmodell, Schnittstellen oder Verhalten.
- **MINOR**: neue, rückwärtskompatible Funktionen.
- **PATCH**: rückwärtskompatible Fehlerkorrekturen.

Jeder Release aktualisiert diese README, die Versionsangabe im Footer und die Versionshistorie in `index.html`. Frühere Release-Artefakte werden nicht überschrieben.

### Versionshistorie

| Version | Datum | Typ | Änderungen |
|---|---|---|---|
| v1.3.0 | 03.11.2026 | MINOR | Team-Detailansichten erweitert: Stations-Radar, kumulierter Rangverlauf, Stationsleistungen sowie Divisions- und Overallrang. |
| v1.2.0 | 03.11.2026 | MINOR | Erstes reales Event veröffentlicht (Halloween 2026); Altersklassen bei fehlenden Altersdaten ausgeblendet; Demo-Daten aus dem öffentlichen Eventkatalog entfernt; Footer-Slogan kompakt zentriert: „WE 💛 HYROX!“ |
| v1.1.0 | 03.11.2026 | MINOR | Event-Startseite, Event-Karten für kommende und vergangene Events, Event-Auswahl und getrennte Ergebnisdateien je Event. |
| v1.0.0 | 02.11.2026 | MAJOR · Initial Release | Overall-, Männer-, Frauen- und Mixed-Wertungen, Altersklassenansicht, Podien, Stationsübersicht und Team-Detailansichten. |
