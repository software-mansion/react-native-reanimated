import { ImageResponse } from '@vercel/og';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import React from 'react';
import path from 'path';
import fs from 'fs';

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

  return headers[0]?.title;
};

async function saveStreamToFile(stream, path) {
  const writeStream = createWriteStream(path);
  await promisify(pipeline)(stream, writeStream);
}

const buildOGImages = async () => {
  const baseDocsPath = path.resolve(__dirname, '../docs');
  const docs = await Promise.all(
    (
      await fs.promises.readdir(baseDocsPath)
    ).map(async (dir) => {
      const files = await fs.promises.readdir(path.resolve(baseDocsPath, dir));
      return {
        dir,
        files: files.filter(
          (file) => file.endsWith('.md') || file.endsWith('.mdx')
        ),
      };
    })
  );

  const targetDocs = path.resolve(__dirname, '../build/img/og');

  if (fs.existsSync(targetDocs)) fs.rmSync(targetDocs, { recursive: true });

  fs.mkdirSync(targetDocs);

  console.log('Generating OG images for docs...');

  const imagePath = path.resolve(__dirname, '../unproccessed/og-image.png');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  await Promise.all(
    docs.map(async ({ dir, files }) => {
      files.map(async (file) => {
        const header =
          getMarkdownHeader(path.resolve(baseDocsPath, dir, file)) ??
          'React Native Reanimated';

        await saveStreamToFile(
          new ImageResponse(
            (
              <div
                style={{
                  display: 'flex',
                  fontSize: 40,
                  color: 'black',
                  background: 'white',
                  width: '100%',
                  height: '100%',
                  padding: '50px 200px',
                  textAlign: 'center',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <img
                  style={{
                    width: 1200,
                    height: 630,
                    objectFit: 'cover',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                  src={base64Image}
                  alt=""
                />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: 1200,
                    gap: -20,
                    padding: '0 201px 0 67px',
                  }}>
                  <p
                    style={{
                      fontSize: 72,
                      fontWeight: 'bold',
                      color: '#001A72',
                      textAlign: 'left',
                      fontFamily: 'Aeonik Bold',
                      textWrap: 'wrap',
                    }}>
                    {header}
                  </p>
                  <pre
                    style={{
                      fontSize: 40,
                      fontWeight: 'normal',
                      color: '#001A72',
                      textAlign: 'left',
                      fontFamily: 'Aeonik Regular',
                      textWrap: 'wrap',
                    }}>
                    {'Check out the React Native\nReanimated documentation.'}
                  </pre>
                </div>
              </div>
            ),
            {
              width: 1200,
              height: 630,
              fonts: [
                {
                  name: 'Aeonik Bold',
                  data: fs.readFileSync(
                    path.resolve(__dirname, '../static/font/Aeonik-Bold.otf')
                  ),
                  style: 'normal',
                },
                {
                  name: 'Aeonik Regular',
                  data: fs.readFileSync(
                    path.resolve(__dirname, '../static/font/Aeonik-Regular.otf')
                  ),
                  style: 'normal',
                },
              ],
            }
          ).body,
          path.resolve(
            targetDocs,
            `${header.replace(/ /g, '-').replace('/', '-').toLowerCase()}.png`
          )
        );
      });
    })
  );
};

buildOGImages();
