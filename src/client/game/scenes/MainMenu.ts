import { Scene, GameObjects } from 'phaser';
import { challenges } from '../../../shared/config/daily_challenges';

export class MainMenu extends Scene {
  private dailyChallengeContainer: Phaser.GameObjects.Container | null = null;
  private dailyChallengeTimerEvent?: Phaser.Time.TimerEvent;

  background: GameObjects.Image | null = null;
  logo: GameObjects.Image | null = null;
  title: GameObjects.Text | null = null;
  playBtn: GameObjects.Container | null = null;
  leaderboardBtn: GameObjects.Container | null = null;
  DailyChallengeBtn: GameObjects.Container | null = null;
  tutorialBtn: GameObjects.Container | null = null;

  constructor() {
    super('MainMenu');
  }

  init(): void {
    this.background = null;
    this.logo = null;
    this.title = null;
    this.leaderboardBtn = null;
    this.playBtn = null;
    this.DailyChallengeBtn = null;
    this.tutorialBtn = null;
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
        const uiButtonSounds = this.registry.get('cuts_defaultSounds') || [];
        if (uiButtonSounds.length) {
          const soundKey = uiButtonSounds[Phaser.Math.Between(0, uiButtonSounds.length - 1)];
          this.sound.play(soundKey);
        }
        onClick();
      });

    (container as any).bg = bg;
    (container as any).label = label;

    container.add([bg, label]);
    return container;
  }

  create() {
    this.refreshLayout();
    this.scale.on('resize', () => this.refreshLayout());

    // replace old text buttons with container buttons
    this.DailyChallengeBtn = this.createButton('⚔️ Try Daily Challenge', 0, true, () => this.scene.start('Ranked'));
    this.playBtn = this.createButton('🕹️ Start Game', 0, false, () => this.scene.start('Casual'));
    this.leaderboardBtn = this.createButton('🏆 Leaderboard', 0, false, () => this.scene.start('Leaderboard'));
    this.tutorialBtn = this.createButton('💡 Tutorial', 0, false, () => this.scene.start('Tutorial'));

    this.layoutButtonsVertically([this.DailyChallengeBtn, this.playBtn, this.leaderboardBtn, this.tutorialBtn], 0.5, 0.13);
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

    const buttons = [this.DailyChallengeBtn, this.playBtn, this.leaderboardBtn, this.tutorialBtn].filter(Boolean) as GameObjects.Container[];

    buttons.forEach((btn: Phaser.GameObjects.Container) => {
      const bg = btn.getByName('bg') as Phaser.GameObjects.Rectangle;
      if (bg) {
        bg.setSize(250, 60);
      }
    });

    this.showDailyChallenge();

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

  private showDailyChallenge(): void {
    if (this.dailyChallengeContainer) this.dailyChallengeContainer.destroy();
    if (this.dailyChallengeTimerEvent) this.dailyChallengeTimerEvent.destroy();

    const { width, height } = this.scale;
    const today = new Date().getDay(); 
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
    const dayKey = dayKeys[today] as keyof typeof challenges;
    const challenge = challenges[dayKey];

    const containerY = height * 0.13;
    const containerScale = Phaser.Math.Clamp(height / 768, 0.9, 1.1);
    const container = this.add.container(width / 2, containerY).setScale(containerScale);

    const bg = this.add.rectangle(0, 0, 400, 140, 0x000000, 0.5)
      .setOrigin(0.5)
      .setStrokeStyle(3, 0xffffff);

    let nameText = this.add.text(0, -35, `⚔️ ${challenge?.name ?? 'No Challenge'}`, {
      fontFamily: 'Helvetica',
      fontSize: '28px',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    let descText = this.add.text(0, 0, challenge?.description ?? 'No daily challenge available.', {
      fontFamily: 'Helvetica',
      fontSize: '18px',
      color: '#ffffaa',
      align: 'center',
      wordWrap: { width: 360 }
    }).setOrigin(0.5);

    const timerText = this.add.text(0, 45, '', {
      fontFamily: 'Helvetica',
      fontSize: '20px',
      color: '#ff5555',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const updateTimer = () => {
      const now = new Date();
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);
      const diff = nextMidnight.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      timerText.setText(`⏱️ ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')} left`);
    };

    updateTimer();
    this.dailyChallengeTimerEvent = this.time.addEvent({
      delay: 1000,
      callback: updateTimer,
      loop: true
    });

    container.add([bg, nameText, descText, timerText]);
    this.dailyChallengeContainer = container;
  }
}