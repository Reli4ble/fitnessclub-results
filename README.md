# Fitnessclub Competition Results

**Website-Version: v1.8.0**  
**Release-Datum: 05.11.2026**

Statische Ergebnis-Website für GitHub Pages. Keine Datenbank, kein Backend und kein Login. Die Website wird über GitHub Actions aus `main` (Produktion) und `develop` (Preview) gemeinsam veröffentlicht.

## Version 1.8.0

- Teamprofil-Navigation korrigiert: Die Deployment-Basis-URL wird beim Laden der Anwendung fest erfasst, sodass das Schließen eines geteilten Teamprofils zuverlässig zur Eventübersicht zurückführt – auch in der Preview unter `/preview/`.

## Version 1.7.0

- Ergebnisbereiche in eigenständige Ansichten mit bereichsbezogener Navigation aufgeteilt; Divisionsauswahl bleibt dort verfügbar, wo sie die dargestellten Ergebnisse tatsächlich steuert.
- Übersichtsseite erweitert und Auszeichnungen integriert: Divisionschampions und Stationssieger werden zentral dargestellt; redundante separate Auszeichnungsseite und nicht benötigter Teamvergleich entfernt.
- Ergebniszertifikate weiter verbessert: responsives A4-Layout, konsistente Platzierungsdarstellung in Webansicht und PDF sowie bereinigter Druckbereich und wiederhergestelltes HYROX-Fotobanner.
- GitHub-Pages-Deployment vereinheitlicht: Ein manueller Workflow-Start auf `main` baut Production aus `main` und Preview aus `develop` in einem gemeinsamen Pages-Artefakt; Pushes auf `develop` lösen keinen Pages-Deploy mehr aus.
- GitHub-Actions aktualisiert: `actions/checkout` auf v7 und `actions/setup-node` auf v6; Node.js-20-Deprecation-Warnung behoben.

## Version 1.6.0

- Teilbare Teamprofile mit stabilen Deep Links, Web-Share-/Kopierfunktion und Wiederherstellung der Ansicht über Browser-Zurück/Vorwärts.
- Vollständige interaktive Stationsranglisten mit Stationsauswahl, Divisions- und Altersklassenfiltern, stationsabhängiger Sortierrichtung und Competition Ranking bei Gleichständen.
- Event-Statistiken zu Team- und Athletenzahlen, Stationsanzahl, Divisionsverteilung sowie Bestwerten, Durchschnitten und Spannweiten je Division.
- Druckbare A4-Ergebniszertifikate im Querformat mit dynamischen Team-, Partner-, Event- und Rangdaten; responsive Darstellung und HYROX-inspirierter Fotobanner.

## Version 1.5.1

- Doppelte Statusanzeige im Header entfernt; aktiver Navigationszustand wird direkt am jeweiligen Button dargestellt.

## Version 1.5.0

- Event-Karten zeigen optional eine dezente Länderflagge als Hintergrund; das Länderkürzel wird über `countryCode` in `data/events.json` gesteuert.

## Version 1.4.0

