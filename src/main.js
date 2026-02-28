import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },
  input: {
    keyboard: true,
    gamepad: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 640,
    height: 360
  },
  pixelArt: true,
  roundPixels: true,
  scene: [BootScene, GameScene]
};

new Phaser.Game(config);
