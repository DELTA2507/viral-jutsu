import { Scene, GameObjects } from 'phaser';

interface LeaderboardEntry {
  userId: string;
  score: number;
  rank?: number;
  username: string | undefined;
}

export class Leaderboard extends Scene {
  background: GameObjects.Image | null = null;
  uiContainer: GameObjects.Container | null = null;
  title: GameObjects.Text | null = null;
  leaderboardText: GameObjects.Text | null = null;
  backBtn: GameObjects.Text | null = null;

  constructor() {
    super('Leaderboard');
  }

  init(): void {
    this.background = null;
    this.uiContainer = null;
    this.title = null;
    this.leaderboardText = null;
    this.backBtn = null;
  }

  create() {
    const { width, height } = this.scale;

    this.background = this.add.image(width / 2, height / 2, 'background').setOrigin(0.5);
    const bgScale = Math.max(width / this.background.width, height / this.background.height);
    this.background.setScale(bgScale);

    this.uiContainer = this.add.container(width / 2, height / 2);

    this.title = this.add.text(0, -height * 0.4, 'Leaderboard', {
      fontFamily: 'Helvetica',
      fontSize: '42px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.uiContainer.add(this.title);

    // Back button OUTSIDE container
    this.backBtn = this.add.text(width / 2, height * 0.9, 'Volver al menú', {
      fontFamily: 'Helvetica',
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.backBtn!.setStyle({ color: '#ffd700' }))
      .on('pointerout', () => this.backBtn!.setStyle({ color: '#ffffff' }))
      .once('pointerdown', () => this.scene.start('MainMenu'));

    this.scale.on('resize', () => this.onResize());

    this.fetchLeaderboardData();
  }

  private topEntries: GameObjects.GameObject[] = [];
  private renderLeaderboard(top: LeaderboardEntry[], me: LeaderboardEntry | null) {
    if (!this.uiContainer) return;

    // remove only previous top entries
    this.topEntries.forEach(go => go.destroy());
    this.topEntries = [];

    const startY = -this.scale.height * 0.3;
    const spacing = 50;

    top.forEach((entry, i) => {
      const y = startY + i * spacing;

      const bg = this.add.rectangle(0, y, 420, 50, 0xffffff).setOrigin(0.5);
      bg.setStrokeStyle(2, 0xffffff); // borde blanco

      const text = this.add.text(0, y, `${i + 1}. ${entry.username} — ${entry.score}`, {
        fontFamily: 'Helvetica',
        fontSize: '28px',
        color: '#4e0e78ff', // texto morado oscuro
      }).setOrigin(0.5);

      this.uiContainer!.add([bg, text]);
      this.topEntries.push(bg, text);
    });

    // render me always
    if (me) {
      const y = startY + top.length * spacing + 20;
      const bg = this.add.rectangle(0, y, 420, 50, 0xffffff).setOrigin(0.5);
      bg.setStrokeStyle(2, 0xffffff); // borde blanco

      const text = this.add.text(0, y, `${me.rank}. ${me.username} — ${me.score}`, {
        fontFamily: 'Helvetica',
        fontSize: '28px',
        color: '#4e0d3e', // morado oscuro
      }).setOrigin(0.5);

      this.uiContainer.add([bg, text]);
    }
  }

  private async fetchLeaderboardData() {
    try {
      const res = await fetch('/api/leaderboard/top');
      const data = await res.json();

      const top = data.top as LeaderboardEntry[];
      const me = data.me as LeaderboardEntry | null;

      this.renderLeaderboard(top, me);
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    }
  }

  private onResize() {
    const { width, height } = this.scale;

    if (this.background) {
      this.background.setPosition(width / 2, height / 2);
      const bgScale = Math.max(width / this.background.width, height / this.background.height);
      this.background.setScale(bgScale);
    }

    if (this.uiContainer) {
      this.uiContainer.setPosition(width / 2, height / 2);
    }
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
}