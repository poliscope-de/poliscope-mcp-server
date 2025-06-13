# Poliscope MCP Server

⚠️⚠️⚠️⚠️

**Dieses Projekt befindet sich noch in einer frühen Entwicklungsphase und ist noch nicht für den produktiven Einsatz geeignet. Wir freuen uns über Beiträge zum Projekt oder kontaktiere uns unter kolja.martens@poliscope.de**

⚠️⚠️⚠️⚠️

Ein MCP (Model Context Protocol) Server, der Dir Tools zur Verfügung stellt, um mit der Poliscope API zu arbeiten. Damit erhältst Du Zugriff auf Daten deutscher Verwaltungseinheiten, Gemeinderatssitzungen und weitere relevante Informationen, direkt in deinem AI-Client (Claude Desktop, Cursor,...).

## Funktionsumfang

Der Server stellt Dir folgende Tools zur Verfügung:

### Verwaltungseinheiten
- **get_entity**: Rufe eine Verwaltungseinheit über ihren Regionalschlüssel (RS) ab, optional mit untergeordneten Einheiten
- **list_entities**: Liste Verwaltungseinheiten mit Filter-, Sortier- und Seitenfunktionen auf
- **count_entities**: Zähle Verwaltungseinheiten, die bestimmte Kriterien erfüllen

### Sitzungsdaten
- **get_meetings**: Rufe Sitzungen mit umfangreichen Filtermöglichkeiten ab (nach Verwaltungseinheit, Themen, Verfahren, Zeitraum)
- **count_meetings**: Zähle Sitzungen, die Deine Filterkriterien erfüllen

## Installation für Claude Desktop

1. Lade das Repository herunter oder klone es auf Deinen Computer.
2. Erstelle einen API-Schlüssel in der [Poliscope App](https://app.poliscope.de/api) und kopiere ihn.
3. Füge den Server zu Deiner MCP-Client-Konfiguration hinzu. In Claude Desktop trägst Du ihn in die `claude_desktop_config.json` ein:

```json
{
  "mcpServers": {
    "poliscope": {
      "command": "node",
      "args": ["/pfad/zu/poliscope-mcp-server/build/index.js"],
      "env": {
        "POLISCOPE_API_KEY": "dein-api-schlüssel"
      }
    }
  }
}
```
Stelle sicher, dass Node.js auf Deinem Computer installiert ist.

4. Starte Claude Desktop neu, damit die neue Server-Konfiguration geladen wird.
5. Jetzt kannst Du die Poliscope MCP Server Tools in Claude Desktop verwenden.

## Projektaufbau

```
poliscope-mcp-server/
├── src/
│   └── index.ts        # Haupt-Server Code
├── build/               # Kompilierte Dateien
├── package.json
├── tsconfig.json
└── README.md
```

## API-Dokumentation

Die vollständige API-Dokumentation findest Du unter [Poliscope API Docs](https://api.poliscope.de/v1/docs/).

## Lizenz

MIT