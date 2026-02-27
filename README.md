# Phaser 3 Metroidvania Lite (Data-Driven Rooms)

Dieses Projekt ist ein Phaser-3-Browser-Game mit datengetriebenem Room-System. Räume sind als einzelne Dateien definiert und werden über einen `RoomLoader` geladen.

## Highlights

- npm + Vite Projekt (`npm install`, `npm run dev`)
- Responsives Canvas-Scaling (`Phaser.Scale.RESIZE`)
- Pixel-Art-freundlich (`pixelArt`, `roundPixels`)
- Data-driven Room-System (Datei pro Room)
- RoomLoader mit:
  - Kollisionstiles
  - Kamera-/Welt-Bounds
  - Spawnpoint-Handling
  - Tür-Triggern inkl. kurzem Fade
- Persistenter `GameState`:
  - gefundene Items/Upgrades
  - Ammo (`missile`, `super`)
  - `suitLevel`
  - besuchte Räume (Minimap-Basis)
- 6 Beispielräume (unterschiedliche Größen/Layouts), Architektur für **50+ Räume**

---

## Projektstruktur

```txt
src/
├─ game/
│  ├─ Enemy.js
│  ├─ GameState.js
│  └─ RoomLoader.js
├─ rooms/
│  ├─ helpers.js
│  ├─ index.js
│  ├─ room_01.js
│  ├─ room_02.js
│  ├─ room_03.js
│  ├─ room_04.js
│  ├─ room_05.js
│  └─ room_06.js
├─ scenes/
│  ├─ BootScene.js
│  └─ GameScene.js
└─ main.js
```

---

## Lokal starten (Windows)

### Voraussetzungen

- Node.js 18+
- npm

### Schritte

```powershell
cd C:\pfad\zu\phaser-metroidvania-lite
npm install
npm run dev
```

Dann im Browser öffnen (normalerweise `http://localhost:5173`).

---

## Controls

- `A/D`: Laufen
- `W` oder `Space`: Springen
- `J`: Schießen
- `Shift`: Dash (nach Unlock)

---

## Wie füge ich neue Räume hinzu?

1. Neue Datei anlegen, z. B. `src/rooms/room_07.js`.
2. Room-Objekt mit dieser Struktur exportieren:

```js
export const room07 = {
  id: 'room_07',
  name: 'Neuer Raum',
  width: 48,
  height: 24,
  collisionGrid: [...],
  decoGrid: [...],
  spawnPoints: {
    start: { tileX: 2, tileY: 18 },
    from_left: { tileX: 2, tileY: 18 }
  },
  doors: [
    {
      id: 'r07_to_r08',
      tileX: 47,
      tileY: 8,
      tileWidth: 1,
      tileHeight: 5,
      targetRoomId: 'room_08',
      targetSpawnId: 'from_left'
    }
  ],
  itemSpawns: [
    { id: 'item_xyz', type: 'missile_pack', tileX: 10, tileY: 10, amount: 5 }
  ],
  enemySpawns: [
    { id: 'enemy_1', type: 'crawler', tileX: 12, tileY: 17, patrolMinTileX: 8, patrolMaxTileX: 16 }
  ]
};
```

3. In `src/rooms/index.js` importieren und zur `ROOM_LIST` hinzufügen.

Das System ist auf `MAX_SUPPORTED_ROOMS = 50` ausgelegt; zusätzliche Räume sind reine Daten-Erweiterungen.

---

## Troubleshooting

### `npm` wird nicht erkannt

Node.js neu installieren und sicherstellen, dass PATH gesetzt ist.

### Schwarzer Bildschirm

- Browser-Konsole (`F12`) prüfen
- `npm install` erneut ausführen
- Hard-Reload (`Strg+F5`)

### Port belegt

```powershell
npm run dev -- --port 5174
```
