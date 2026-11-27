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
const ignoredDirs = [
  'node_modules',
  'Pods',
  'lib',
  'build',
  'cypress',
  'vendor',
  'DerivedData',
  'Build',
];

const ignoredFiles = [
  'docusaurus.config.js', // the script wrongly parses some text in this file as links
];

const urlRegex =
  /\b((http|https):\/\/?)[^\s<>[\]`'"]+(?:\([\w\d]+\)|([^[:punct:]\s]|\/?))(?<!\.)\b/g;

/**
 * @param {string} dir
 * @returns {Promise<{ file: string; url: string }[]>}
 */
async function getFileAndUrls(dir) {
  const directories = await fsp.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    directories.map(async (file) => {
      const resource = path.resolve(dir, file.name);
      if (
        file.name.startsWith('.') ||
        ignoredDirs.includes(file.name) ||
        ignoredFiles.includes(file.name)
      ) {
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

/**
 * @param {{ file: string; url: string }[]} data
 * @returns {Map<string, Set<string>>}
 */
function groupFilesByUrl(data) {
  const filesByUrl = new Map();
  for (const { file, url } of data) {
    filesByUrl.set(url, (filesByUrl.get(url) ?? new Set()).add(file));
  }
  return filesByUrl;
}

/** @param {Map<string, Set<string>>} filesByUrl */
async function validUrls(filesByUrl) {
  let isBrokenUrlDetected = false;
  for (const [url, files] of filesByUrl) {
    const fileList = [...files].join('\n  ');
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'react-native-reanimated-url-validator (https://github.com/software-mansion/react-native-reanimated)',
        },
      });
      const status = response.status;
      const extraStatuses =
        Object.entries(extraValidStatuses).find(([host]) =>
          url.includes(host)
        )?.[1] ?? [];
      if (![200, 301, 302, 307, 503, ...extraStatuses].includes(status)) {
        console.error(
          `🔴 Invalid link: ${response.url} status: ${status} in files:\n  ${fileList}\n`
        );
        isBrokenUrlDetected = true;
      }
    } catch (error) {
      isBrokenUrlDetected = true;
      console.error(
        `🔴 Request failed: ${url} in files:\n  ${fileList}\n`,
        error
      );
    }
  }
  if (isBrokenUrlDetected) {
    console.error('🔴 Invalid links detected.');
    process.exitCode = 1;
  }
}

async function scanLinks() {
  const currentDir = process.cwd();
  const data = await getFileAndUrls(currentDir);
  const linksToCheck = data
    .filter(({ url }) => !skippedExactUrls.includes(url))
    .map(({ file, url }) => ({ file, url: url.split('#')[0] }))
    .filter(
      ({ url }) => !skippedUrls.some((skippedUrl) => url.includes(skippedUrl))
    );
  await validUrls(groupFilesByUrl(linksToCheck));
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
  'classic.yarnpkg.com', // tends to timeout on CI
  'testing-library.com/docs', // tends to fail on CI
  'babeljs.io/docs', // tends to fail on CI
  'reactnative.dev', // tends to fail on CI
  'stackoverflow.com',
  'observablehq.com',
  'example.com',
  '127.0.0.1',
  '//x.com',
  'youtube.com',
  '//youtu.be/',
  'cppreference.com',
];

const skippedExactUrls = [
  'https://docs.swmansion.com/react-native-worklets/docs',
];

const extraValidStatuses = {
  'swm-delivery.com': [204], // README banner slot with no banner booked
};

scanLinks();
