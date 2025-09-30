/** @type {import('jest').Config} */
module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: ['lib'],
  testEnvironment: 'node',
  transformIgnorePatterns: [],
  moduleFileExtensions: [
    'web.ts',
    'web.tsx',
    'web.js',
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
  ],
};
