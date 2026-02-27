import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const base = import.meta.env.BASE_URL;

    this.load.spritesheet(
      'tiles_biolab',
      `${base}assets/tilesets/alien_biolab_tileset.png`,
      { frameWidth: 16, frameHeight: 16 }
    );
  }

  create() {
    this.createTextures();
    this.scene.start('GameScene');
  }

  createTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.clear();
    g.fillStyle(0x8bcf7b, 1);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x5b9450, 1);
    g.fillRect(0, 10, 16, 6);
    g.generateTexture('player', 16, 16);

    g.clear();
    g.fillStyle(0xd95d39, 1);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x9d3e25, 1);
    g.fillRect(0, 12, 16, 4);
    g.generateTexture('enemy', 16, 16);

    g.clear();
    g.fillStyle(0xf2e86d, 1);
    g.fillRect(0, 0, 6, 3);
    g.generateTexture('bullet', 6, 3);

    g.clear();
    g.fillStyle(0x9a6bff, 1);
    g.fillRect(0, 0, 12, 12);
    g.fillStyle(0xcfb8ff, 1);
    g.fillRect(3, 3, 6, 6);
    g.generateTexture('dash-pickup', 12, 12);

    g.clear();
    g.fillStyle(0x4dd0e1, 1);
    g.fillRect(0, 0, 12, 12);
    g.fillStyle(0xb2ebf2, 1);
    g.fillRect(2, 2, 8, 8);
    g.generateTexture('item-pickup', 12, 12);
  }
}
