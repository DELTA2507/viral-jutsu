import { Scene } from 'phaser';

interface GameEntity {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  rotationSpeed: number;
  radius: number;
  type: 'good' | 'bad' | 'powerUp';
}

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  pointsCount = 0;
  pointsCountText: Phaser.GameObjects.Text;
  failsCount = 0;
  failsCountText: Phaser.GameObjects.Text;
  goButton: Phaser.GameObjects.Text;

  entities: GameEntity[] = [];
  spawnTimer = 0;
  private isCutting = false;
  trail: Phaser.GameObjects.Graphics;
  trailLine: { x: number; y: number }[] = [];

  // --- Boost: spatial quadtree ---
  private entityGrid: Map<string, GameEntity[]> = new Map();
  private cellSize = 100;

  constructor() { super('Game'); }

  create() {
    this.setupCameraAndBackground();
    this.setupUI();
    this.setupInput();
    this.updateLayout(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.updateLayout(gameSize.width, gameSize.height);
    });
  }

  // --- SETUP ---
  private setupCameraAndBackground() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x222222);
    this.background = this.add.image(this.scale.width / 2, this.scale.height / 2, 'background').setOrigin(0.5);
    this.trail = this.add.graphics();
  }

  private setupUI() {
    const textStyle = { fontFamily: 'Arial Black', fontSize: 25, color: '#ffd700', stroke: '#000', strokeThickness: 5 };
    this.pointsCountText = this.add.text(20, 20, `Points: ${this.pointsCount}`, textStyle);
    this.failsCountText = this.add.text(20, 60, `Fails: ${this.failsCount}`, textStyle);

    this.goButton = this.add.text(this.scale.width / 2, this.scale.height * 0.75, 'Game Over', {
      fontFamily: 'Arial Black', fontSize: 36, color: '#fff', backgroundColor: '#444', padding: { x: 25, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.goButton.setStyle({ backgroundColor: '#555' }))
      .on('pointerout', () => this.goButton.setStyle({ backgroundColor: '#444' }))
      .on('pointerdown', () => this.restartGame());
  }

  private setupInput() {
    this.input.on('pointerdown', () => (this.isCutting = true));
    this.input.on('pointerup', () => { this.isCutting = false; this.trail.clear(); this.trailLine = []; });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isCutting) return;
      this.updateTrail(pointer.x, pointer.y);
      this.checkCutEntities(pointer.x, pointer.y);
    });
  }

  private restartGame() { this.pointsCount = 0; this.failsCount = 0; this.updatePointsCountText(); this.updateFailsCountText(); this.scene.start('GameOver'); }

  // --- TRAIL & CUT ---
  private updateTrail(x: number, y: number) {
    this.trailLine.push({ x, y });
    if (this.trailLine.length > 10) this.trailLine.shift();
    this.trail.clear();
    this.trail.lineStyle(4, 0x00ff00, 1);
    for (let i = 1; i < this.trailLine.length; i++) {
      const prev = this.trailLine[i - 1]; const curr = this.trailLine[i];
      if (prev && curr) { this.trail.moveTo(prev.x, prev.y); this.trail.lineTo(curr.x, curr.y); }
    }
    this.trail.strokePath();
  }

  // --- Boost: quadtree check ---
  private getCellKey(x: number, y: number) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  private addEntityToGrid(e: GameEntity) {
    const key = this.getCellKey(e.sprite.x, e.sprite.y);
    if (!this.entityGrid.has(key)) this.entityGrid.set(key, []);
    (this.entityGrid.get(key)!).push(e);
  }

  private removeEntityFromGrid(e: GameEntity) {
    const key = this.getCellKey(e.sprite.x, e.sprite.y);
    const arr = this.entityGrid.get(key);
    if (!arr) return;
    const idx = arr.indexOf(e);
    if (idx >= 0) arr.splice(idx, 1);
  }

  private updateEntityGridPosition(e: GameEntity) {
    const oldKey = this.getCellKey(e.sprite.x - e.vx, e.sprite.y - e.vy);
    const newKey = this.getCellKey(e.sprite.x, e.sprite.y);
    if (oldKey !== newKey) { this.removeEntityFromGrid(e); this.addEntityToGrid(e); }
  }

  private checkCutEntities(px: number, py: number) {
    const keysToCheck = [
      this.getCellKey(px, py),
      this.getCellKey(px + this.cellSize, py),
      this.getCellKey(px - this.cellSize, py),
      this.getCellKey(px, py + this.cellSize),
      this.getCellKey(px, py - this.cellSize),
    ];

    for (const key of keysToCheck) {
      const arr = this.entityGrid.get(key);
      if (!arr) continue;
      // make a copy of the array so we can safely remove while iterating
      for (const e of [...arr]) {
        const dx = e.sprite.x - px;
        const dy = e.sprite.y - py;
        if (Math.sqrt(dx * dx + dy * dy) < e.radius) {
          this.removeEntityFromGrid(e); // remove before cutting
          this.cutEntity(e);
          return; // stop immediately, only cut one entity per move
        }
      }
    }
  }

