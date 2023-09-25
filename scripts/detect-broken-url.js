/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

let isBrokenUrlDetected = false;

const scanDirectory = (directoryPath) => {  
  const fileNames = fs.readdirSync(directoryPath);
  fileNames.forEach((fileName) => {
    const filePath = path.join(directoryPath, fileName);
    if (fs.statSync(filePath).isDirectory()) {
      scanDirectory(filePath);
    } else {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const urls = fileContent.match(/https?:\/\/[^\s/$.?#].[^\s]*/g);
      if (urls) {
        urls.forEach((url) => {
          fetch(url).then((response) => {
            if (response.status === 404) {
              console.log(`URL ${url} returned 404 status.\nThe broken URL comes from file: ${filePath}\n`);
              isBrokenUrlDetected = true;
            }
          }).catch((error) => {
            console.log(`Error checking URL ${url}:`, error.message);
          });
        });
      }
    }
  });
};

const scanDirectories = (directoryPaths) => {
  directoryPaths.forEach((directoryPath) => {
    scanDirectory(directoryPath);
  });
  if (isBrokenUrlDetected) {
    process.exit(1);
  }
}

scanDirectories(['./src', './plugin/src', './apple', './android/src', './Common']);
