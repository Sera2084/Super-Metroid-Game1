import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0b0f1a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  pixelArt: true,
  roundPixels: true,
  scene: [BootScene, GameScene]
};

new Phaser.Game(config);
