const fs = require('fs');
const path = require('path');
const util = require('util');
const fsp = fs.promises;
const readFile = util.promisify(fs.readFile);
const fetch = require('node-fetch').default;

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
const ignoredPatterns = [
  'node_modules',
  'Pods',
  'lib',
  'build',
  'cypress',
  'vendor',
  'DerivedData',
  'docusaurus.config.js ', // the script wrongly parses some text in this file as links
];

const urlRegex =
  /\b((http|https):\/\/?)[^\s<>[\]`]+(?:\([\w\d]+\)|([^[:punct:]\s]|\/?))(?<!\.)\b/g;

/**
 * @param {string} dir
 * @returns {Promise<{ file: string; url: string }[]>}
 */
async function getFileAndUrls(dir) {
  const directories = await fsp.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    directories.map(async (file) => {
      const resource = path.resolve(dir, file.name);
      if (file.name.startsWith('.') || ignoredPatterns.includes(file.name)) {
        return [];
      } else if (file.isDirectory()) {
        return getFileAndUrls(resource);
      } else {
        if (extensions.includes(path.extname(file.name))) {
          const fileContent = await readFile(resource, 'utf-8');
          let urls = Array.from(fileContent.matchAll(urlRegex), (m) => m[0]);
          urls = urls.filter((url) => !/({|})/.test(url));
          return urls.length > 0
            ? urls.map((url) => ({ file: resource, url }))
            : [];
        } else {
          return [];
        }
      }
    })
  );
  return Array.prototype.concat(...files);
}

/** @param {{ file: string; url: string }[]} data */
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
      skippedUrls.some((skippedUrl) => currentData.url.includes(skippedUrl))
    ) {
      index++;
      sendRequest();
      return;
    }
    fetch(currentData.url, {
      headers: [],
    })
      .then((response) => {
        const status = response.status;
        if (![200, 301, 302, 307, 503].includes(status)) {
          console.error(
            `🔴 Invalid link: ${response.url} status: ${status} in file: ${currentData.file}\n`
          );
          isBrokenUrlDetected = true;
        }
        index++;
        sendRequest();
        return;
      })
      .catch((/** @type {Error} */ error) => {
        isBrokenUrlDetected = true;
        console.error('Error:', error);
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

const skippedUrls = [
  'localhost',
  'twitter.com', // redirect issue
  'blog.swmansion.com', // authorization issue
  'opensource.org', // request from GitHub actions probably blocked
  'good+first+issue', // sometimes we don't have any issues with this label
  'codepen', // getting 403 no matter what
  'github.com/user-attachments/assets', // seems to be broken on CI
  'filesamples.com', // 403 - not allowing bots
  'freepik.com', // 403 - not allowing bots
  'npmjs.com', // 403 - not allowing bots
  'cvedetails.com', // 403 - not allowing bots
  'swmansion.dev/api', // not allowed on CI
  'swmansion.com/react-native', // wrongly detected as a link
];

scanLinks();
