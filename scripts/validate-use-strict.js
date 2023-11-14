const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../src');
const fileTypes = ['.js', '.ts', '.tsx'];

let isMissingUseStrictDetected = false;

function validateFiles(dirPath) {
  fs.readdirSync(dirPath).forEach((file) => {
    const filePath = path.join(dirPath, file);
    const isDirectory = fs.lstatSync(filePath).isDirectory();

    if (isDirectory) {
      validateFiles(filePath);
    } else if (fileTypes.includes(path.extname(file))) {
      let data = fs.readFileSync(filePath, 'utf8').trim();

      while (data.startsWith('//') || data.startsWith('/*')) {
        if (data.startsWith('//')) {
          const nextLineIndex = data.indexOf('\n');
          if (nextLineIndex !== -1) {
            data = data.slice(nextLineIndex).trim();
          } else {
            data = '';
          }
        } else if (data.startsWith('/*')) {
          const commentEndIndex = data.indexOf('*/');
          if (commentEndIndex !== -1) {
            data = data.slice(commentEndIndex + 2).trim();
          } else {
            data = '';
          }
        }
      }

      if (!data.startsWith("'use strict';")) {
        console.log(`${filePath} does not start with 'use strict';`);
        isMissingUseStrictDetected = true;
      }
    }
  });
}

validateFiles(directoryPath);

process.exit(isMissingUseStrictDetected ? 1 : 0);
