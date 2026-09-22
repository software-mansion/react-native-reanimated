import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import {
  parseMarkdownFile,
  DEFAULT_PARSE_FRONT_MATTER,
} from '@docusaurus/utils';
import { DefaultNumberPrefixParser } from '@docusaurus/plugin-content-docs/lib/numberPrefix.js';
import OGImageStream from './og-image-stream';
const { globSync } = require('glob');

async function buildOGImages() {
  const docsDirPath = path.resolve(__dirname, '../docs');

  const docsFiles = globSync(`${docsDirPath}/*/*.{md,mdx}`);

  const ogImageTargets = path.resolve(__dirname, '../build/img/og');

  if (fs.existsSync(ogImageTargets)) {
    fs.rmSync(ogImageTargets, { recursive: true });
  }

  fs.mkdirSync(ogImageTargets, { recursive: true });

  console.log('Generating OG images for docs...');

  const imagePath = path.resolve(__dirname, '../unproccessed/og-image.png');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  for (const filePath of docsFiles) {
    const title = await getPageTitle(filePath);
    const ogImageStream = OGImageStream(title, base64Image);

    await saveStreamToFile(
      await ogImageStream,
      path.resolve(ogImageTargets, `${getImageName(title)}.png`)
    );
  }
}

// The name must match the one the theme asks for, so the title is resolved the
// same way Docusaurus resolves it.
async function getPageTitle(filePath) {
  const { frontMatter, contentTitle } = await parseMarkdownFile({
    filePath,
    fileContent: fs.readFileSync(filePath, 'utf-8'),
    parseFrontMatter: DEFAULT_PARSE_FRONT_MATTER,
  });

  return frontMatter.title ?? contentTitle ?? getBaseId(filePath, frontMatter);
}

function getBaseId(filePath, frontMatter) {
  if (frontMatter.id) {
    return frontMatter.id;
  }

  const fileName = path.basename(filePath, path.extname(filePath));

  return frontMatter.parse_number_prefixes === false
    ? fileName
    : DefaultNumberPrefixParser(fileName).filename;
}

function getImageName(title) {
  return title.replace(/ /g, '-').replace('/', '-').toLowerCase();
}

async function saveStreamToFile(stream, filePath) {
  const writeStream = createWriteStream(filePath);
  await promisify(pipeline)(stream, writeStream);
}

buildOGImages();
