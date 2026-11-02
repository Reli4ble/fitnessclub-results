# Fitnessclub Competition Results

**Website-Version: v1.0.0**  
**Release-Datum: 02.11.2026**

Die Website verwendet ein eigenes Semantic-Versioning-Schema. Die Versionsnummer ist unabhängig von der Excel-Arbeitsmappe. Die Versionshistorie ist im Footer-Bereich der Website aufklappbar.

Statische Ergebnis-Website für GitHub Pages. Keine Datenbank, kein Backend und kein Login.

## Inhalt

- `index.html`, `styles.css`, `app.js`: Website
- `data/results.json`: veröffentlichte Wettkampfdaten (aktuell ausschließlich synthetische DEMO-Daten)
- `scripts/export_results.py`: liest die Eingabetabelle aus der Excel-Arbeitsmappe und erzeugt `data/results.json`

## Lokal ansehen

Im Projektverzeichnis:

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` öffnen. `index.html` nicht per Doppelklick (`file://`) öffnen, da der Browser den JSON-Abruf blockieren kann.

## GitHub Pages veröffentlichen

1. Ein neues **öffentliches** GitHub-Repository erstellen, z. B. `fitnessclub-results`.
2. Alle Dateien dieses Projekts in den Repository-Root hochladen.
3. GitHub: **Settings → Pages**.
4. Bei **Build and deployment** `Deploy from a branch` auswählen.
5. Branch `main`, Ordner `/ (root)` wählen und speichern.
6. Nach dem Deployment ist die Website über die angezeigte `github.io`-URL erreichbar.

GitHub Pages ist öffentlich. Niemals personenbezogene Daten veröffentlichen, für die keine Freigabe vorliegt.

## Ergebnisse aus Excel übernehmen

Voraussetzung: Python 3 und `openpyxl`.

```bash
python3 -m pip install openpyxl
python3 scripts/export_results.py "/pfad/zur/HYROX_Fitnessclub_Auswertung_mit_Partnernamen.xlsx"
```

Das Skript liest ausschließlich das Blatt `Teams & Ergebnisse` und `Einstellungen`. Es übernimmt Teams, Partnernamen, Alter und die acht Stationswerte. Ranglisten und Altersklassen werden anschließend auf der Website aus den Rohdaten berechnet.

Danach `data/results.json` committen und pushen:

```bash
git add data/results.json
git commit -m "Update competition results"
git push
```

GitHub Pages veröffentlicht die aktualisierten Daten automatisch nach dem Deployment.

## Overall-Wertung

Die Overall-Wertung berechnet Stationsränge über alle Divisionen gemeinsam. Sie vergleicht absolute Messwerte ohne Ausgleich unterschiedlicher Lasten oder Bedingungen. Für einen sinnvollen Vergleich müssen Einheit und Messmethode jeder Station über alle Divisionen identisch sein.

## Website-Funktionen

- Division-spezifisches Podium für die drei bestplatzierten Teams.
- Klick auf ein Team in Podium oder Tabelle öffnet das Teamprofil mit allen acht Stationswerten und Stationsrängen.
- Vier Ranglisten-Tabs: Overall (alle Divisionen gemeinsam), Männer, Frauen und Mixed.
- Overall vergleicht absolute Stationsleistungen ohne Ausgleich unterschiedlicher Lasten oder Bedingungen.
- Umschaltung zwischen Gesamtwertung und Altersklassenwertung.
- Altersklassenansicht gruppiert die Teams nach Altersklasse und zeigt den Rang innerhalb der Altersklasse.
- Bei Auswahl einer einzelnen Altersklasse zeigt das Podium deren Top 3.
- Altersklassenfilter und Stationsübersicht bleiben verfügbar.

## Datenmodell / Wertung

- Divisionen werden separat ausgewertet: Männer, Frauen, Mixed.
- Stationsrang: gemäß `Rangrichtung` in Excel (`Mehr ist besser` oder `Weniger ist besser`).
- Gesamtwertung: arithmetischer Mittelwert der acht Stationsränge; niedriger ist besser.
- Gleichstände verwenden Competition Ranking (1, 1, 3).
- Altersklasse basiert auf dem Mittelwert der beiden Partneralter.
- Altersklassenrang wird innerhalb derselben Division und Altersklasse berechnet.

## Wichtige Hinweise

- Die mitgelieferten Teams und Werte sind vollständig erfunden und als DEMO gekennzeichnet.
- Das Exportskript setzt voraus, dass die Stationswerte in Excel in den Spalten G:N stehen und Partnernamen in O:P. Das entspricht der bereitgestellten Arbeitsmappe.
- Bei `Weniger ist besser` wird der niedrigste Messwert auf Rang 1 gesetzt.
- Für die Website werden Partnernamen aus Excel übernommen. Vor Veröffentlichung bitte die Freigabe aller betroffenen Personen sicherstellen.


### Version 4

- Die Überschrift wechselt passend zwischen Gesamtwertung und Altersklassenwertung.
- Bei gewählter Altersklasse werden auch Stationswertungen und Team-Auswahl auf diese Altersklasse begrenzt. Stationsränge werden innerhalb der gefilterten Division und Altersklasse neu berechnet.


## Versionierung

Die Website wird unabhängig von der Excel-Datei nach Semantic Versioning versioniert (`MAJOR.MINOR.PATCH`):

- **MAJOR**: inkompatible Änderungen an Datenmodell, Schnittstellen oder Verhalten.
- **MINOR**: neue, rückwärtskompatible Funktionen.
- **PATCH**: rückwärtskompatible Fehlerkorrekturen.

Jeder Release aktualisiert die Versionsangabe im Footer, die Versionshistorie in `index.html` und diese README. Frühere Release-Artefakte werden nicht überschrieben.

### Versionshistorie

| Version | Datum | Typ | Änderungen |
|---|---|---|---|
| v1.0.0 | 02.11.2026 | MAJOR · Initial Release | Erster offizieller semantisch versionierter Release mit Overall-, Männer-, Frauen- und Mixed-Wertung, Altersklassenansicht, Podien, Stationsübersicht und Team-Detailansichten. |
| v5 | 02.11.2026 | Vorversion | Letzter Entwicklungsstand vor Einführung von Semantic Versioning; kombinierte Overall-Wertung und gruppierte Altersklassenansicht. |
