# Kinderwerte

Lokale Web-App zur Erfassung von Gewicht, Groesse und Temperatur fuer mehrere Kinder.
Die App ist fuer den Betrieb im Heimnetz oder per VPN gedacht und laeuft komplett in Docker mit SQLite.

## Ziel

Die App ersetzt handschriftliche Zettel fuer wiederkehrende Messungen und ist fuer einen einfachen lokalen Betrieb gedacht:

- lokal auf NAS, Homeserver oder Docker-Host
- erreichbar im WLAN oder per VPN
- kein externer Cloud-Zwang
- keine separate Datenbank noetig

## Funktionen

- mehrere Kinder mit Name und Geburtsdatum
- Messungen mit Gewicht, Groesse und Temperatur
- mindestens ein Messwert pro Eintrag erforderlich
- Zeitstempel standardmaessig sofort vorbelegt, aber manuell aenderbar
- Bearbeiten und Loeschen von Messungen
- Zeitraumfilter mit Presets und freiem Bereich
- gemeinsames Diagramm mit ein- und ausblendbaren Linien
- PDF-Export mit Diagramm und Tabelle fuer das aktuell ausgewaehlte Kind
- responsive, deutschsprachige UI fuer Desktop und Mobilgeraete

## Voraussetzungen

Fuer den produktiven Start genuegt:

- Docker
- Docker Compose
- ein Host im internen Netzwerk, z. B. NAS, Mini-PC oder Homeserver

Fuer lokalen Entwicklungsbetrieb ohne Docker:

- Node.js 22+
- npm

## Konfiguration

Die Einheiten werden global ueber Umgebungsvariablen gesetzt:

- `NEXT_PUBLIC_WEIGHT_UNIT`
- `NEXT_PUBLIC_HEIGHT_UNIT`
- `NEXT_PUBLIC_TEMPERATURE_UNIT`
- `NEXT_PUBLIC_NETWORK_HINT`

Die SQLite-Datei liegt standardmaessig unter `/app/data/child-tracking.sqlite`.

## Start mit Docker Compose

1. Repository holen oder aktualisieren:

```bash
git pull
```

2. Datei `.env.example` nach `.env` kopieren:

```bash
cp .env.example .env
```

3. Werte in `.env` bei Bedarf anpassen.
   Typisch relevant sind Port, Bind-Adresse und Einheiten.

4. Container bauen und starten:

```bash
docker compose up --build -d
```

5. App im Browser oeffnen:

```text
http://<dein-nas-oder-server>:3000
```

6. Die Datenbank wird beim ersten Start automatisch erzeugt.
   Es ist kein separates Datenbank-Setup noetig.

## Beispiel `.env`

```env
APP_PORT=3000
APP_BIND_IP=0.0.0.0
DATABASE_PATH=/app/data/child-tracking.sqlite
NEXT_PUBLIC_WEIGHT_UNIT=kg
NEXT_PUBLIC_HEIGHT_UNIT=cm
NEXT_PUBLIC_TEMPERATURE_UNIT=°C
NEXT_PUBLIC_NETWORK_HINT=Nur im internen Netzwerk oder per VPN verwenden.
```

## Update

```bash
git pull
docker compose up --build -d
```

Die vorhandenen Daten bleiben erhalten, solange das `data`-Verzeichnis bestehen bleibt.

## Lokaler Start ohne Docker

```bash
npm install
npm run dev
```

Standardmaessig ist die App dann lokal im Browser erreichbar, z. B. unter `http://localhost:3000` oder dem naechsten freien Port.

## Bedienung

1. Ein Kind mit Name und optionalem Geburtsdatum anlegen.
2. Kind auswaehlen.
3. Messung mit einem oder mehreren Werten erfassen.
4. Zeitraum filtern und Linien im Diagramm ein- oder ausblenden.
5. Bei Bedarf PDF fuer das aktuell ausgewaehlte Kind exportieren.

## Wichtige Hinweise zum Netz

- Die App hat bewusst keinen Login.
- Veroeffentliche sie nur im internen Netzwerk oder ueber dein VPN.
- Auf einem NAS sollte der Port nur im LAN erreichbar sein oder ueber deine bestehende VPN-/Firewall-Konfiguration abgesichert werden.

## Verifikation

Die App wurde in dieser Codebasis mit folgenden Befehlen verifiziert:

```bash
npm run lint
npm run build
```

## Roadmap

- Backup- und Restore-Funktionen
- Export/Import kompletter Datenbestaende
- weitere medizinische Verlaufstypen nur falls spaeter wirklich noetig
