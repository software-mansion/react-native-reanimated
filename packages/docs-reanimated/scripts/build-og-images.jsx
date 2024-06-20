import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import React from 'react';
import path from 'path';
import fs from 'fs';
import OGImageStream from './og-image-stream';

const getMarkdownHeader = (path) => {
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

async function saveStreamToFile(stream, path) {
  const writeStream = createWriteStream(path);
  await promisify(pipeline)(stream, writeStream);
}

async function buildOGImages() {
  const baseDirPath = path.resolve(__dirname, '../docs');
  const dirs = await Promise.all(
    (
      await fs.promises.readdir(baseDirPath)
    ).map(async (dir) => {
      const files = await fs.promises.readdir(path.resolve(baseDirPath, dir));
      return {
        dir,
        files: files.filter(
          (file) => file.endsWith('.md') || file.endsWith('.mdx')
        ),
      };
    })
  );

  const ogImageTargets = path.resolve(__dirname, '../build/img/og');

  if (fs.existsSync(ogImageTargets)) {
    fs.rmSync(ogImageTargets, { recursive: true });
  }

  fs.mkdirSync(ogImageTargets, { recursive: true });

  console.log('Generating OG images for docs...');

  const imagePath = path.resolve(__dirname, '../unproccessed/og-image.png');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  dirs.map(async ({ dir, files }) => {
    files.map(async (file) => {
      const header = getMarkdownHeader(path.resolve(baseDirPath, dir, file));

      const ogImageStream = OGImageStream(header, base64Image);

      await saveStreamToFile(
        await ogImageStream,
        path.resolve(
          ogImageTargets,
          `${header.replace(/ /g, '-').replace('/', '-').toLowerCase()}.png`
        )
      );
    });
  });
}

buildOGImages();
