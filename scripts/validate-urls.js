/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const util = require('util');
const fsp = fs.promises;
const readFile = util.promisify(fs.readFile);
const fetch = require('node-fetch');

let isBrokenUrlDetected = false;
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
  '.rb',
];
// Every hidden directory is ignored as well.
const ignoredDirectories = ['node_modules', 'Pods', 'lib', 'build'];

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
          const urls = Array.from(fileContent.matchAll(urlRegex), (m) => m[0]);
          urls.filter((url) => !/({|})/.test(url));
          return urls.length > 0 ? urls.map((url) => ({ file: resource, url: url })) : [];
        } else {
          return [];
        }
      }
    })
  );
  return Array.prototype.concat(...files);
}

function sendRequestsInOrder(data) {
  let index = 0;
  function sendRequest() {
    if (index >= data.length) {
      return;
    }
    const currentData = data[index];
    if (currentData.url.includes('twitter.com')) {
      index++;
      sendRequest();
      return;
    }
    fetch(currentData.url)
      .then(response => {
        if (response.status !== 200 && response.status !== 301 && response.status !== 302) {
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
  sendRequestsInOrder(data);
  if (isBrokenUrlDetected) {
    process.exit(1);
  }
}

scanLinks();
