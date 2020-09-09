const fs = require('fs');
const path = require('path');

const cwd = process.cwd();

// check if in Example directory
const cwdSplit = cwd.split(path.sep);
if (cwdSplit[cwdSplit.length - 1] !== 'Example') {
  console.log('invalid path, please enter the Example directory');
  process.exit(1);
}

const inputPath = cwd + path.sep + 'index-template.js';
const outputPath = cwd + path.sep + 'index.js';
// read command line arguments
const args = [];
process.argv.forEach((value, index) => {
  if (index <= 1) return;
  args.push(value);
});

console.log(`reading file ${inputPath}`);
let content = fs.readFileSync(inputPath).toString();

// replace
const replaces = {
  component: ['App', 'WebApp', 'TestApp', 'TestSuite'],
  path: ['./src/App', './src/WebApp', './test/TestApp', './test-suite/App'],
};

let replaceIndex = 0;
if (args.indexOf('--web') !== -1) replaceIndex = 1;
else if (args.indexOf('--test') !== -1) replaceIndex = 2;
else if (args.indexOf('--test-suite') !== -1) replaceIndex = 3;

Object.keys(replaces).forEach((key) => {
  content = content.split('${' + key + '}').join(replaces[key][replaceIndex]);
});

console.log(`writing to ${outputPath}`);
fs.writeFileSync(outputPath, content, function(err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
});

process.exit(0);
