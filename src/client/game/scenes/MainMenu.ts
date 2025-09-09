import { Scene, GameObjects } from 'phaser';

export class MainMenu extends Scene {
  background: GameObjects.Image | null = null;
  logo: GameObjects.Image | null = null;
  title: GameObjects.Text | null = null;
  playBtn: GameObjects.Container | null = null;
  leaderboardBtn: GameObjects.Container | null = null;

  constructor() {
    super('MainMenu');
  }

  init(): void {
    this.background = null;
    this.logo = null;
    this.title = null;
    this.leaderboardBtn = null;
    this.playBtn = null;
  }

  private createButton(
    text: string,
    yPercent: number,
    onClick: () => void
  ): GameObjects.Container {
    const { width, height } = this.scale;
    const baseFontSize = 20; // smaller, more uniform
    const btnWidth = 150;
    const btnHeight = 50;

    const container = this.add.container(width / 2, height * yPercent);

    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x330066, 1) // dark purple
      .setStrokeStyle(3, 0x000000) // black border
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => bg.setFillStyle(0x6600cc)) // slightly lighter on hover
      .on('pointerout', () => bg.setFillStyle(0x330066)); // back to dark purple

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Helvetica',
      fontSize: `${baseFontSize}px`,
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    container.add([bg, label]);
    return container;
  }

  create() {
    this.refreshLayout();
    this.scale.on('resize', () => this.refreshLayout());

    // replace old text buttons with container buttons
    this.playBtn = this.createButton('Start Game', 0.55, () => this.scene.start('Game'));
    this.leaderboardBtn = this.createButton('Leaderboard', 0.7, () => this.scene.start('Leaderboard'));
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);

    if (!this.background) {
      this.background = this.add.image(width / 2, height / 2, 'background').setOrigin(0.5);
    }
    const bgScale = Math.max(width / this.background.width, height / this.background.height);
    this.background.setScale(bgScale).setPosition(width / 2, height / 2);

    const scaleFactor = Math.min(width / 1024, height / 768);
    if (!this.logo) {
      this.logo = this.add.image(0, 0, 'logo');
    }
    this.logo.setPosition(width / 2, height * 0.38).setScale(scaleFactor);

    if (this.playBtn) this.playBtn.setPosition(width / 2, height * 0.55);
    if (this.leaderboardBtn) this.leaderboardBtn.setPosition(width / 2, height * 0.7);
  }
}