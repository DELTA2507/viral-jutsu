import { Scene, GameObjects } from 'phaser';

export class MainMenu extends Scene {
  background: GameObjects.Image | null = null;
  logo: GameObjects.Image | null = null;
  title: GameObjects.Text | null = null;

  constructor() {
    super('MainMenu');
  }

  /**
   * Reset cached GameObject references every time the scene starts.
   * The same Scene instance is reused by Phaser, so we must ensure
   * stale (destroyed) objects are cleared out when the scene restarts.
   */
  init(): void {
    this.background = null;
    this.logo = null;
    this.title = null;
  }

  create() {
    this.refreshLayout();

    // Re-calculate positions whenever the game canvas is resized (e.g. orientation change).
    this.scale.on('resize', () => this.refreshLayout());

    const baseFontSize = 38;
    if (!this.title) {
      this.title = this.add
        .text(0, 0, 'Iniciar Juego', {
          fontFamily: 'Arial Black',
          fontSize: `${baseFontSize}px`,
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 8,
          align: 'center',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true }) // <— make it clickable
        .on('pointerover', () => this.title!.setStyle({ color: '#ffd700' }))
        .on('pointerout', () => this.title!.setStyle({ color: '#ffffff' }))
        .once('pointerdown', () => this.scene.start('Game')); // only clicks on this text
    }
  }

  /**
   * Positions and (lightly) scales all UI elements based on the current game size.
   * Call this from create() and from any resize events.
   */
  private refreshLayout(): void {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);

    // Background
    if (!this.background) {
      this.background = this.add.image(width / 2, height / 2, 'background').setOrigin(0.5);
    }
    const bgScale = Math.max(width / this.background.width, height / this.background.height);
    this.background.setScale(bgScale).setPosition(width / 2, height / 2);

    // Logo
    const scaleFactor = Math.min(width / 1024, height / 768);
    if (!this.logo) {
      this.logo = this.add.image(0, 0, 'logo');
    }
    this.logo.setPosition(width / 2, height * 0.38).setScale(scaleFactor);

    // Title text – create once
    if (!this.title) {
      const baseFontSize = 38;
      this.title = this.add.text(0, 0, 'Iniciar Juego', {
        fontFamily: 'Arial Black',
        fontSize: `${baseFontSize}px`,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.title!.setStyle({ color: '#ffd700' }))
      .on('pointerout', () => this.title!.setStyle({ color: '#ffffff' }))
      .once('pointerdown', () => this.scene.start('Game'));
    }

    this.title.setPosition(width / 2, height * 0.6);

    // Important: don't scale the text! Scale its font instead
    // this.title.setScale(scaleFactor);  <-- remove this
  }
}
