# Google-Drive-Import für die Ergebnis-Excel einrichten

Der Workflow `.github/workflows/import-results-google-drive.yml` lädt die private XLSX-Masterdatei zur Laufzeit herunter, exportiert nur öffentliche Ergebnis-JSON-Dateien und erstellt einen Pull Request nach `develop`.

Die XLSX-Datei wird weder im Repository gespeichert noch als Workflow-Artefakt hochgeladen.

## 1. Google-Cloud-Projekt vorbereiten

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein eigenes Projekt anlegen oder ein vorhandenes privates Projekt verwenden.
2. Unter **APIs & Dienste → Bibliothek** die **Google Drive API** aktivieren.
3. Unter **Google Auth Platform** die OAuth-App konfigurieren:
   - Zielgruppe: **Extern** (privates Google-Konto).
   - App-Name und Support-E-Mail eintragen.
   - Den eigenen Google-Account als Testnutzer hinzufügen, solange die App im Testmodus ist.
4. Einen OAuth-Client vom Typ **Webanwendung** erstellen.
5. Als autorisierte Weiterleitungs-URI exakt eintragen:
   `https://developers.google.com/oauthplayground`
6. Client-ID und Client-Secret sicher aufbewahren.

**Wichtig zum Testmodus:** OAuth-Refresh-Tokens für externe Apps im Status „Testing“ laufen bei Google in der Regel nach sieben Tagen ab. Für einen dauerhaft nutzbaren Workflow muss die OAuth-App in den Produktionsstatus versetzt werden. Bei rein privater Nutzung kann die App als nicht verifizierte App mit dem entsprechenden Google-Warnhinweis verwendet werden; keine fremden Nutzer hinzufügen. Google kann bei bestimmten Scopes zusätzliche Prüfungen verlangen.

## 2. Refresh-Token erzeugen

1. [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) öffnen.
2. Über das Zahnrad **Use your own OAuth credentials** aktivieren.
3. Client-ID und Client-Secret aus Schritt 1 eintragen.
4. Im Feld für eigene Scopes diesen Scope eintragen:

   `https://www.googleapis.com/auth/drive.readonly`

5. **Authorize APIs** auswählen und mit genau dem Google-Konto anmelden, in dessen Drive die Master-Excel liegt.
6. **Exchange authorization code for tokens** ausführen.
7. Das angezeigte **Refresh token** sicher kopieren. Nicht den Access Token verwenden.

Das Refresh-Token gewährt Lesezugriff auf Google Drive. Es gehört zu einem privaten Konto und darf weder in Git noch in Logs oder Chats veröffentlicht werden.

## 3. Drive-Datei-ID ermitteln

Die Masterdatei in Google Drive öffnen. Bei einer URL der Form

`https://drive.google.com/file/d/DATEI_ID/view`

ist `DATEI_ID` der Wert zwischen `/d/` und `/view`.

Die Datei muss eine echte XLSX-Datei bleiben. Sie wird nicht in ein Google-Sheets-Dokument konvertiert.

## 4. GitHub Secrets anlegen

Im Repository **Settings → Secrets and variables → Actions → New repository secret** diese vier Secrets anlegen:

| Secret | Inhalt |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth-Client-ID |
| `GOOGLE_CLIENT_SECRET` | OAuth-Client-Secret |
| `GOOGLE_REFRESH_TOKEN` | Refresh-Token aus Schritt 2 |
| `GOOGLE_DRIVE_FILE_ID` | Drive-Datei-ID aus Schritt 3 |

Keine dieser Angaben in Workflow-Dateien oder Repository-Variablen mit öffentlicher Sichtbarkeit eintragen.

## 5. Workflow starten

Nachdem der Workflow über die normale Branch-Kette in `main` angekommen ist:

1. GitHub → **Actions** öffnen.
2. **Import event results from Google Drive** auswählen.
3. **Run workflow** wählen.
4. Optional eine Event-ID eintragen. Ohne Eingabe wird die Auswahl aus `Event!B4` in der Excel-Datei verwendet.
5. Workflow starten.

Der Workflow lädt die XLSX-Datei auf einen kurzlebigen GitHub-Runner, führt `scripts/export_results.py` aus und validiert den Export. Bei Änderungen wird ein neuer PR nach `develop` angelegt. Ohne Änderungen wird kein PR erzeugt.

## 6. Excel vor dem Export speichern

Der Exporter verwendet `openpyxl` mit `data_only=True`. Deshalb muss die Arbeitsmappe vor dem Export in Excel oder Google Sheets geöffnet, vollständig neu berechnet und gespeichert worden sein, damit die zwischengespeicherten Formelwerte aktuell sind.

Die Automatisierung verändert die Quelldatei nicht. Wenn Pflichtwerte fehlen oder der Export/Schema-Check fehlschlägt, wird kein Ergebnis-PR erstellt.
