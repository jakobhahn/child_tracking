# MVP Plan

- [x] Projektgeruest und technische Basis fuer lokale Docker-App festlegen
- [x] SQLite-Datenmodell und Initialisierung fuer Kinder und Messungen implementieren
- [x] CRUD fuer Kinder und Messungen mit serverseitiger Validierung bauen
- [x] Responsive UI mit Dashboard, Filtern und Diagramm umsetzen
- [x] PDF-Export fuer aktuell gefilterte Daten pro Kind umsetzen
- [x] Docker-Setup und einfache Installationsdokumentation erstellen
- [x] Build und Codequalitaet verifizieren

# Spec

- Ziel: lokal/VPN erreichbare Web-App fuer die Erfassung von Kinder-Messwerten
- Nutzerkonzept: gemeinsame Familien-App ohne Login, Zugriff nur ueber internes Netz/VPN
- Kinder: mehrere Kinder mit Name und Geburtsdatum
- Messungen: Gewicht, Groesse, Temperatur; mindestens ein Messwert pro Eintrag erforderlich
- Zeit: Standard ist aktueller Zeitpunkt, Eingabe darf manuell ueberschrieben werden
- Bearbeitung: Messungen muessen bearbeitet und geloescht werden koennen
- Filter: genau ein Kind aktiv, Presets fuer Zeitraum plus frei waehlbarer Start/Ende-Bereich
- Diagramm: gemeinsame Zeitachse mit ein-/ausblendbaren Linien
- Export: PDF mit Tabelle und Diagramm fuer aktuell ausgewaehlte Messwerte und Filter
- Konfiguration: globale Einheiten ueber Umgebungsvariablen
- Deployment: Docker Compose, SQLite-Datei in Volume, Start ohne separates DB-Setup
- Sprache: Deutsch
- UX: modern, minimal, medizinisch warm, mobile-tauglich

# Review

- `npm run lint` erfolgreich
- `npm run build` erfolgreich
- `docker build -t child-tracking-test .` konnte nicht vollstaendig verifiziert werden, weil lokal kein Docker-Daemon lief
