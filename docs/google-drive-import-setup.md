# Google-Drive-Import für die Ergebnis-Mastertabelle einrichten

Der Workflow `.github/workflows/import-results-google-drive.yml` authentifiziert GitHub Actions über **Workload Identity Federation (OIDC)** bei Google Cloud. Er exportiert die private Google-Sheets-Mastertabelle zur Laufzeit als XLSX, führt den bestehenden Exporter aus und erstellt einen Pull Request mit ausschließlich öffentlichen Ergebnis-JSON-Dateien nach `develop`.

Die Tabelle wird weder im Repository gespeichert noch als Workflow-Artefakt hochgeladen. Es werden keine langlebigen Google-Service-Account-Schlüssel und keine OAuth-Refresh-Tokens verwendet.

## 1. Google-Cloud-Projekt

Die Google-Cloud-Konfiguration für dieses Repository:

- Projekt: `fitnessclub-results-import`
- Projektnummer: `977206525252`
- Google Drive API aktiviert
- Dienstkonto: `fitnessclub-results-reader@fitnessclub-results-import.iam.gserviceaccount.com`
- Workload Identity Pool: `github-actions-pool`
- OIDC-Provider: `github-actions`
- Provider-Aussteller: `https://token.actions.githubusercontent.com`
- Attributzuordnung:
  - `google.subject` → `assertion.sub`
  - `attribute.repository` → `assertion.repository`
  - `attribute.ref` → `assertion.ref`
- Attributbedingung:
  `assertion.repository == 'Reli4ble/fitnessclub-results' && assertion.ref == 'refs/heads/develop'`
- Dienstkonto-Bindung: `attribute.repository = Reli4ble/fitnessclub-results`

Die Google-Sheets-Mastertabelle muss mit dem Dienstkonto als **Betrachter** geteilt sein. Die Workflow-Datei enthält den Provider-Ressourcennamen und die Dienstkonto-Adresse bereits.

Provider-Ressourcenname:

`projects/977206525252/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions`

## 2. Drive-Datei-ID

Die ID aus der Mastertabelle:

`1EiN8fhKQ6wKWsDuikk0E2juuXh9pSQQE`

Der Workflow verwendet die Google Drive API `files.export` mit dem MIME-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Damit wird eine native Google-Tabelle zur Laufzeit als XLSX exportiert. Eine manuelle Konvertierung oder Speicherung einer zweiten Datei ist nicht erforderlich.

## 3. GitHub Secret anlegen

Im Repository **Settings → Secrets and variables → Actions → New repository secret** genau dieses Secret anlegen:

| Secret | Inhalt |
|---|---|
| `GOOGLE_DRIVE_FILE_ID` | `1EiN8fhKQ6wKWsDuikk0E2juuXh9pSQQE` |

Google-Zugangsdaten werden über GitHub OIDC bezogen. Es sind keine Client-ID, kein Client-Secret, kein Refresh-Token und kein JSON-Schlüssel als GitHub Secret erforderlich.

## 4. Workflow starten

Der Workflow muss zunächst über die normale Branch-Kette in `main` angekommen sein, damit GitHub ihn unter **Actions** anbietet.

Da der Google-Provider absichtlich nur `refs/heads/develop` zulässt, beim manuellen Start im Feld **Branch** ausdrücklich `develop` auswählen:

1. GitHub → **Actions** öffnen.
2. **Import event results from Google Drive** auswählen.
3. **Run workflow** wählen.
4. Als Branch `develop` auswählen.
5. Optional eine Event-ID eintragen. Ohne Eingabe wird die Auswahl aus `Event!B4` in der Tabelle verwendet.
6. Workflow starten.

Der Workflow exportiert die Tabelle als XLSX auf einen kurzlebigen GitHub-Runner, führt `scripts/export_results.py` aus und validiert den Export. Bei Änderungen wird ein neuer PR nach `develop` angelegt. Ohne Änderungen wird kein PR erzeugt.

## 5. Mastertabelle vor dem Export speichern

Der Exporter verwendet `openpyxl` mit `data_only=True`. Deshalb muss die Google-Sheets-Mastertabelle vor dem Export vollständig neu berechnet und gespeichert worden sein, damit die exportierte XLSX-Datei aktuelle zwischengespeicherte Formelwerte enthält.

Die Automatisierung verändert die Quelldatei nicht. Wenn Pflichtwerte fehlen oder der Export/Schema-Check fehlschlägt, wird kein Ergebnis-PR erstellt.
