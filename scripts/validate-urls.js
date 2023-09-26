/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const util = require('util');
const fsp = fs.promises;
const readFile = util.promisify(fs.readFile);
const fetch = require('node-fetch');

const extensions = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.md',
  '.mdx',
  '.h',
  '.cpp',
  '.m',
  '.mm',
  '.java',
  '.gradle',
  '.podspec',
  '.rb',
  '.swift',
];
// Every hidden directory is ignored as well.
const ignoredDirectories = ['node_modules', 'Pods', 'lib', 'build', 'cypress'];

const urlRegex =
  /\b((http|https):\/\/?)[^\s<>[\]`]+(?:\([\w\d]+\)|([^[:punct:]\s]|\/?))(?<!\.)\b/g;

async function getFileAndUrls(dir) {
  const directories = await fsp.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    directories.map(async (file) => {
      const resource = path.resolve(dir, file.name);
      if (
        file.name.startsWith('.') ||
        ignoredDirectories.includes(file.name)
      ) {
        return [];
      } else if (file.isDirectory()) {
        return getFileAndUrls(resource);
      } else {
        if (extensions.includes(path.extname(file.name))) {
          const fileContent = await readFile(resource, 'utf-8');
          let urls = Array.from(fileContent.matchAll(urlRegex), (m) => m[0]);
          urls = urls.filter((url) => !/({|})/.test(url));
          return urls.length > 0 ? urls.map((url) => ({ file: resource, url: url })) : [];
        } else {
          return [];
        }
      }
    })
  );
  return Array.prototype.concat(...files);
}

function validUrls(data) {
  let index = 0;
  let isBrokenUrlDetected = false;
  function sendRequest() {
    if (index >= data.length) {
      if (isBrokenUrlDetected) {
        throw new Error('🔴 Invalid links detected.');
      }
      return;
    }
    const currentData = data[index];
    if (
      currentData.url.includes('twitter.com') // redirect issue
      || currentData.url.includes('blog.swmansion.com') // authorization issue
      || currentData.url.includes('opensource.org') // request from GitHub actions probably blocked
    ) {
      index++;
      sendRequest();
      return;
    }
    fetch(currentData.url)
      .then(response => {
        const status = response.status;
        if (![200, 301, 302, 307].includes(status)) {
          console.error(`🔴 Invalid link: ${response.url} in file: ${currentData.file}\n`);
          isBrokenUrlDetected = true;
        }
        index++;
        sendRequest();
      })
      .catch(error => {
        isBrokenUrlDetected = true;
        console.error("Error:", error);
        index++;
        sendRequest();
      });
  }
  sendRequest();
}

async function scanLinks() {
  const currentDir = process.cwd();
  const data = await getFileAndUrls(currentDir);
  validUrls(data);
}

scanLinks();
