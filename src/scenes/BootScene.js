import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const base = import.meta.env.BASE_URL;

    this.load.image('player_v2_img', `${base}assets/sprites/player_pair.png`);
    this.load.image('player_kneel_img', `${base}assets/sprites/player_pair_knieend.png`);
    this.load.image('enemy1_img', `${base}assets/sprites/enemy1.png`);

    this.load.spritesheet(
      'tiles_biolab',
      `${base}assets/tilesets/alien_biolab_tileset.png`,
      { frameWidth: 16, frameHeight: 16 }
    );
  }

  create() {
    const playerTexture = this.textures.get('player_v2_img');
    const playerImage = playerTexture?.getSourceImage?.();
    if (!playerImage) {
      throw new Error('player_v2_img konnte nicht geladen werden.');
    }
    const playerFrameWidth = Math.floor(playerImage.width / 2);
    const playerFrameHeight = playerImage.height;
    this.textures.addSpriteSheet('player_v2', playerImage, {
      frameWidth: playerFrameWidth,
      frameHeight: playerFrameHeight
    });
    this.textures.remove('player_v2_img');

    const playerKneelTexture = this.textures.get('player_kneel_img');
    const playerKneelImage = playerKneelTexture?.getSourceImage?.();
    if (!playerKneelImage) {
      throw new Error('player_kneel_img konnte nicht geladen werden.');
    }
    const playerKneelFrameWidth = Math.floor(playerKneelImage.width / 2);
    const playerKneelFrameHeight = playerKneelImage.height;
    this.textures.addSpriteSheet('player_kneel', playerKneelImage, {
      frameWidth: playerKneelFrameWidth,
      frameHeight: playerKneelFrameHeight
    });
    this.textures.remove('player_kneel_img');

    const enemyTexture = this.textures.get('enemy1_img');
    const enemyImage = enemyTexture?.getSourceImage?.();
    if (!enemyImage) {
      throw new Error('enemy1_img konnte nicht geladen werden.');
    }
    const frameWidth = Math.floor(enemyImage.width / 2);
    const frameHeight = enemyImage.height;
    this.textures.addSpriteSheet('enemy1', enemyImage, { frameWidth, frameHeight });
    this.textures.remove('enemy1_img');
    this.createTextures();
    this.scene.start('GameScene');
  }

  createTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

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
