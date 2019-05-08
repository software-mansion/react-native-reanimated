/* @flow */

import path from 'path';
import fs from 'fs';

const root = path.join(__dirname, '..');
const dist = path.join(__dirname, 'dist');
const assets = [
  path.join(__dirname, 'assets', 'gallery'),
  path.join(__dirname, 'assets', 'showcase'),
  path.join(__dirname, 'assets', 'screenshots'),
  path.join(__dirname, 'assets', 'images'),
];
const styles = [path.join(__dirname, 'assets', 'styles.css')];
const scripts = [path.join(__dirname, 'assets', 'snack.js')];
const github =
  'https://github.com/kmagiera/react-native-reanimated/edit/master/';

if (!fs.existsSync(dist)) {
  fs.mkdirSync(dist);
}

function getType(file: string) {
  if (file.endsWith('.js')) {
    return 'custom';
  } else if (file.endsWith('.mdx')) {
    return 'mdx';
  }
  return 'md';
}

const docs = fs
  .readdirSync(path.join(__dirname, 'pages'))
  .filter(file => file.includes('.'))
  .map(file => ({
    file: path.join(__dirname, 'pages', file),
    type: getType(file),
  }));

module.exports = {
  root,
  logo: 'images/logo.svg',
  assets,
  styles,
  scripts,
  pages: docs,
  output: dist,
  github,
};
