import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    const { width, height } = this.scale;
    const bg = this.add.image(width / 2, height / 2, 'background');
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setOrigin(0.5);

     // outline centrado
    const outlineWidth = width * 0.6;
    const outlineHeight = 32;
    const barOutline = this.add
      .rectangle(width / 2, height * 0.9, outlineWidth, outlineHeight)
      .setStrokeStyle(2, 0xffffff);

    // barra inicia vacía y alineada al borde izquierdo del outline
    const bar = this.add
      .rectangle(
        barOutline.getTopLeft().x + 2, // +2 por el stroke
        barOutline.y,
        0,
        outlineHeight - 4,
        0xffffff
      )
      .setOrigin(0, 0.5);

    this.load.on('progress', (progress: number) => {
      bar.width = 4 + (width * 0.6 - 8) * progress;
    });

    // --- inicializar sonido ---
    if (this.registry.get('SoundActive') === undefined) {
      this.registry.set('SoundActive', true); // por defecto activado
    }
  }

  preload() {
    this.load.image('reddit_snoo', '/assets/images/subreddits/reddit_snoo.png');
    this.load.image('pause', '/assets/images/pause.png');
    this.load.image('sound_on', '/assets/images/sound_on.png');
    this.load.image('sound_off', '/assets/images/sound_off.png');
    this.load.image('logo', '/assets/images/logo.png');
    this.load.json('icons', '/assets/images/icons.json');
    this.load.json('sounds', '/assets/sounds/sounds.json'); // <-- added

    this.load.on('filecomplete-json-icons', () => {
      const json: Record<string, string[]> = this.cache.json.get('icons');

      for (const [category, urls] of Object.entries(json)) {
        loadIcons(this, category, urls);
      }

      this.load.start();
    });

    this.load.on('filecomplete-json-sounds', () => {
      const json: Record<string, string[]> = this.cache.json.get('sounds');

      for (const [category, urls] of Object.entries(json)) {
        loadSounds(this, category, urls);
      }

      this.load.start();
    });
  }

  create() {
    this.scene.start('MainMenu');
  }
}

function loadIcons(thisScene: Phaser.Scene, category: string, urls: string[]) {
  const keys: string[] = [];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const key = `${category}_${i}`;
    thisScene.load.image(key, url);
    keys.push(key);
  }

  thisScene.registry.set(`${category}Icons`, keys);
}

function loadSounds(thisScene: Phaser.Scene, category: string, urls: Record<string, string[]> | string[]) {
  for (const [subCat, files] of Object.entries(urls)) {
    const keys: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const url = files[i];
      const key = `${category}_${subCat}_${i}`;
      thisScene.load.audio(key, url);
      keys.push(key);
    }
    thisScene.registry.set(`${category}_${subCat}Sounds`, keys);
  }
}