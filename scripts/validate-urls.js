/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const util = require('util');
const fsp = fs.promises;
const readFile = util.promisify(fs.readFile);
const fetch = require('node-fetch');

const directories = [
  'android',
  'app',
  'common',
  'Example',
  'FabricExample',
  'ios',
  'MacOSExample',
  'plugin',
  'TVOSExample',
  'WebExample',
];

const extensions = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.md',
  '.mdx',
  '.h',
  '.cpp',
  '.m',
  '.mm',
  '.java',
  '.gradle',
  '.podspec',
];

// also every hidden directory is ignored
const ignoredDirectories = ['node_modules', 'Pods', 'lib', 'build'];

const urlRegex =
  /\b((http|https):\/\/?)[^\s()<>`]+(?:\([\w\d]+\)|([^[:punct:]\s]|\/?))(?<!\.)\b/g;

async function getFiles(dir) {
  const dirents = await fsp.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const res = path.resolve(dir, dirent.name);
      if (
        dirent.name.startsWith('.') ||
        ignoredDirectories.includes(dirent.name)
      ) {
        return [];
      } else if (dirent.isDirectory()) {
        return getFiles(res);
      } else {
        if (extensions.includes(path.extname(dirent.name))) {
          const fileContent = await readFile(res, 'utf-8');
          const urls = Array.from(fileContent.matchAll(urlRegex), (m) => m[0]);
          const validUrls = [];
          urls.forEach((url) => {
            if (!/({|})/.test(url)) {
              validUrls.push(url);
            }
          });

          return validUrls.length > 0 ? { file: res, urls: validUrls } : [];
        } else {
          return [];
        }
      }
    })
  );
  return Array.prototype.concat(...files);
}

const currentDir = process.cwd();

directories.forEach(async (dir) => {
  const files = await getFiles(path.join(currentDir, dir));
  files.forEach(async (file) => {
    file.urls.forEach(async (url) => {
      try {
        const response = await fetch(url);
        if (response.status !== 200) {
          console.error(`🔴 ${response.status} - ${file.file} - ${url}`);
        } else {
          console.log(`🟢 ${file.file} - ${url}`);
        }
      } catch (e) {
        console.error(`🔴 ${e} - ${file.file} - ${url}`);
      }
    });
  });
});
