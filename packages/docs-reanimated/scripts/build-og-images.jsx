import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import React from 'react';
import path from 'path';
import fs from 'fs';
import OGImageStream from './og-image-stream';

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

  const docsDirs = await Promise.all(
    (
      await fs.promises.readdir(docsDirPath)
    ).map(async (dir) => {
      const files = await fs.promises.readdir(path.resolve(docsDirPath, dir));
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

  const blogFiles = await fs.promises.readdir(blogDirPath);
  const blogFilesFiltered = blogFiles
    .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
    .map((file) => ({
      dir: '',
      files: [file],
    }));

  const allFiles = [...docsDirs, ...blogFilesFiltered];

  allFiles.forEach(({ dir, files }) => {
    files.forEach(async (file) => {
      const filePath = dir
        ? path.resolve(docsDirPath, dir, file)
        : path.resolve(blogDirPath, file);

      const header = dir
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
    });
  });
}

buildOGImages();
