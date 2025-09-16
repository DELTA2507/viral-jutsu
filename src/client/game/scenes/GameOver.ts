import { GameObjects, Scene } from 'phaser';

export class GameOver extends Scene {
  background: Phaser.GameObjects.Image | null = null;
  gameover_text: Phaser.GameObjects.Text | null = null;
  stats_text: Phaser.GameObjects.Text | null = null;
  confirmBtn: GameObjects.Container | null = null;

  private finalStats: any;

  constructor() {
    super('GameOver');
  }

  init(data: any) {
    this.finalStats = data;
  }

  create() {
    const { width, height } = this.scale;

    // Dark background
    this.background = this.add.image(width / 2, height / 2, 'background')
      .setOrigin(0.5)
      .setAlpha(0.5);

    // Semi-transparent overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    // Game Over text
    this.gameover_text = this.add.text(width / 2, height / 2 - 120, 'Game Over', {
      fontFamily: 'Helvetica',
      fontSize: '64px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center',
    })
    .setOrigin(0.5)
    .setAlpha(0);

    this.tweens.add({
      targets: this.gameover_text,
      alpha: 1,
      ease: 'Power2',
      duration: 800,
      delay: 0,
    });

    // Stats text
    const stats = this.scene.settings.data as {
      points: number;
      time: number;
      combo_time: number;
      objects_cut: number;
    };

    const statsString =
      `Points: ${stats.points}\n` +
      `Time: ${stats.time}\n` +
      `Combo Time: ${stats.combo_time}\n` +
      `Objects Cut: ${stats.objects_cut}`;

    this.stats_text = this.add.text(width / 2, height / 2, statsString, {
      fontFamily: 'Helvetica',
      fontSize: '28px',
      color: '#d562ffff',
      align: 'left',
      stroke: '#000000',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setAlpha(0);

    this.tweens.add({
      targets: this.stats_text,
      alpha: 1,
      ease: 'Power2',
      duration: 800,
      delay: 1000, // aparece después del "Game Over"
    });

    // Confirm button usando createButton
    this.confirmBtn = this.createButton('Confirm', 0.8, false, () => {
      this.scene.start('MainMenu');
    });
    this.confirmBtn.setAlpha(0);

    this.tweens.add({
      targets: this.confirmBtn,
      alpha: 1,
      ease: 'Power2',
      duration: 800,
      delay: 1800, // aparece después de stats
    });

    // Responsive layout
    this.updateLayout(width, height);
    this.scale.on('resize', ({ width, height }: { width: number; height: number }) =>
      this.updateLayout(width, height)
    );
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

  private createButton(
    text: string,
    yPercent: number,
    alt: boolean = false,
    onClick: () => void,
    fixedWidth: number = 250,
    fixedHeight: number = 60
  ): GameObjects.Container {
    const { width, height } = this.scale;
    const baseFontSize = 20;

    const container = this.add.container(width / 2, height * yPercent);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Helvetica',
      fontSize: `${baseFontSize}px`,
      color: alt ? '#000000' : '#ffffff',
      align: 'center',
      stroke: alt ? '#ffffff' : '#000000',
      strokeThickness: 3,
    })
    .setOrigin(0.5);

    let btnWidth = fixedWidth;
    let btnHeight = fixedHeight;

    let bgColor = alt ? 0xffffff : 0x330066;
    let borderColor = alt ? 0x330066 : 0x000000;
    let hoverColor = alt ? 0x222222 : 0x6600cc;

    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, bgColor, 1)
      .setStrokeStyle(3, borderColor)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        bg.setFillStyle(hoverColor);
        if (alt) label.setColor('#ffffff').setStroke('#000000', 3);
      })
      .on('pointerout', () => {
        bg.setFillStyle(bgColor);
        if (alt) label.setColor('#000000').setStroke('#ffffff', 3);
      })
      .on('pointerdown', () => {
        const soundActive = this.registry.get('SoundActive');
        if (soundActive) {
            const uiButtonSounds = this.registry.get('cuts_defaultSounds') || [];
            if (uiButtonSounds.length) {
                const soundKey = uiButtonSounds[Phaser.Math.Between(0, uiButtonSounds.length - 1)];
                this.sound.play(soundKey);
            }
        }
        onClick();
      });

    (container as any).bg = bg;
    (container as any).label = label;

    container.add([bg, label]);
    return container;
  }
}