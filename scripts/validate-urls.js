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
  'apple',
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

// Every hidden directory is ignored as well.
const ignoredDirectories = ['node_modules', 'Pods', 'lib', 'build'];

const urlRegex =
  /\b((http|https):\/\/?)[^\s()<>`]+(?:\([\w\d]+\)|([^[:punct:]\s]|\/?))(?<!\.)\b/g;

// This is hardcoded only for docs for now but it's easy to change it into
// a proper config that could be passed as an argument if we ever need it.
const redirects = [
  { from: 'https://docs.swmansion.com', to: 'http://localhost:3000' },
];

function maybeRedirectUrl(url) {
  const redirect = redirects.find((r) => url.startsWith(r.from));
  if (redirect) {
    return url.replace(redirect.from, redirect.to);
  } else {
    return url;
  }
}

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
      const actualUrl = maybeRedirectUrl(url);
      try {
        const response = await fetch(actualUrl);
        if (response.status !== 200) {
          console.error(`🔴 ${response.status} - ${file.file} - ${actualUrl}`);
        } else {
          console.log(`🟢 ${file.file} - ${actualUrl}`);
        }
      } catch (e) {
        console.error(`🔴 ${e} - ${file.file} - ${actualUrl}`);
      }
    });
  });
});
