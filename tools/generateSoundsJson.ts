import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type SoundCategories = 'cuts' | 'powerUps' | 'ui' | 'effects';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.resolve(__dirname, '../src/client/public/assets/sounds');
const outputFile = path.join(assetsDir, 'sounds.json');

const categories: Record<SoundCategories, string> = {
    cuts: 'cuts',
    powerUps: 'powerUps',
    ui: 'ui',
    effects: 'effects'
};

const jsonOutput: {
    [key in SoundCategories]: Record<string, string[]>;
} = {
    cuts: {},
    powerUps: {},
    ui: {},
    effects: {}
};

async function processCategory(catKey: SoundCategories, folderName: string) {
  const folderPath = path.join(assetsDir, folderName);
  if (!fs.existsSync(folderPath)) return;

  const subfolders = fs.readdirSync(folderPath).filter(f => fs.statSync(path.join(folderPath, f)).isDirectory());

  if (subfolders.length === 0) {
    jsonOutput[catKey]['default'] = [];
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.wav' || ext === '.mp3') {
        jsonOutput[catKey]['default'].push(`assets/sounds/${folderName}/${file}`);
      }
    }
  } else {
    for (const sub of subfolders) {
      jsonOutput[catKey][sub] = [];
      const subFiles = fs.readdirSync(path.join(folderPath, sub));
      for (const file of subFiles) {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.wav' || ext === '.mp3') {
          jsonOutput[catKey][sub].push(`assets/sounds/${folderName}/${sub}/${file}`);
        }
      }
    }
  }
}

async function generateSoundsJson() {
  for (const [catKey, folderName] of Object.entries(categories) as [SoundCategories, string][]) {
    await processCategory(catKey, folderName);
  }

  fs.writeFileSync(outputFile, JSON.stringify(jsonOutput, null, 2));
  console.log(`sounds.json generado en ${outputFile}`);
}

try {
  await generateSoundsJson();
} catch (err) {
  console.error('Error generating sounds.json:', err.message);
  process.exit(1);
}