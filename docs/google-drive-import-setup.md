# Google-Drive-Import für die Ergebnis-Mastertabelle einrichten

Der Workflow `.github/workflows/import-results-google-drive.yml` authentifiziert GitHub Actions über **Workload Identity Federation (OIDC)** bei Google Cloud. Er lädt die private Excel-Masterdatei zur Laufzeit aus Google Drive herunter, führt den bestehenden Exporter aus und erstellt einen Pull Request mit ausschließlich öffentlichen Ergebnis-JSON-Dateien nach `develop`.

Die Excel-Datei wird weder im Repository gespeichert noch als Workflow-Artefakt hochgeladen. Es werden keine langlebigen Google-Service-Account-Schlüssel und keine OAuth-Refresh-Tokens verwendet.

## 1. Google-Cloud-Konfiguration

Die konkreten Projekt- und Identitätsdaten (Projekt-ID, Projektnummer, Dienstkonto-Adresse, Workload-Identity-Pool und Provider-Ressourcenname) werden ausschließlich in der privaten Google-Cloud-Konfiguration verwaltet. Sie werden hier bewusst nicht veröffentlicht.

Für die Authentifizierung gelten folgende Sicherheitsanforderungen:

- GitHub Actions authentifiziert sich über OIDC und Workload Identity Federation.
- Der Provider muss auf dieses Repository und den Branch `develop` beschränkt sein.
- Das Dienstkonto erhält nur die für den Import erforderlichen Leserechte auf die Masterdatei.
- Die Masterdatei wird mit dem Dienstkonto als **Betrachter** geteilt.
- Keine Service-Account-Schlüssel oder langlebigen Tokens im Repository ablegen.

## 2. Google-Drive-Datei

Die Datei-ID der Masterdatei wird ausschließlich als privates GitHub-Repository-Secret `GOOGLE_DRIVE_FILE_ID` hinterlegt. Der tatsächliche Secret-Wert darf weder in dieser Dokumentation noch in Quellcode, Commits, Issues oder Logs stehen.

Der Workflow lädt die vorhandene XLSX-Datei zur Laufzeit über die Google Drive API auf einen kurzlebigen GitHub-Runner herunter. Die Datei wird nicht ins Repository übernommen und nach dem Export aus dem Runner-Arbeitsbereich entfernt.

## 3. GitHub Secret konfigurieren

Im Repository unter **Settings → Secrets and variables → Actions → New repository secret** dieses Secret anlegen:

| Secret | Inhalt |
|---|---|
| `GOOGLE_DRIVE_FILE_ID` | Die Datei-ID der privaten Excel-Masterdatei (nur hier als Secret-Wert hinterlegen) |

Den tatsächlichen Wert nicht in öffentliche Dokumentation kopieren. Google-Zugangsdaten werden über GitHub OIDC bezogen; es sind keine Client-ID, kein Client-Secret, kein Refresh-Token und kein JSON-Schlüssel als GitHub Secret erforderlich.

## 4. Workflow starten

Der Workflow muss zunächst über die normale Branch-Kette in `main` angekommen sein, damit GitHub ihn unter **Actions** anbietet.

Da der Google-Provider absichtlich nur den Branch `develop` zulässt, beim manuellen Start im Feld **Branch** ausdrücklich `develop` auswählen:

1. GitHub → **Actions** öffnen.
2. **Import event results from Google Drive** auswählen.
3. **Run workflow** wählen.
4. Als Branch `develop` auswählen.
5. Optional eine Event-ID eintragen. Ohne Eingabe wird die Event-Auswahl aus der Masterdatei verwendet.
6. Workflow starten.

Der Workflow lädt die Excel-Datei auf einen kurzlebigen GitHub-Runner herunter, führt `scripts/export_results.py` aus und validiert den Export. Bei Änderungen wird ein neuer PR nach `develop` angelegt. Ohne Änderungen wird kein PR erzeugt.

## 5. Masterdatei vor dem Import speichern

Der Exporter verwendet `openpyxl` mit `data_only=True`. Deshalb muss die Excel-Masterdatei vor dem Import vollständig neu berechnet und gespeichert worden sein, damit die XLSX-Datei aktuelle zwischengespeicherte Formelwerte enthält.

Die Automatisierung verändert die Quelldatei nicht. Wenn Pflichtwerte fehlen oder der Export/Schema-Check fehlschlägt, wird kein Ergebnis-PR erstellt.
