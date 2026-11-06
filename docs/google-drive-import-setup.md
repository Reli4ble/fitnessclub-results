# Google-Drive-Import für die Ergebnis-Excel einrichten

Der Workflow `.github/workflows/import-results-google-drive.yml` authentifiziert GitHub Actions über **Workload Identity Federation (OIDC)** bei Google Cloud. Er lädt die private XLSX-Masterdatei zur Laufzeit herunter, exportiert nur öffentliche Ergebnis-JSON-Dateien und erstellt einen Pull Request nach `develop`.

Die XLSX-Datei wird weder im Repository gespeichert noch als Workflow-Artefakt hochgeladen. Es werden keine langlebigen Google-Service-Account-Schlüssel und keine OAuth-Refresh-Tokens verwendet.

## 1. Google-Cloud-Projekt vorbereiten

1. Ein Google-Cloud-Projekt auswählen und die **Google Drive API** aktivieren.
2. Ein Dienstkonto mit dem Namen `fitnessclub-results-reader` erstellen.
3. Die Master-XLSX in Google Drive für die E-Mail-Adresse des Dienstkontos freigeben. Die Rolle **Betrachter** reicht aus.
4. Einen Workload-Identity-Pool `github-actions-pool` mit einem OIDC-Anbieter `github-actions` erstellen:
   - Anbieter: **OpenID Connect (OIDC)**
   - Aussteller: `https://token.actions.githubusercontent.com`
   - Attributzuordnung:
     - `google.subject` → `assertion.sub`
     - `attribute.repository` → `assertion.repository`
     - `attribute.ref` → `assertion.ref`
   - Attributbedingung, damit nur dieses Repository und der Branch `develop` zugelassen werden:
     `assertion.repository == 'Reli4ble/fitnessclub-results' && assertion.ref == 'refs/heads/develop'`
5. Dem Dienstkonto über **Workload Identity-Föderation → Pool → Zugriff gewähren → Zugriff mit Identitätsübernahme des Dienstkontos gewähren** Zugriff erteilen:
   - Dienstkonto: `fitnessclub-results-reader`
   - Attributname: `attribute.repository`
   - Attributwert: `Reli4ble/fitnessclub-results`

   Das Dienstkonto muss im Tab **Verbundene Dienstkonten** des Pools erscheinen.

## 2. Werte für GitHub Actions

Für das Projekt `fitnessclub-results-import` werden diese Werte verwendet:

| Einstellung | Wert |
|---|---|
| Google Cloud Project Number | `977206525252` |
| Workload Identity Pool ID | `github-actions-pool` |
| Provider ID | `github-actions` |
| Service Account | `fitnessclub-results-reader@fitnessclub-results-import.iam.gserviceaccount.com` |
| Provider-Ressourcenname | `projects/977206525252/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions` |

Die Workflow-Datei enthält Provider-Ressourcenname und Dienstkonto bereits.

## 3. Drive-Datei-ID ermitteln

Die Masterdatei in Google Drive öffnen. Bei einer URL der Form

`https://drive.google.com/file/d/DATEI_ID/view`

ist `DATEI_ID` der Wert zwischen `/d/` und `/view`.

Die Datei muss eine echte XLSX-Datei bleiben. Sie wird nicht in ein Google-Sheets-Dokument konvertiert.

## 4. GitHub Secret anlegen

Im Repository **Settings → Secrets and variables → Actions → New repository secret** genau dieses Secret anlegen:

| Secret | Inhalt |
|---|---|
| `GOOGLE_DRIVE_FILE_ID` | Drive-Datei-ID aus Schritt 3 |

Google-Zugangsdaten werden über GitHub OIDC bezogen. Es sind daher keine Client-ID, kein Client-Secret, kein Refresh-Token und kein JSON-Schlüssel als GitHub Secret erforderlich.

## 5. Workflow starten

Der Workflow muss zunächst über die normale Branch-Kette in `main` angekommen sein, damit GitHub ihn unter **Actions** anbietet.

Da der Google-Provider absichtlich nur `refs/heads/develop` zulässt, beim manuellen Start im Feld **Branch** ausdrücklich `develop` auswählen:

1. GitHub → **Actions** öffnen.
2. **Import event results from Google Drive** auswählen.
3. **Run workflow** wählen.
4. Als Branch `develop` auswählen.
5. Optional eine Event-ID eintragen. Ohne Eingabe wird die Auswahl aus `Event!B4` in der Excel-Datei verwendet.
6. Workflow starten.

Der Workflow lädt die XLSX-Datei auf einen kurzlebigen GitHub-Runner, führt `scripts/export_results.py` aus und validiert den Export. Bei Änderungen wird ein neuer PR nach `develop` angelegt. Ohne Änderungen wird kein PR erzeugt.

## 6. Excel vor dem Export speichern

Der Exporter verwendet `openpyxl` mit `data_only=True`. Deshalb muss die Arbeitsmappe vor dem Export in Excel oder Google Sheets geöffnet, vollständig neu berechnet und gespeichert worden sein, damit die zwischengespeicherten Formelwerte aktuell sind.

Die Automatisierung verändert die Quelldatei nicht. Wenn Pflichtwerte fehlen oder der Export/Schema-Check fehlschlägt, wird kein Ergebnis-PR erstellt.
