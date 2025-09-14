import { Scene } from 'phaser';

interface GameEntity {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  rotationSpeed: number;
  radius: number;
  type: 'good' | 'hazard' | 'powerUp';
  powerUpId?: string; // only for power-ups
}

export class Ranked extends Scene {
  private isPaused = false;

  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  pointsCount = 0;
  pointsCountText: Phaser.GameObjects.Text;
  failsCount = 0;
  failsCountText: Phaser.GameObjects.Text;
  elapsedTime = 0; // acumula tiempo transcurrido
  elapsedTimeText: Phaser.GameObjects.Text;
  objectsCutCount = 0; // total de objetos cortados
  
  entities: GameEntity[] = [];
  spawnTimer = 0;
  powerUpTimer = 0;
  powerUpInterval = 30; // seconds
  private isCutting = false;
  trail: Phaser.GameObjects.Graphics;
  trailLine: { x: number; y: number }[] = [];
  
  comboActiveTime = 0; // tiempo acumulado con combo > 0
  private comboCount = 0; // agregalo al state del Game
  private comboTimer = 0; // para resetear combos después de X segundos
  private comboDuration = 2; // 2 segundos para seguir el combo

  private slowmoActive = false;
  private slowmoFactor = 0.5; // everything moves at 50% speed

  // --- Boost: spatial quadtree ---
  private entityGrid: Map<string, GameEntity[]> = new Map();
  private cellSize = 100;

