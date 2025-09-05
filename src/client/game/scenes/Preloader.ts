import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    this.add.image(512, 384, 'background');

    const barOutline = this.add.rectangle(512, 384, 468, 32).setStrokeStyle(2, 0xffffff);
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    this.load.on('progress', (progress: number) => {
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    this.load.image('reddit_snoo', 'assets/reddit_snoo.png');
    this.load.image('logo', 'assets/logo.png');
    this.load.json('icons', 'assets/icons.json');

    this.load.on('filecomplete-json-icons', () => {
      const json: Record<string, string[]> = this.cache.json.get('icons');

      for (const [category, urls] of Object.entries(json)) {
        loadIcons(this, category, urls);
      }

      this.load.once('complete', () => {
        this.scene.start('MainMenu');
      });

      this.load.start(); // inicia la carga de las imágenes recién encoladas
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
