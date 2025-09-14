import { Scene, GameObjects } from 'phaser';

interface TutorialItem {
  key: string;
  title: string;
  description: string;
}

interface TutorialEntity {
  sprite: GameObjects.Image;
  radius: number;
  type: 'good' | 'hazard' | 'powerUp';
  cut?: boolean;
}

export class Tutorial extends Scene {
  private border: Phaser.GameObjects.Graphics | null = null;

  background: GameObjects.Image | null = null;
  logo: GameObjects.Image | null = null;
  title: GameObjects.Text | null = null;
  nextBtn: GameObjects.Container | null = null;
  tutorialItems: TutorialItem[] = [];
  currentIndex = 0;

  spritePreview: GameObjects.Image | null = null;
  textTitle: GameObjects.Text | null = null;
  textDesc: GameObjects.Text | null = null;

  private tutorialEntity: TutorialEntity | null = null;
  private isCutting = false;
  private trail: GameObjects.Graphics;
  private trailLine: { x: number; y: number }[] = [];
  private isPaused: boolean = false;

  constructor() {
    super('Tutorial');
  }

  init() {
    this.background = null;
    this.logo = null;
    this.title = null;
    this.nextBtn = null;
    this.spritePreview = null;
    this.textTitle = null;
    this.textDesc = null;
    this.currentIndex = 0;
    this.tutorialEntity = null;
    this.trailLine = [];
    this.isCutting = false;
  }

