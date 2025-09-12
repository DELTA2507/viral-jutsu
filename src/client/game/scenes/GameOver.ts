import { Scene } from 'phaser';

export class GameOver extends Scene {
  background: Phaser.GameObjects.Image | null = null;
  gameover_text: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('GameOver');
  }

  create() {
    const { width, height } = this.scale;

    // Dark background
    this.background = this.add.image(width / 2, height / 2, 'background')
      .setOrigin(0.5)
      .setAlpha(0.5);

    // Semi-transparent overlay for contrast
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    // Game Over text
    this.gameover_text = this.add.text(width / 2, height / 2 + 30, 'Game Over', {
      fontFamily: 'Helvetica',
      fontSize: '64px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center',
    })
    .setOrigin(0.5)
    .setAlpha(0); // start invisible

    this.tweens.add({
      targets: this.gameover_text,
      y: height / 2,      // move to final position
      alpha: 1,           // fade in
      ease: 'Power2',
      duration: 800,
    });

    // Responsive layout
    this.updateLayout(width, height);
    this.scale.on('resize', ({ width, height }: { width: number; height: number }) => this.updateLayout(width, height));

    // Return to Main Menu on click
    this.input.once('pointerdown', () => this.scene.start('MainMenu'));
  }

  private updateLayout(width: number, height: number) {
    this.cameras.resize(width, height);

    if (this.background) {
      const scale = Math.max(width / this.background.width, height / this.background.height);
      this.background.setPosition(width / 2, height / 2).setScale(scale);
    }

    if (this.gameover_text) {
      const scaleFactor = Math.min(width / 1024, height / 768, 1);
      this.gameover_text.setScale(scaleFactor);
    }
  }
}