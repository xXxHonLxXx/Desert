# HONL Wüstensturm auf deinem Server

Das Paket enthält den Bearbeitungsplan und die schreibgeschützte Ansicht für Team A und Team B. Es braucht einen Server mit Node.js 22 oder neuer. Es gibt keine npm-Abhängigkeiten.

## Lokal starten

1. Entpacke den Ordner und öffne ihn im Terminal.
2. Setze einen eigenen Bearbeitungscode mit mindestens 12 Zeichen und ein separates zufälliges Geheimnis für die Sitzung. Mit diesem Befehl kannst du einen Zufallswert erzeugen.

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

3. Hinterlege die Werte als Umgebungsvariablen und starte den Server.

   ```sh
   EDIT_CODE='dein-eigener-langer-code' SESSION_SECRET='dein-zufallswert-mit-mindestens-32-zeichen' node server.mjs
   ```

4. Öffne http://localhost:3000 zum Bearbeiten. Die Leseansicht liegt unter http://localhost:3000/ansicht.

## Online bereitstellen

Lass Node als Dienst laufen und leite deine HTTPS-Domain per Reverse Proxy an `127.0.0.1:3000` weiter. Setze `PUBLIC_ORIGIN` auf die öffentliche Adresse mit HTTPS, zum Beispiel `https://wuestensturm.example.org`. Mit `PORT` kannst du den internen Port ändern. Schütze den Bearbeitungscode und das Sitzungsgeheimnis über die Konfiguration deines Servers.

Erstelle im Bearbeitungsplan einen Ansichtslink, um deinen bearbeiteten Stand freizugeben. Der sechsstellige Lesecode 857825 zeigt die mitgelieferte Ausgangseinteilung.

## Einteilungen mitnehmen

Im bisherigen Bearbeitungsplan auf **Sicherung herunterladen** klicken und auf dem neuen Server über **Sicherung laden** importieren. Der Download enthält beide Teams samt Mitgliedern, Ersatzspielern und Zuteilungen. Die mitgelieferten HTML-Dateien enthalten den Ausgangsstand. Deine späteren Änderungen liegen im Browser, bis du sie als JSON sicherst.

Gebäude werden mit deutschen und englischen Namen angezeigt.