  create() {
    const { width, height } = this.scale;

    this.background = this.add.image(width / 2, height / 2, 'background').setOrigin(0.5);
    const bgScale = Math.max(width / this.background.width, height / this.background.height);
    this.background.setScale(bgScale);

    this.logo = this.add.image(width / 2, height * 0.15, 'logo');
    this.logo.setScale(Math.min(width / 1024, height / 768));

    this.title = this.add.text(width / 2, height * 0.25, 'Tutorial', {
      fontFamily: 'Helvetica',
      fontSize: '36px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    const hazardIcons: string[] = this.registry.get('hazardsIcons') || [];
    const powerUpIcons: string[] = this.registry.get('powerUpsIcons') || [];
    const goodIcons: string[] = this.registry.get('subredditsIcons') || [];

    this.tutorialItems = [
      { key: this.getRandom(goodIcons) || '', title: 'Good', description: 'Slice these to gain points and time!' },
      { key: this.getRandom(hazardIcons) || '', title: 'Hazard', description: 'Avoid these, slicing them costs you time and lives!' },
      { key: this.getRandom(powerUpIcons) || '', title: 'Power-Up', description: 'Collect these to activate special abilities!' },
    ];

    this.trail = this.add.graphics();

    this.createTutorialUI();
    this.showItem(0);

    this.input.on('pointerdown', () => this.isCutting = true);
    this.input.on('pointerup', () => { 
      this.isCutting = false; 
      this.trail.clear(); 
      this.trailLine = []; 
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isCutting || !this.tutorialEntity) return;
      this.updateTrail(pointer.x, pointer.y);
      this.checkCutTutorialEntity(pointer.x, pointer.y);
    });

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => {
        this.togglePause(); // si quieres un sonido de pausa
      });
    }
  }

  private getRandom(arr: string[]): string | undefined {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private createTutorialUI() {
    const { width, height } = this.scale;

    this.spritePreview = this.add.image(width / 2, height * 0.5, '');
    this.textTitle = this.add.text(width / 2, height * 0.7, '', {
      fontFamily: 'Helvetica',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.textDesc = this.add.text(width / 2, height * 0.77, '', {
      fontFamily: 'Helvetica',
      fontSize: '20px',
      color: '#ffffaa',
      wordWrap: { width: width * 0.8 },
      align: 'center',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.nextBtn = this.createButton('Next', 0.9, () => {
      this.currentIndex++;
      if (this.currentIndex >= this.tutorialItems.length) {
        this.showPauseTutorial();
      } else {
        this.showItem(this.currentIndex);
      }
    });
  }

  private createButton(text: string, yPercent: number, onClick: () => void): GameObjects.Container {
    const { width, height } = this.scale;
    const container = this.add.container(width / 2, height * yPercent);

    const bg = this.add.rectangle(0, 0, 180, 50, 0x330066)
      .setStrokeStyle(3, 0x000000)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => bg.setFillStyle(0x6600cc))
      .on('pointerout', () => bg.setFillStyle(0x330066));

    const label = this.add.text(0, 0, text, { fontFamily: 'Helvetica', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    container.add([bg, label]);
    return container;
  }

  private showItem(index: number) {
    const item = this.tutorialItems[index];
    if (!item) return;

    if (this.spritePreview && this.spritePreview.active) {
        this.spritePreview.setTexture(item.key).setDisplaySize(100, 100);
    } else {
        const { width, height } = this.scale;
        this.spritePreview = this.add.image(width/2, height*0.5, item.key).setDisplaySize(100, 100);
    }

    this.tutorialEntity = {
        sprite: this.spritePreview,
        radius: 50,
        type: item.title === 'Hazard' ? 'hazard' : item.title === 'Power-Up' ? 'powerUp' : 'good',
        cut: false
    };

    this.textTitle?.setText(item.title);
    this.textDesc?.setText(item.description);

    if (this.border) { this.border.destroy(); this.border = null; }
    const color = item.title === 'Hazard' ? 0xff0000
                : item.title === 'Power-Up' ? 0x00ff00
                : 0xffff00;
    this.border = this.add.graphics();
    this.border.lineStyle(6, color, 1);
    this.border.strokeCircle(this.spritePreview.x, this.spritePreview.y, 50);

    this.trail.clear();
    this.trailLine = [];
  }

  private showPauseTutorial() {
    this.spritePreview?.destroy();
    this.spritePreview = null;

    if (this.border) { this.border.destroy(); this.border = null; }

    this.textTitle?.setText('Pause Tutorial');
    this.textDesc?.setText('Press the SPACEBAR at any time to pause the game!');

    this.nextBtn?.destroy();
    this.nextBtn = this.createButton('Continue', 0.9, () => {
        this.scene.start('Casual');
    });
  }

  private updateTrail(x: number, y: number) {
    this.trailLine.push({ x, y });
    if (this.trailLine.length > 15) this.trailLine.shift();
    this.trail.clear();
    for (let i = 1; i < this.trailLine.length; i++) {
      const prev = this.trailLine[i-1];
      const curr = this.trailLine[i];
      if (!prev || !curr) continue;
      const alpha = i / this.trailLine.length;
      const thickness = 3 + (i / this.trailLine.length) * 2;
      this.trail.lineStyle(thickness, 0xffffff, alpha);
      this.trail.moveTo(prev.x, prev.y);
      this.trail.lineTo(curr.x, curr.y);
    }
    this.trail.strokePath();
  }

  private checkCutTutorialEntity(px: number, py: number) {
    if (!this.tutorialEntity) return;
    const e = this.tutorialEntity;
    const dx = e.sprite.x - px;
    const dy = e.sprite.y - py;
    if (Math.sqrt(dx*dx + dy*dy) < e.radius) {
      this.cutTutorialEntity();
    }
  }

  private cutTutorialEntity() {
    if (!this.tutorialEntity || this.tutorialEntity.cut) return;
    this.tutorialEntity.cut = true;

    const sprite = this.tutorialEntity.sprite;
    const w = sprite.displayWidth / 2;
    const h = sprite.displayHeight;

    const leftHalf = this.add.image(sprite.x - w/2, sprite.y, sprite.texture.key).setDisplaySize(w,h).setOrigin(0.5);
    const rightHalf = this.add.image(sprite.x + w/2, sprite.y, sprite.texture.key).setDisplaySize(w,h).setOrigin(0.5);

    this.tweens.add({ targets: leftHalf, x: leftHalf.x - 50, y: leftHalf.y - 100, angle: -45, alpha: 0, duration: 500, onComplete: () => leftHalf.destroy() });
    this.tweens.add({ targets: rightHalf, x: rightHalf.x + 50, y: rightHalf.y - 100, angle: 45, alpha: 0, duration: 500, onComplete: () => rightHalf.destroy() });

    sprite.destroy();
    if (this.border) {
      this.border.destroy();
      this.border = null;
    }

    let cutCategory;
    switch (this.tutorialEntity.type) {
      case 'hazard': cutCategory = 'hazard'; break;
      case 'powerUp': cutCategory = 'powerUp'; break;
      default: cutCategory = 'default'; break;
    }
    const cutSounds = this.registry.get(`cuts_${cutCategory}Sounds`) || [];
    if (cutSounds.length) {
        const soundKey = cutSounds[Phaser.Math.Between(0, cutSounds.length - 1)];
        this.sound.play(soundKey);
    }
  }

  override update(_time: number) {
    if (!this.background) return;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.background.x = centerX + Math.sin(_time * 0.002) * 5;
    this.background.y = centerY + Math.sin(_time * 0.003) * 3;
  }

  togglePause() {
    if (!this.isPaused) {
      this.isPaused = true;
      this.scene.pause();
      this.scene.launch('PauseMenu', { parentScene: this });
    } else {
      this.isPaused = false;
      this.scene.resume();
    }
  }
}