const STORAGE_KEY = 'phaser_metroidvania_state_v2';

/**
 * Persistenter globaler Spielstand.
 * Enthält Fortschritt (Items/Upgrades), Ressourcen und erkundete Räume.
 */
export class GameState {
  constructor() {
    this.data = {
      foundItems: {},
      upgrades: {
        dash: false
      },
      ammo: {
        missile: 0,
        super: 0
      },
      suitLevel: 1,
      visitedRooms: {}
    };

    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.data = {
        ...this.data,
        ...parsed,
        upgrades: { ...this.data.upgrades, ...(parsed.upgrades ?? {}) },
        ammo: { ...this.data.ammo, ...(parsed.ammo ?? {}) },
        foundItems: { ...(parsed.foundItems ?? {}) },
        visitedRooms: { ...(parsed.visitedRooms ?? {}) }
      };
    } catch {
      // Falls localStorage blockiert ist, läuft das Spiel mit volatilem State weiter.
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // No-op bei nicht verfügbarem Storage.
    }
  }

  markRoomVisited(roomId) {
    this.data.visitedRooms[roomId] = true;
    this.save();
  }

  isRoomVisited(roomId) {
    return Boolean(this.data.visitedRooms[roomId]);
  }

  collectItem(itemId) {
    this.data.foundItems[itemId] = true;
    this.save();
  }

  isItemCollected(itemId) {
    return Boolean(this.data.foundItems[itemId]);
  }

  applyItem(item) {
    if (this.isItemCollected(item.id)) return;

    if (item.type === 'dash_module') {
      this.data.upgrades.dash = true;
    }

    if (item.type === 'missile_pack') {
      this.data.ammo.missile += item.amount ?? 5;
    }

    if (item.type === 'super_pack') {
      this.data.ammo.super += item.amount ?? 1;
    }

    if (item.type === 'suit_upgrade') {
      this.data.suitLevel = Math.max(this.data.suitLevel, item.level ?? this.data.suitLevel);
    }

    this.collectItem(item.id);
  }
}
