import { Scene } from 'phaser';

interface GameEntity {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  rotationSpeed: number;
  radius: number; // agrega esto
  type: 'good' | 'bad';
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
  
  constructor() {
    super('Game');
  }
  
  private isCutting: boolean = false;
  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x222222);
    this.background = this.add.image(512, 384, 'background');

    // Activar cutting
    this.input.on('pointerdown', () => {
        this.isCutting = true;
    });

    this.input.on('pointerup', () => {
        this.isCutting = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isCutting) return;

      const px = pointer.x;
      const py = pointer.y;

      for (let i = this.entities.length - 1; i >= 0; i--) {
        const e = this.entities[i];
        if (!e) continue;
        const dx = e.sprite.x - px;
        const dy = e.sprite.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < e.radius) {
          e.sprite.destroy();
          this.entities.splice(i, 1);

          if (e.type === 'good') {
              this.pointsCount++;
              this.updatePointsCountText();
          } else {
              this.failsCount++;
              this.updateFailsCountText();
              if (this.failsCount >= 3) this.scene.start('GameOver');
              break;
          }
        }
      }
    });

    this.pointsCountText = this.add
      .text(512, 340, `Points: ${this.pointsCount}`, {
        fontFamily: 'Arial Black',
        fontSize: 25,
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0, 0);

    this.failsCountText = this.add
      .text(512, 400, `Fails: ${this.failsCount}`, {
        fontFamily: 'Arial Black',
        fontSize: 25,
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(1, 0);

    this.goButton = this.add
      .text(this.scale.width / 2, this.scale.height * 0.75, 'Game Over', {
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
      .on('pointerdown', () => this.scene.start('GameOver'));

    this.updateLayout(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.updateLayout(gameSize.width, gameSize.height);
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

      // gravedad
      e.vy += 800 * dt; 

      // mover
      e.sprite.x += e.vx * dt;

      // para arco más natural, agregamos un pequeño oscilador horizontal o vertical
      const arcAmplitude = 50; // altura extra para curvar la caída
      e.sprite.y += e.vy * dt - Math.sin(e.vx * 0.01) * arcAmplitude * dt;

      e.sprite.rotation += e.rotationSpeed * dt;

      if (e.sprite.y > this.scale.height + 50 || e.sprite.x < -50 || e.sprite.x > this.scale.width + 50) {
          e.sprite.destroy();
          this.entities.splice(i, 1);
      }
    }
  }

  spawnEntity(width: number, height: number) {
    const radius = Phaser.Math.Between(20, 40);
    const x = Phaser.Math.Between(radius, width - radius);
    const y = height + radius;

    const rand = Math.random();
    const type: 'good' | 'bad' = rand < 0.8 ? 'good' : 'bad';

    const subredditIcons: string[] = this.registry.get('subredditsIcons') || [];
    const memeIcons: string[] = this.registry.get('memesIcons') || [];
    const hazardIcons: string[] = this.registry.get('hazardsIcons') || [];

    let iconArray: string[];
    if (type === 'good') {
      // Mezclamos memes y subreddits
      iconArray = subredditIcons.concat(memeIcons);
    } else {
      iconArray = hazardIcons;
    }

    if (iconArray.length === 0) return;

    const key = iconArray[Phaser.Math.Between(0, iconArray.length - 1)];
    if (!key) return;
    const sprite = this.add.image(x, y, key).setDisplaySize(radius*2, radius*2);

    const hMax = Phaser.Math.Between(150, 300);
    const g = 800;
    const vy = -Math.sqrt(2 * g * hMax);
    const vx = Phaser.Math.Between(-100, 100);

    const entity: GameEntity = { sprite, vx, vy, rotationSpeed: Phaser.Math.FloatBetween(-5, 5), type, radius };

    sprite.on('pointerdown', () => {
      sprite.destroy();
      const index = this.entities.indexOf(entity);
      if (index >= 0) {
        this.entities.splice(index, 1);
        if (entity.type === 'good') {
          this.pointsCount++;
          this.updatePointsCountText();
        } else {
          this.failsCount++;
          this.updateFailsCountText();
          if (this.failsCount >= 3) this.scene.start('GameOver');
        }
      }
    });

    this.entities.push(entity);
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

  updatePointsCountText() {
    this.pointsCountText.setText(`Points: ${this.pointsCount}`);
  }

  updateFailsCountText() {
    this.failsCountText.setText(`Fails: ${this.failsCount}`);
  }
}