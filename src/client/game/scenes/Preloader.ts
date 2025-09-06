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
    this.load.image('reddit_snoo', 'assets/images/subreddits/reddit_snoo.png');
    this.load.image('logo', 'assets/images/logo.png');
    this.load.json('icons', 'assets/images/icons.json');
    this.load.json('sounds', 'assets/sounds/sounds.json'); // <-- added

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