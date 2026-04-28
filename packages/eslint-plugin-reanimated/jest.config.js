/** @type {import('jest').Config} */
module.exports = {
  preset: '@react-native/jest-preset',
  modulePathIgnorePatterns: ['lib'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testEnvironment: 'node',
  transformIgnorePatterns: [],
};
