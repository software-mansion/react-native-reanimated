/** @type {import('jest').Config} */
module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: ['lib'],
  setupFiles: ['./jest-setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testEnvironment: 'node',
  transformIgnorePatterns: [],
};
