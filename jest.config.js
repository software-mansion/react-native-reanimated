module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: ['Example', 'docs', 'lib'],
  setupFiles: ['./jest-setup.js'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
};
