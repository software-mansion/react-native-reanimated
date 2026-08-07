/** @type {import('jest').Config} */
module.exports = {
  preset: '@react-native/jest-preset',
  modulePathIgnorePatterns: ['lib'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/plugin/'],
  transformIgnorePatterns: [],
};
