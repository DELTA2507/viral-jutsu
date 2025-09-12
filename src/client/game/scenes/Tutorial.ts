import { Scene, GameObjects } from 'phaser';

export class Tutorial extends Scene {
  background: GameObjects.Image | null = null;
  logo: GameObjects.Image | null = null;
  title: GameObjects.Text | null = null;
  playBtn: GameObjects.Container | null = null;
  leaderboardBtn: GameObjects.Container | null = null;
  DailyChallengeBtn: GameObjects.Container | null = null;

  constructor() {
    super('Tutorial');
  }

  init(): void {
    this.background = null;
    this.logo = null;
    this.title = null;
    this.leaderboardBtn = null;
    this.playBtn = null;
    this.DailyChallengeBtn = null;
  }

  private createButton(
    text: string,
    yPercent: number,
    alt: boolean = false,
    onClick: () => void
  ): GameObjects.Container {
    const { width, height } = this.scale;
    const baseFontSize = 20;
    const btnWidth = 180;
    const btnHeight = 50;

    const container = this.add.container(width / 2, height * yPercent);

    let bgColor = alt ? 0x000000 : 0x330066;
    let borderColor = alt ? 0x330066 : 0x000000;
    let hoverColor = alt ? 0x222222 : 0x6600cc;
    let textColor = '#ffffff';

    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, bgColor, 1)
      .setStrokeStyle(3, borderColor)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => bg.setFillStyle(hoverColor))
      .on('pointerout', () => bg.setFillStyle(bgColor));

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Helvetica',
      fontSize: `${baseFontSize}px`,
      color: textColor,
      align: 'center'
    }).setOrigin(0.5);
    container.add([bg, label]);
    return container;
  }

  create() {
    this.refreshLayout();
    this.scale.on('resize', () => this.refreshLayout());

    // replace old text buttons with container buttons
    this.DailyChallengeBtn = this.createButton('Try Daily Challenge', 0, true, () => this.scene.start('Ranked'));
    this.playBtn = this.createButton('Start Game', 0, false, () => this.scene.start('Casual'));
    this.leaderboardBtn = this.createButton('Leaderboard', 0, false, () => this.scene.start('Leaderboard'));

    this.layoutButtonsVertically([this.DailyChallengeBtn, this.playBtn, this.leaderboardBtn], 0.5, 0.13);
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
    if (!this.logo) this.logo = this.add.image(0, 0, 'logo');
    this.logo.setPosition(width / 2, height * 0.35).setScale(scaleFactor);

    // ahora los botones se organizan automáticamente debajo del logo
    const buttons = [this.DailyChallengeBtn, this.playBtn, this.leaderboardBtn].filter(Boolean) as GameObjects.Container[];
    this.layoutButtonsVertically(buttons, 0.5, 0.13);
  }

  override update(_time: number, _delta: number) {
    if (!this.background) return;

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const sineAmplitudeX = 5; // máximo desplazamiento horizontal
    const sineAmplitudeY = 3; // máximo desplazamiento vertical
    const sineSpeedX = 0.002;  // velocidad horizontal
    const sineSpeedY = 0.003;  // velocidad vertical

    this.background.x = centerX + Math.sin(_time * sineSpeedX) * sineAmplitudeX;
    this.background.y = centerY + Math.sin(_time * sineSpeedY) * sineAmplitudeY;
  }

  private layoutButtonsVertically(buttons: GameObjects.Container[], startYPercent = 0.5, spacingPercent = 0.13) {
    const { height } = this.scale;
    buttons.forEach((btn, i) => {
      btn.setPosition(this.scale.width / 2, height * (startYPercent + i * spacingPercent));
    });
  }
}