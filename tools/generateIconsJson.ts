import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

type IconCategories = 'subreddits' | 'memes' | 'hazards' | 'powerUps';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.resolve(__dirname, '../src/client/public/assets/images/');
const outputFile = path.join(assetsDir, 'icons.json');

const categories: Record<IconCategories, string> = {
  subreddits: 'subreddits',
  memes: 'memes',
  hazards: 'hazards',
  powerUps: 'powerUps'
};

const jsonOutput: Record<string, string[]> = {
  subreddits: [],
  memes: [],
  hazards: [],
  powerUps: []
};

async function processCategory(catKey: IconCategories, folderName: string) {
  const folderPath = path.join(assetsDir, folderName);
  if (!fs.existsSync(folderPath)) return;

  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    let fileName = file;

    if (ext === '.webp') {
      const pngFileName = file.replace('.webp', '.png');
      const pngFilePath = path.join(folderPath, pngFileName);

      // Convertir a PNG
      await sharp(path.join(folderPath, file))
        .png()
        .toFile(pngFilePath);

      // Borrar el original .webp
      fs.unlinkSync(path.join(folderPath, file));

      fileName = pngFileName;
    }

    // Solo agregar PNG al JSON
    if (path.extname(fileName).toLowerCase() === '.png') {
      jsonOutput[catKey].push(`assets/images/${folderName}/${fileName}`);
    }
  }
}

async function generateIconsJson() {
  for (const [catKey, folderName] of Object.entries(categories) as [IconCategories, string][]) {
    await processCategory(catKey, folderName);
  }

  fs.writeFileSync(outputFile, JSON.stringify(jsonOutput, null, 2));
  console.log(`icons.json generado en ${outputFile}`);
}

generateIconsJson();
