# HONL Wüstensturm – Render-Version (korrigiert)

Dateien ins Hauptverzeichnis des GitHub-Repositories **Desert** hochladen, bestehende Dateien gleichen Namens ersetzen.

Render-Einstellungen:
- Runtime: Node
- Build Command: `echo "No build required"`
- Start Command: `node server.mjs`
- Environment: `EDIT_CODE` = eigener Code mit mindestens 6 Zeichen
- Environment: `SESSION_SECRET` = zufälliger Wert mit mindestens 32 Zeichen
- Environment: `PUBLIC_ORIGIN` = exakt die eigene HTTPS-Render-Adresse (ohne Slash am Ende), z. B. `https://dein-dienst.onrender.com`
- `PORT` nicht selbst setzen; Render vergibt ihn.

Seiten:
- `/` = geschützter Bearbeitungsmodus
- `/ansicht` = öffentliche schreibgeschützte Ansicht
- Im Bearbeitungsmodus über **Ansichtslink erstellen** einen vollständigen Link mit dem aktuellen Plan generieren.

Hinweis: Der Plan wird im Browser gespeichert. Für Gerätewechsel **Sicherung herunterladen** und **Sicherung laden** verwenden.

Änderungen: Safari-kompatible Anmeldung mit CSRF-Schutz; funktionierender absoluter Ansichtslink; korrekt verknüpfte Dateien; 6-stelliger Code erlaubt.
