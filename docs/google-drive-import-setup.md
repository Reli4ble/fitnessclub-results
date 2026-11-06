# Google-Drive-Import für die Ergebnis-Mastertabelle einrichten

Der Workflow `.github/workflows/import-results-google-drive.yml` authentifiziert GitHub Actions über **Workload Identity Federation (OIDC)** bei Google Cloud. Er lädt die private Excel-Masterdatei (`.xlsx`) zur Laufzeit aus Google Drive herunter, führt den bestehenden Exporter aus und erstellt einen Pull Request mit ausschließlich öffentlichen Ergebnis-JSON-Dateien nach `develop`.

Die Excel-Datei wird weder im Repository gespeichert noch als Workflow-Artefakt hochgeladen. Es werden keine langlebigen Google-Service-Account-Schlüssel und keine OAuth-Refresh-Tokens verwendet.

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

Die Excel-Masterdatei in Google Drive muss mit dem Dienstkonto als **Betrachter** geteilt sein. Die Workflow-Datei enthält den Provider-Ressourcennamen und die Dienstkonto-Adresse bereits.

Provider-Ressourcenname:

`projects/977206525252/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions`

## 2. Drive-Datei-ID

Die ID der Excel-Masterdatei:

`1EiN8fhKQ6wKWsDuikk0E2juuXh9pSQQE`

Der Workflow verwendet die Google Drive API `files.get?alt=media`, um die vorhandene XLSX-Datei unverändert auf den kurzlebigen GitHub-Runner herunterzuladen. Es wird ausdrücklich **nicht** `files.export` verwendet, da die Quelldatei eine bereits gespeicherte Excel-Datei und keine native Google-Tabelle ist.

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
5. Optional eine Event-ID eintragen. Ohne Eingabe wird die Auswahl aus `Event!B4` in der Excel-Datei verwendet.
6. Workflow starten.

Der Workflow lädt die Excel-Datei auf einen kurzlebigen GitHub-Runner herunter, führt `scripts/export_results.py` aus und validiert den Export. Bei Änderungen wird ein neuer PR nach `develop` angelegt. Ohne Änderungen wird kein PR erzeugt.

## 5. Masterdatei vor dem Import speichern

Der Exporter verwendet `openpyxl` mit `data_only=True`. Deshalb muss die Excel-Masterdatei vor dem Import vollständig neu berechnet und gespeichert worden sein, damit die XLSX-Datei aktuelle zwischengespeicherte Formelwerte enthält.

Die Automatisierung verändert die Quelldatei nicht. Wenn Pflichtwerte fehlen oder der Export/Schema-Check fehlschlägt, wird kein Ergebnis-PR erstellt.