- Proprietäre Lizenzbedingungen ergänzt (`LICENSE.md`).
- Öffentliche Seite „Nutzung & Lizenz“ und Copyright-Hinweise im Footer.

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
python3 scripts/export_results.py "/pfad/zur/Fitnessclub_Auswertung_MultiEvent.xlsx"
```

Die private Master-Datei verwaltet mehrere Events zentral:

- `Events`: Event-Stammdaten.
- `Athleten`: private Athleten-IDs, Vornamen, optionale Nachnamen-Kürzel und optionale Geburtsdaten.
- `Event-Ergebnisse`: eine Zeile je Team und Event; Event-ID und Athleten-IDs verbinden die Datensätze.
- `Event`: Auswahl des aktiven Events für die Excel-Auswertungsblätter.

Der Exporter liest das aktive Event aus `Event!B4`. Alternativ kann ein Event gezielt angegeben werden:

```bash
python3 scripts/export_results.py "/pfad/zur/Master.xlsx" --event-id halloween-2026
```

Der Exporter liest nur die Datensätze des ausgewählten Events. Er berechnet das Alter am Eventdatum aus den optionalen Geburtsdaten. Fehlt bei einem Team ein Geburtsdatum, werden dessen Alterswerte und Altersklasse als `null` exportiert; die normale Divisionswertung bleibt möglich.

**Datenschutz:** Interne Athleten-IDs, Nachnamen-Kürzel, Geburtsdaten und interne Notizen werden nicht in die öffentlichen JSON-Dateien übernommen. Öffentlich erscheinen ausschließlich Vornamen, Teamnamen und Wettkampfergebnisse. Die Master-Excel-Datei darf nicht im öffentlichen Repository abgelegt werden.

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
- Podium, interaktive Stationsrangliste, Event-Statistiken (Team-/Athletenzahlen, Divisionsverteilung, Stationsbestwerte, Durchschnitte und Spannweiten) und Team-Detailansichten.
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

## Urheberrecht und Lizenz

© 2026 Reli4ble. Alle Rechte vorbehalten. Das Projekt wird unter keiner Open-Source-Lizenz veröffentlicht. Es gelten die Bedingungen in [`LICENSE.md`](LICENSE.md) und auf der Website unter [Nutzung & Lizenz](https://reli4ble.github.io/fitnessclub-results/license.html). Eine Nutzung, Bearbeitung oder kommerzielle Verwertung außerhalb der von GitHub für öffentliche Repositories eingeräumten Plattformrechte bedarf der vorherigen schriftlichen Zustimmung des Rechteinhabers. Lizenzanfragen können über das [GitHub-Profil von Reli4ble](https://github.com/Reli4ble) gestellt werden.

Hinweis: Die Lizenztexte sind ein Formulierungsvorschlag und keine individuelle Rechtsberatung. Vor einer kommerziellen Lizenzierung sollte die Rechteinhaberschaft einschließlich etwaiger Beiträge Dritter und verwendeter Drittanbieter-Komponenten geprüft werden.

### Versionshistorie

| Version | Datum | Typ | Änderungen |
|---|---|---|---|
| v1.8.0 | 05.11.2026 | PATCH | Teamprofil-Navigation korrigiert: Rückkehr zur Eventübersicht mit stabiler Deployment-Basis-URL in Production und Preview. |
| v1.7.0 | 05.11.2026 | MINOR | Separate Ergebnisansichten und verbesserte Übersicht mit integrierten Auszeichnungen; Teamvergleich entfernt; Zertifikate und Druckdarstellung verbessert; Pages-Deployment auf main als Trigger vereinheitlicht; GitHub Actions aktualisiert. |
| v1.6.0 | 05.11.2026 | MINOR | Teilbare Teamprofile mit Deep Links und Browsernavigation; interaktive Stationsranglisten mit Filtern und korrekter Gleichstandsbehandlung; Event-Statistiken; responsive A4-Ergebniszertifikate mit Fotobanner. |
| v1.5.1 | 04.11.2026 | PATCH | Doppelte Statusanzeige im Header entfernt; aktive Navigation direkt am Navigationsbutton markiert. |
| v1.5.0 | 03.11.2026 | MINOR | Optionale Länderflaggen als dezentes Hintergrundmotiv in Event-Karten; Event-Land über `countryCode` konfigurierbar. |
| v1.4.0 | 03.11.2026 | MINOR | Proprietäre Lizenzbedingungen, Lizenzseite und Copyright-Hinweise ergänzt. |
| v1.3.0 | 03.11.2026 | MINOR | Team-Detailansichten erweitert: Stations-Radar, kumulierter Rangverlauf, Stationsleistungen sowie Divisions- und Overallrang. |
| v1.2.0 | 03.11.2026 | MINOR | Erstes reales Event veröffentlicht (Halloween 2026); Altersklassen bei fehlenden Altersdaten ausgeblendet; Demo-Daten aus dem öffentlichen Eventkatalog entfernt; Footer-Slogan kompakt zentriert: „WE 💛 HYROX!“ |
| v1.1.0 | 03.11.2026 | MINOR | Event-Startseite, Event-Karten für kommende und vergangene Events, Event-Auswahl und getrennte Ergebnisdateien je Event. |
| v1.0.0 | 02.11.2026 | MAJOR · Initial Release | Overall-, Männer-, Frauen- und Mixed-Wertungen, Altersklassenansicht, Podien, Stationsübersicht und Team-Detailansichten. |
