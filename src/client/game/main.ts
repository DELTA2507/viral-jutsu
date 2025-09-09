import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { Leaderboard } from './scenes/Leaderboard';
import { Preloader } from './scenes/Preloader';
import { AUTO, Game } from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768,
  },
  scene: [Boot, Preloader, MainMenu, Leaderboard, MainGame, GameOver],
};

const StartGame = (parent: string) => {
  const phaserGame = new Game({
    ...config,
    parent,
  });

  return phaserGame;
};

export default StartGame;