  constructor() { super('Ranked'); }

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
    const textStyle = { fontFamily: 'Helvetica', fontSize: 25, color: '#ffffffff', stroke: '#000', strokeThickness: 4, shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, stroke: true, fill: true }};
    this.pointsCountText = this.add.text(20, 20, `Points: ${this.pointsCount}`, textStyle);
    this.failsCountText = this.add.text(20, 60, `Fails: ${this.failsCount}`, textStyle);
    this.elapsedTimeText = this.add.text(this.scale.width - 20, 20, `Time: 0`, { ...textStyle, align: 'right' }).setOrigin(1, 0);
  }

  private setupInput() {
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => {
        this.togglePause();
      });
    }
    
    this.input.on('pointerdown', () => (this.isCutting = true));
    this.input.on('pointerup', () => { this.isCutting = false; this.trail.clear(); this.trailLine = []; });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isCutting) return;
      this.updateTrail(pointer.x, pointer.y);
      this.checkCutEntities(pointer.x, pointer.y);
    });
  }

  private async GameOver() {
    const payload = {
      points: this.pointsCount,
      time: this.elapsedTime,
      combo_time: this.comboActiveTime,
      objects_cut: this.objectsCutCount,
    };

    try {
      console.log('Submitting payload:', payload);
      const response = await fetch(`${window.location.origin}/api/leaderboard/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Leaderboard submit failed', response.status, text);
      } else {
        console.log('Score submitted successfully');
      }
    } catch (err) {
      console.error('Failed to submit score', err);
    }

    // 🔹 Reset completo de métricas
    this.pointsCount = 0;
    this.failsCount = 0;
    this.elapsedTime = 0;
    this.comboActiveTime = 0;
    this.objectsCutCount = 0;
    this.comboCount = 0;
    this.comboTimer = 0;

    this.updatePointsCountText();
    this.updateFailsCountText();
    this.scene.start('GameOver');
  }

  // --- TRAIL & CUT ---
  private updateTrail(x: number, y: number) {
    this.trailLine.push({ x, y });
    if (this.trailLine.length > 15) this.trailLine.shift(); // más puntos, línea más fluida
    this.trail.clear();

    for (let i = 1; i < this.trailLine.length; i++) {
        const prev = this.trailLine[i - 1];
        const curr = this.trailLine[i];
        if (!prev || !curr) continue;

        const alpha = i / this.trailLine.length; // fade progresivo
        const thickness = 3 + (i / this.trailLine.length) * 2; // grosor dinámico
        this.trail.lineStyle(thickness, 0xffffff, alpha); // blanco
        this.trail.moveTo(prev.x, prev.y);
        this.trail.lineTo(curr.x, curr.y);
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
    if ((e as any).cut) return;
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

    // --- POINTS / FAILS ONLY FOR NORMAL ENTITIES ---
    if (e.type === 'good') { 
      const basePoints = 10; // puntos por cada good
      this.comboCount++;
      this.comboTimer = this.comboDuration;

      let multiplier = 1 + (this.comboCount - 1) * 0.5; // +50% por combo
      const pointsGained = Math.floor(basePoints * multiplier);

      this.pointsCount += pointsGained;
      this.objectsCutCount++;

      this.updatePointsCountText();
      this.showComboFeedback(`Combo x${multiplier.toFixed(1)}`, e.sprite.x, e.sprite.y - 30, "#ffff00");
    } else if (e.type === 'hazard') {
      this.failsCount++;
      this.comboCount = 0;  // reset combo
      this.updateFailsCountText();
      this.cameras.main.shake(150, 0.02); // 150ms de duración, intensidad 0.02
      if (this.failsCount >= 3) this.GameOver();
    }

    // --- POWER-UP EFFECT ---
    if (e.type === 'powerUp' && e.powerUpId) {
        const powerUpEffects: Record<string, () => void> = {
            'powerUps_0': () => this.activateKunaiStorm(),
            'powerUps_1': () => this.activateShield(),
            'powerUps_2': () => this.activateSlowmo(),
        };
        const effect = powerUpEffects[e.powerUpId];
        if (effect) effect();
    } else {
        let cutCategory;
        switch (e.type) {
          case 'hazard':
            cutCategory = 'hazard';
            break;
          case 'powerUp':
            cutCategory = 'powerUp';
            break;
          default:
            cutCategory = 'default';
            break;
        }
        const cutSounds = this.registry.get(`cuts_${cutCategory}Sounds`) || [];
        if (cutSounds.length) {
            const soundKey = cutSounds[Phaser.Math.Between(0, cutSounds.length - 1)];
            this.sound.play(soundKey);
        }
    }
  }

  // --- UPDATE LOOP ---
  override update(_time: number, delta: number) {
    const dt = delta / 1000; 
    const { width, height } = this.scale;

    // --- COMBO TIMER ---
    if (this.comboCount > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer > 0) {
        this.comboActiveTime += dt; // acumula mientras el combo está vivo
      } else {
        this.comboCount = 0; // se acabó el combo
      }
    }
    this.elapsedTime += dt; // tiempo total transcurrido

    this.elapsedTimeText.setText(`Time: ${Math.floor(this.elapsedTime)}`);
    this.powerUpTimer += dt;

    // --- spawn interval dinámico progresivo ---
    let baseInterval = 3; // spawn inicial cada 3s
    const steps = Math.floor(this.elapsedTime / 10); // cada 10s aumenta la dificultad
    let spawnInterval = baseInterval - steps * 0.2;
    spawnInterval = Phaser.Math.Clamp(spawnInterval, 1.2, 3); // nunca más rápido que 1.2s
    spawnInterval *= this.slowmoActive ? 1 / this.slowmoFactor : 1;

    this.spawnTimer += dt;
    if (this.spawnTimer > spawnInterval) {
      this.spawnTimer = 0;
      const count = Phaser.Math.Between(1, 4);
      for (let i = 0; i < count; i++) this.spawnEntity(width, height);
    }

    if (this.powerUpTimer > this.powerUpInterval) {
      this.powerUpTimer = 0;
      this.spawnPowerUp(width);
    }

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i]; 
      if (!e) continue;

      if (e.type !== 'powerUp') e.vy += 800 * dt * (this.slowmoActive ? this.slowmoFactor : 1);

      e.sprite.x += e.vx * dt;
      e.sprite.y += e.vy * dt * (this.slowmoActive && e.type !== 'powerUp' ? this.slowmoFactor : 1) - 
        (e.type !== 'powerUp' ? Math.sin(e.vx * 0.01) * 50 * dt * (this.slowmoActive ? this.slowmoFactor : 1) : 0);
      e.sprite.rotation += e.rotationSpeed * dt;

      this.updateEntityGridPosition(e);

      if (e.sprite.y > height + 50 || e.sprite.x < -50 || e.sprite.x > width + 50) {
        if (e.type === 'good') {
            this.failsCount++;
            this.comboCount = 0;
            this.updateFailsCountText();
            if (this.failsCount >= 3) this.GameOver();
        }

        this.removeEntityFromGrid(e);
        e.sprite.destroy();
        this.entities.splice(i, 1);
      }
    }
  }

  spawnPowerUp(width: number) {
    const powerUpIcons: string[] = this.registry.get('powerUpsIcons') || [];
    if (!powerUpIcons.length) return;

    const key = powerUpIcons[Phaser.Math.Between(0, powerUpIcons.length - 1)];
    const x = Phaser.Math.Between(50, width - 50);
    const y = -50; // start above screen
    if (!key) return;
    const sprite = this.add.image(x, y, key)
      .setDisplaySize(60, 60) // adjust as needed
      .setInteractive({ useHandCursor: true });

    const entity: GameEntity = {
      sprite,
      vx: 0,
      vy: Phaser.Math.Between(50, 100), // slow fall
      rotationSpeed: Phaser.Math.FloatBetween(-1, 1), 
      type: 'powerUp',
      radius: sprite.displayWidth / 2,
      powerUpId: key // store which power-up this is
    };

    sprite.on('pointerdown', () => this.cutEntity(entity));

    this.entities.push(entity);
    this.addEntityToGrid(entity);
    this.addEntityBorder(entity);
  }

  // --- ENTITY SPAWN ---
  spawnEntity(width: number, height: number) {
    const radius = Phaser.Math.Between(40, 60);
    let validPosition = false;
    let attempts = 0;
    let spawnX = Phaser.Math.Between(radius, width - radius);
    while (!validPosition && attempts < 10) {
      validPosition = !this.entities.some(e => e.type === 'hazard' && Math.abs(e.sprite.x - spawnX) < 80);
      if (!validPosition) spawnX = Phaser.Math.Between(radius, width - radius);
      attempts++;
    }
    const x = spawnX;
    const y = height + radius;
    const maxHazards = 2;
    const hazardsOnScreen = this.entities.filter(e => e.type === 'hazard').length;
    const type: 'good' | 'hazard' = (hazardsOnScreen >= maxHazards) ? 'good' : (Math.random() < 0.8 ? 'good' : 'hazard');

    // --- load icons from registry ---
    const subredditIcons: string[] = this.registry.get('subredditsIcons') || [];
    const memeIcons: string[] = this.registry.get('memesIcons') || [];
    const hazardIcons: string[] = this.registry.get('hazardsIcons') || [];

    const iconArray = type === 'good' ? subredditIcons.concat(memeIcons) : hazardIcons;
    if (!iconArray.length) return;

    const key = iconArray[Phaser.Math.Between(0, iconArray.length - 1)]; if (!key) return;
    const scaleFactor = this.getResponsiveScale(width);

    const baseVy = -Math.sqrt(2 * 600 * Phaser.Math.Between(400, 500));
    const sprite = this.add.image(x, y, key).setDisplaySize(radius * 2 * scaleFactor, radius * 2 * scaleFactor).setInteractive({ useHandCursor: true }).setAlpha(1);
    const entity: GameEntity = { 
      sprite, vx: Phaser.Math.Between(-100, 100), 
      vy: this.slowmoActive ? baseVy * this.slowmoFactor : baseVy,
      rotationSpeed: Phaser.Math.FloatBetween(-5, 5), 
      type, 
      radius: sprite.displayWidth / 2 };
    if (type === 'hazard') {
      entity.vy *= Phaser.Math.FloatBetween(0.8, 1.2);
      entity.vx *= Phaser.Math.FloatBetween(0.5, 1.5);
    }
    entity.vy *= Phaser.Math.FloatBetween(1.0, 1.3);
    sprite.on('pointerdown', () => this.cutEntity(entity));
    this.addEntityBorder(entity);
    this.entities.push(entity);
    this.addEntityToGrid(entity);

    // pick a jump sound if it exists
    const jumpSounds = this.registry.get('effects_jumpSounds') || [];
    if (jumpSounds.length) {
      const soundKey = jumpSounds[Phaser.Math.Between(0, jumpSounds.length - 1)];
      this.sound.play(soundKey);
    }
  }

  private addEntityBorder(entity: GameEntity) {
    const color = entity.type === 'hazard' ? 0xff0000    // red
            : entity.type === 'powerUp' ? 0x00ff00  // green
            : 0xffff00;               // yellow for good
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

  // --- POWER-UPS ---
  private activateKunaiStorm() {
    if (!this.entities.length) return;

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e || e.type !== 'good') continue; // solo afectar good

      const sprite = e.sprite;
      const w = sprite.displayWidth / 2;
      const h = sprite.displayHeight;

      const leftHalf = this.add.image(sprite.x - w / 2, sprite.y, sprite.texture.key)
        .setDisplaySize(w, h).setOrigin(0.5);
      const rightHalf = this.add.image(sprite.x + w / 2, sprite.y, sprite.texture.key)
        .setDisplaySize(w, h).setOrigin(0.5);

      this.tweens.add({ targets: leftHalf, x: leftHalf.x - 50, y: leftHalf.y - 100, angle: -45, alpha: 0, duration: 500, onComplete: () => leftHalf.destroy() });
      this.tweens.add({ targets: rightHalf, x: rightHalf.x + 50, y: rightHalf.y - 100, angle: 45, alpha: 0, duration: 500, onComplete: () => rightHalf.destroy() });

      // puntos + tiempo + feedback
      this.pointsCount++;

      this.comboCount++;
      this.comboTimer = this.comboDuration;
      let multiplier = 1 + (this.comboCount - 1) * 0.5; // ejemplo: +50% por cada combo
      this.pointsCount += Math.floor(this.pointsCount * (multiplier - 1));

      this.updatePointsCountText();
      this.showComboFeedback(`Combo x${multiplier.toFixed(1)}`, e.sprite.x, e.sprite.y - 30, "#ffff00");

      sprite.destroy();
      this.removeEntityFromGrid(e);
      this.entities.splice(i, 1);
    }

    const kunaiSounds: string[] = this.registry.get('powerUps_kunaiStormSounds') || [];
    if (kunaiSounds.length) {
      const soundKey = kunaiSounds[Phaser.Math.Between(0, kunaiSounds.length - 1)];
      if (soundKey) this.sound.play(soundKey);
    }
  }

  private activateSlowmo() {
    const duration = 5; // seconds
    const factor = 0.3; // slow down to 30%
    if (this.slowmoActive) return;

    this.slowmoActive = true;
    this.slowmoFactor = factor;

    // cambia el fondo a rojo mientras está activo
    this.background.setAlpha(0.7); // ajusta entre 0 y 1 según lo intenso que quieras el efecto
    this.camera.setBackgroundColor(0x4B0082);

    this.time.delayedCall(duration * 1000, () => {
      this.slowmoActive = false;
      this.slowmoFactor = 1;

      // volver al fondo normal
      this.background.setAlpha(1);
      this.camera.setBackgroundColor(0x222222);
    });

    const slowmoSounds: string[] = this.registry.get('powerUps_SlowmoSounds') || [];
    if (slowmoSounds.length) {
      const soundKey = slowmoSounds[Phaser.Math.Between(0, slowmoSounds.length - 1)]!;
      this.sound.play(soundKey);
    }
  }

  private activateShield() {
    console.log('Shield activated! (not implemented)');
  }

  private showComboFeedback(text: string, x: number, y: number, color: string) {
    const floating = this.add.text(x, y, text, {
      fontFamily: 'Helvetica',
      fontSize: 40,
      color,
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5).setScale(0); // start tiny for the pop

    // --- jump + scale tween ---
    this.tweens.add({
      targets: floating,
      y: y - 30,         // small jump
      scale: 1.3,        // pop up bigger
      alpha: 1,
      duration: 200,
      ease: 'Back.Out',  // elastic pop
      yoyo: true,        // jump back a bit
      onComplete: () => {
        this.tweens.add({ 
          targets: floating,
          alpha: 0,      // fade out
          duration: 300,
          onComplete: () => floating.destroy()
        });
      }
    });
  }

  // --- UI & LAYOUT ---
  updateLayout(width: number, height: number) {
    this.cameras.resize(width, height);
    
    // background
    if (this.background) {
      this.background.setPosition(width / 2, height / 2);
      const scale = Math.max(width / this.background.width, height / this.background.height);
      this.background.setScale(scale);
    }

    // top-right time
    if (this.elapsedTimeText) {
      this.elapsedTimeText.setPosition(width - 20, 20);
    }
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

  private getResponsiveScale(width: number) { if (width < 600) return 0.8; if (width < 1200) return 1.2; return 1.6; }
  updatePointsCountText() { this.pointsCountText.setText(`Points: ${this.pointsCount}`); }
  updateFailsCountText() { this.failsCountText.setText(`Fails: ${this.failsCount}`); }
}