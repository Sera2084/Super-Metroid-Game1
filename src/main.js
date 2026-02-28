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
      gravity: { y: 800 },
      debug: false,
      tileBias: 32,
      roundPixels: true
    }
  },
  input: {
    keyboard: true,
    gamepad: true
  },
  render: {
    pixelArt: true,
    roundPixels: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 640,
    height: 360
  },
  scene: [BootScene, GameScene]
};

new Phaser.Game(config);
