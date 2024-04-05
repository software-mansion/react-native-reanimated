const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage, registerFont } = require('canvas');

registerFont('static/font/Aeonik-Bold.otf', { family: 'Aeonik Bold' });

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

  return headers[0]?.title || '';
};

const buildOGImages = async () => {
  const baseDocsPath = path.resolve(__dirname, 'docs');
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

  const targetDocs = path.resolve(__dirname, 'build/docs/og');

  if (fs.existsSync(targetDocs)) fs.rmSync(targetDocs, { recursive: true });

  fs.mkdirSync(targetDocs);

  console.log('Generating OG images for docs...');

  const image = await loadImage(
    path.resolve(__dirname, 'unproccessed/og-image.png')
  );
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');

  await Promise.all(
    docs.map(async ({ dir, files }) => {
      files.map(async (file) => {
        ctx.drawImage(image, 0, 0, 1200, 630);

        let header = getMarkdownHeader(path.resolve(baseDocsPath, dir, file));

        if (header === '') header = 'unnamed';

        ctx.font = 'bold 72px "Aeonik Bold"';
        ctx.fillStyle = '#001A72';
        ctx.textAlign = 'left';
        if (ctx.measureText(`${header}`).width < 1200 - 2 * 67) {
          ctx.fillText(`${header}`, 67, 267);
        } else {
          const words = header.split(' ');
          let line = '';
          const lines = [];
          let y = 267;
          for (let i = 0; i < words.length; i++) {
            const newLine = `${line} ${words[i]}`.trim();
            if (ctx.measureText(`${newLine}`).width < 1200 - 2 * 67) {
              line = newLine;
            } else {
              lines.push({
                line,
                y,
              });
              y += 37;
              line = `${words[i]}`;
            }
          }
          lines.push({
            line,
            y,
          });
          lines.forEach(({ line, y }, index) => {
            ctx.fillText(line, 67, y - (lines.length - index) * 37);
          });
        }

        ctx.font = 'bold 40px "Aeonik Bold"';
        ctx.fillText(
          'Check out the React Native Reanimated\ndocumentation.',
          67,
          369
        );

        const buffer = canvas.toBuffer('image/png');
        const target = path.resolve(
          targetDocs,
          `${header.replace(/ /g, '-').replace('/', '-').toLowerCase()}.png`
        );
        await fs.promises.writeFile(target, buffer);

        ctx.clearRect(0, 0, 1200, 630);
      });
    })
  );

  console.log('OG images generated.');
};

buildOGImages();
