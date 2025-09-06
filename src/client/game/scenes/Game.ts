import { Scene } from 'phaser';

interface GameEntity {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  rotationSpeed: number;
  radius: number; // agrega esto
  type: 'good' | 'bad';
  maskGraphics?: Phaser.GameObjects.Graphics;
}

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  pointsCount: number = 0;
  pointsCountText: Phaser.GameObjects.Text;
  failsCount: number = 0;
  failsCountText: Phaser.GameObjects.Text;
  goButton: Phaser.GameObjects.Text;
  
  entities: GameEntity[] = [];
  spawnTimer: number = 0;
  
  private isCutting: boolean = false;
  trail: Phaser.GameObjects.Graphics;
  trailLine: { x: number; y: number }[];

  constructor() {
    super('Game');
  }
  

  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x222222);

    // Background
    this.background = this.add.image(this.scale.width / 2, this.scale.height / 2, 'background').setOrigin(0.5);

    // Trail
    this.trail = this.add.graphics();
    this.trailLine = [];
    this.isCutting = false;

    // Textos
    this.pointsCountText = this.add.text(0, 0, `Points: ${this.pointsCount}`, {
      fontFamily: 'Arial Black',
      fontSize: 25,
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0, 0);

    this.failsCountText = this.add.text(0, 0, `Fails: ${this.failsCount}`, {
      fontFamily: 'Arial Black',
      fontSize: 25,
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0, 0);

    // Botón
    this.goButton = this.add.text(this.scale.width / 2, this.scale.height * 0.75, 'Game Over', {
      fontFamily: 'Arial Black',
      fontSize: 36,
      color: '#ffffff',
      backgroundColor: '#444444',
      padding: { x: 25, y: 12 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.goButton.setStyle({ backgroundColor: '#555555' }))
      .on('pointerout', () => this.goButton.setStyle({ backgroundColor: '#444444' }))
      .on('pointerdown', () => {
        this.pointsCount = 0;
        this.failsCount = 0;
        this.updatePointsCountText();
        this.updateFailsCountText();
        this.scene.start('GameOver');
        this.scene.start('GameOver');
      });

    // Layout inicial
    this.updateLayout(this.scale.width, this.scale.height);

    // Reajustar todo en resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.updateLayout(gameSize.width, gameSize.height);
    });

    // Input Cutting
    this.input.on('pointerdown', () => this.isCutting = true);
    this.input.on('pointerup', () => {
      this.isCutting = false;
      this.trail.clear();
      this.trailLine = [];
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isCutting) return;

      // TRAIL
      this.trailLine.push({ x: pointer.x, y: pointer.y });
      if (this.trailLine.length > 10) this.trailLine.shift();

      this.trail.clear();
      this.trail.lineStyle(4, 0x00ff00, 1); // verde neon
      for (let i = 1; i < this.trailLine.length; i++) {
        const prev = this.trailLine[i - 1];
        const curr = this.trailLine[i];
        if (prev && curr) {
          this.trail.moveTo(prev.x, prev.y);
          this.trail.lineTo(curr.x, curr.y);
        }
      }
      this.trail.strokePath();

      // CUTTING ENTITIES
      const px = pointer.x;
      const py = pointer.y;

      for (let i = this.entities.length - 1; i >= 0; i--) {
        const e = this.entities[i];
        if (!e) continue;
        const dx = e.sprite.x - px;
        const dy = e.sprite.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < e.radius) {
          const sprite = e.sprite;
          const w = sprite.displayWidth / 2;
          const h = sprite.displayHeight;

          const leftHalf = this.add.image(sprite.x - w/2, sprite.y, sprite.texture.key)
            .setDisplaySize(w, h)
            .setOrigin(0.5);

          const rightHalf = this.add.image(sprite.x + w/2, sprite.y, sprite.texture.key)
            .setDisplaySize(w, h)
            .setOrigin(0.5);

          this.tweens.add({
            targets: leftHalf,
            x: leftHalf.x - 50,
            y: leftHalf.y - 100,
            angle: -45,
            alpha: 0,
            duration: 500,
            onComplete: () => leftHalf.destroy()
          });

          this.tweens.add({
            targets: rightHalf,
            x: rightHalf.x + 50,
            y: rightHalf.y - 100,
            angle: 45,
            alpha: 0,
            duration: 500,
            onComplete: () => rightHalf.destroy()
          });

          e.sprite.destroy();
          this.entities.splice(i, 1);

          if (e.type === 'good') {
            this.pointsCount++;
            this.updatePointsCountText();
          } else {
            this.failsCount++;
            this.updateFailsCountText();
            if (this.failsCount >= 3) {
              this.pointsCount = 0;
              this.failsCount = 0;
              this.updatePointsCountText();
              this.updateFailsCountText();
              this.scene.start('GameOver');
            }
          }
          break; // corta solo una entidad por movimiento
        }
      }
    });
  }


  override update(_time: number, delta: number) {
    const dt = delta / 1000;
    const { width, height } = this.scale;

    this.spawnTimer += dt;
    // Spawn más lento: cada 1.5 segundos
    if (this.spawnTimer > 1.5) {
      this.spawnTimer = 0;
      this.spawnEntity(width, height);
    }

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e) continue;

      e.vy += 800 * dt;
      e.sprite.x += e.vx * dt;
      e.sprite.y += e.vy * dt - Math.sin(e.vx * 0.01) * 50 * dt;
      e.sprite.rotation += e.rotationSpeed * dt;

      // mover máscara con sprite
      if ('maskGraphics' in e && e.maskGraphics) {
        e.maskGraphics.x = e.sprite.x;
        e.maskGraphics.y = e.sprite.y;
      }

      if (e.sprite.y > this.scale.height + 50 || e.sprite.x < -50 || e.sprite.x > this.scale.width + 50) {
        if ('maskGraphics' in e && e.maskGraphics) e.maskGraphics.destroy();
        e.sprite.destroy();
        this.entities.splice(i, 1);
      }
    }
  }

  spawnEntity(width: number, height: number) {
    const radius = Phaser.Math.Between(40, 60);
    const x = Phaser.Math.Between(radius, width - radius);
    const y = height + radius;

    const rand = Math.random();
    const type: 'good' | 'bad' = rand < 0.8 ? 'good' : 'bad';

    const subredditIcons: string[] = this.registry.get('subredditsIcons') || [];
    const memeIcons: string[] = this.registry.get('memesIcons') || [];
    const hazardIcons: string[] = this.registry.get('hazardsIcons') || [];

    let iconArray: string[];
    if (type === 'good') {
      iconArray = subredditIcons.concat(memeIcons);
    } else {
      iconArray = hazardIcons;
    }

    if (iconArray.length === 0) return;

    const key = iconArray[Phaser.Math.Between(0, iconArray.length - 1)];
    if (!key) return;

    const scaleFactor = this.getResponsiveScale(width);

    const sprite = this.add.image(x, y, key)
      .setDisplaySize(radius * 2 * scaleFactor, radius * 2 * scaleFactor)
      .setInteractive({ useHandCursor: true })
      .setAlpha(1);

    const entity: GameEntity = {
      sprite,
      vx: Phaser.Math.Between(-100, 100),
      vy: -Math.sqrt(2 * 800 * Phaser.Math.Between(150, 300)),
      rotationSpeed: Phaser.Math.FloatBetween(-5, 5),
      type,
      radius: sprite.displayWidth / 2,
    };

    sprite.on('pointerdown', () => {
      const index = this.entities.indexOf(entity);
      if (index >= 0) this.entities.splice(index, 1);
      this.cutEntity(entity);
    });

    this.entities.push(entity);
  }

  cutEntity(e: GameEntity) {
    const sprite = e.sprite;
    const w = sprite.displayWidth / 2;
    const h = sprite.displayHeight;

    const leftHalf = this.add.image(sprite.x - w/2, sprite.y, sprite.texture.key)
      .setDisplaySize(w, h)
      .setOrigin(0.5);

    const rightHalf = this.add.image(sprite.x + w/2, sprite.y, sprite.texture.key)
      .setDisplaySize(w, h)
      .setOrigin(0.5);

    this.tweens.add({
      targets: leftHalf,
      x: leftHalf.x - 50,
      y: leftHalf.y - 100,
      angle: -45,
      alpha: 0,
      duration: 500,
      onComplete: () => leftHalf.destroy()
    });

    this.tweens.add({
      targets: rightHalf,
      x: rightHalf.x + 50,
      y: rightHalf.y - 100,
      angle: 45,
      alpha: 0,
      duration: 500,
      onComplete: () => rightHalf.destroy()
    });

    sprite.destroy();
    const index = this.entities.indexOf(e);
    if (index >= 0) this.entities.splice(index, 1);

    if (e.type === 'good') {
      this.pointsCount++;
      this.updatePointsCountText();
    } else {
      this.failsCount++;
      this.updateFailsCountText();
      if (this.failsCount >= 3) {
        this.pointsCount = 0;
        this.failsCount = 0;
        this.updatePointsCountText();
        this.updateFailsCountText();
        this.scene.start('GameOver');
      }
    }
  }

  updateLayout(width: number, height: number) {
    this.cameras.resize(width, height);

    if (this.background) {
      this.background.setPosition(width / 2, height / 2);
      const scale = Math.max(width / this.background.width, height / this.background.height);
      this.background.setScale(scale);
    }

    const scaleFactor = Math.min(Math.min(width / 1024, height / 768), 1);

    const margin = 20;
    const spacing = 10; // espacio entre los textos

    if (this.pointsCountText) {
        this.pointsCountText.setOrigin(0, 0); // top-left
        this.pointsCountText.setPosition(margin, margin);
    }

    if (this.failsCountText) {
        this.failsCountText.setOrigin(0, 0); // también top-left
        this.failsCountText.setPosition(
            margin,
            margin + this.pointsCountText.height + spacing
        );
    }

    if (this.goButton) {
      this.goButton.setPosition(width / 2, height * 0.75);
      this.goButton.setScale(scaleFactor);
    }
  }

  private getResponsiveScale(width: number): number {
    if (width < 600) return 0.8;   // mobile
    if (width < 1200) return 1.2;  // tablet
    return 1.6;                    // desktop
  }

  updatePointsCountText() {
    this.pointsCountText.setText(`Points: ${this.pointsCount}`);
  }

  updateFailsCountText() {
    this.failsCountText.setText(`Fails: ${this.failsCount}`);
  }
}