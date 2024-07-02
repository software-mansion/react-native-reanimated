import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import OGImageStream from './og-image-stream';
const { globSync } = require('glob');

const getDocsMarkdownHeader = (path) => {
  const content = fs.readFileSync(path, 'utf-8');
  const headers = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('#'))
    .map((line, index) => ({
      level: line.match(/#/g).length,
      title: line.replace(/#/g, '').trim(),
      index,
    }))
    .sort((a, b) => a.level - b.level || a.index - b.index);

  return headers[0]?.title || 'React Native Reanimated';
};

const getExampleMardownHeader = (path) => {
  const content = fs.readFileSync(path, 'utf-8');
  const headers = content
    .split('\n')
    .filter((line) => line.startsWith('title:'))
    .map((line) => line.replace('title:', '').trim());

  return headers[0] || 'React Native Reanimated';
};

async function saveStreamToFile(stream, filePath) {
  const writeStream = createWriteStream(filePath);
  await promisify(pipeline)(stream, writeStream);
}

async function buildOGImages() {
  const docsDirPath = path.resolve(__dirname, '../docs');
  const blogDirPath = path.resolve(__dirname, '../blog');

  const docsFiles = globSync(`${docsDirPath}/*/*.{md,mdx}`);
  const blogFiles = globSync(`${blogDirPath}/*.{md,mdx}`);

  const ogImageTargets = path.resolve(__dirname, '../build/img/og');

  if (fs.existsSync(ogImageTargets)) {
    fs.rmSync(ogImageTargets, { recursive: true });
  }

  fs.mkdirSync(ogImageTargets, { recursive: true });

  console.log('Generating OG images for docs...');

  const imagePath = path.resolve(__dirname, '../unproccessed/og-image.png');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  const allFiles = [...docsFiles, ...blogFiles];

  for (const filePath of allFiles) {
    const header = filePath.startsWith(docsDirPath)
      ? getDocsMarkdownHeader(filePath)
      : getExampleMardownHeader(filePath);

    const ogImageStream = OGImageStream(header, base64Image);

    await saveStreamToFile(
      await ogImageStream,
      path.resolve(
        ogImageTargets,
        `${header.replace(/ /g, '-').replace('/', '-').toLowerCase()}.png`
      )
    );
  }
}

buildOGImages();