private cutEntity(e: GameEntity) {
  if ((e as any).cut) return; // prevent multiple cuts
  (e as any).cut = true;
  const sprite = e.sprite;
  const w = sprite.displayWidth / 2;
  const h = sprite.displayHeight;

  const leftHalf = this.add.image(sprite.x - w / 2, sprite.y, sprite.texture.key)
    .setDisplaySize(w, h).setOrigin(0.5);
  const rightHalf = this.add.image(sprite.x + w / 2, sprite.y, sprite.texture.key)
    .setDisplaySize(w, h).setOrigin(0.5);

  this.tweens.add({ targets: leftHalf, x: leftHalf.x - 50, y: leftHalf.y - 100, angle: -45, alpha: 0, duration: 500, onComplete: () => leftHalf.destroy() });
  this.tweens.add({ targets: rightHalf, x: rightHalf.x + 50, y: rightHalf.y - 100, angle: 45, alpha: 0, duration: 500, onComplete: () => rightHalf.destroy() });

  sprite.destroy();
  this.removeEntityFromGrid(e);
  const index = this.entities.indexOf(e);
  if (index >= 0) this.entities.splice(index, 1);

  // --- POINTS / FAILS ---
  if (e.type === 'good') { 
    this.pointsCount++; 
    this.updatePointsCountText(); 
  } else { 
    this.failsCount++; 
    this.updateFailsCountText(); 
    if (this.failsCount >= 3) this.restartGame(); 
  }

  // --- PLAY CUT SOUND ---
  let cutCategory = 'default';
  if (e.type === 'bad') cutCategory = 'hazard';
  if (e.type === 'powerUp') cutCategory = 'powerUp';

  const cutSounds = this.registry.get(`cuts_${cutCategory}Sounds`) || [];
  if (cutSounds.length) {
    const soundKey = cutSounds[Phaser.Math.Between(0, cutSounds.length - 1)];
    this.sound.play(soundKey);
  }
}

  // --- UPDATE LOOP ---
  override update(_time: number, delta: number) {
    const dt = delta / 1000; const { width, height } = this.scale;
    this.spawnTimer += dt;
    if (this.spawnTimer > 1.5) { this.spawnTimer = 0; this.spawnEntity(width, height); }

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i]; if (!e) continue;
      e.vy += 800 * dt; e.sprite.x += e.vx * dt; e.sprite.y += e.vy * dt - Math.sin(e.vx * 0.01) * 50 * dt;
      e.sprite.rotation += e.rotationSpeed * dt;
      this.updateEntityGridPosition(e);

      if (e.sprite.y > height + 50 || e.sprite.x < -50 || e.sprite.x > width + 50) {
        this.removeEntityFromGrid(e); e.sprite.destroy(); this.entities.splice(i, 1);
      }
    }
  }

  // --- ENTITY SPAWN ---
  spawnEntity(width: number, height: number) {
    const radius = Phaser.Math.Between(40, 60);
    const x = Phaser.Math.Between(radius, width - radius); const y = height + radius;
    const type: 'good' | 'bad' = Math.random() < 0.8 ? 'good' : 'bad';

    // --- load icons from registry ---
    const subredditIcons: string[] = this.registry.get('subredditsIcons') || [];
    const memeIcons: string[] = this.registry.get('memesIcons') || [];
    const hazardIcons: string[] = this.registry.get('hazardsIcons') || [];

    // --load sounds from registry ---
    const effects: Record<string, string[]> = this.registry.get('effectsSounds') || {};

    const iconArray = type === 'good' ? subredditIcons.concat(memeIcons) : hazardIcons;
    if (!iconArray.length) return;

    const key = iconArray[Phaser.Math.Between(0, iconArray.length - 1)]; if (!key) return;
    const scaleFactor = this.getResponsiveScale(width);

    const sprite = this.add.image(x, y, key).setDisplaySize(radius * 2 * scaleFactor, radius * 2 * scaleFactor).setInteractive({ useHandCursor: true }).setAlpha(1);
    const entity: GameEntity = { 
      sprite, vx: Phaser.Math.Between(-100, 100), 
      vy: -Math.sqrt(2 * 600 * Phaser.Math.Between(300, 500)),
      rotationSpeed: Phaser.Math.FloatBetween(-5, 5), 
      type, 
      radius: sprite.displayWidth / 2 };
    sprite.on('pointerdown', () => this.cutEntity(entity));
    this.addEntityBorder(entity);
    this.entities.push(entity);
    this.addEntityToGrid(entity);

    // pick a jump sound if it exists
    const jumpSounds = effects['jump'] || [];
    if (jumpSounds.length) {
      const soundKey = jumpSounds[Phaser.Math.Between(0, jumpSounds.length - 1)];
      if (typeof soundKey === 'string') {
        this.sound.play(soundKey);
      }
    }
  }

  private addEntityBorder(entity: GameEntity) {
    const color = entity.type === 'bad' ? 0xff0000 : entity.type === 'powerUp' ? 0x00ff00 : 0xffff00;
    const border = this.add.graphics();
    border.lineStyle(5, color, 1);
    border.strokeCircle(entity.sprite.x, entity.sprite.y, entity.radius);
    
    // Make it follow the sprite
    entity.sprite.on('destroy', () => border.destroy());
    this.events.on('update', () => {
      if (entity.sprite.active) {
        border.setPosition(0, 0);
        border.clear();
        border.lineStyle(4, color, 1);
        border.strokeCircle(entity.sprite.x, entity.sprite.y, entity.radius);
      }
    });
  }


  // --- UI & LAYOUT ---
  updateLayout(width: number, height: number) {
    this.cameras.resize(width, height);
    if (this.background) { this.background.setPosition(width / 2, height / 2); const scale = Math.max(width / this.background.width, height / this.background.height); this.background.setScale(scale); }
    this.goButton.setPosition(width / 2, height * 0.75).setScale(Math.min(Math.min(width / 1024, height / 768), 1));
  }

  private getResponsiveScale(width: number) { if (width < 600) return 0.8; if (width < 1200) return 1.2; return 1.6; }
  updatePointsCountText() { this.pointsCountText.setText(`Points: ${this.pointsCount}`); }
  updateFailsCountText() { this.failsCountText.setText(`Fails: ${this.failsCount}`); }
}