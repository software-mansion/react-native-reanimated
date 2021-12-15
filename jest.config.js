module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: ['Example', 'docs', 'lib'],
  setupFiles: [
    './jest-setup.js',
    './node_modules/react-native-gesture-handler/jestSetup.js',
  ],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: ['node_modules/?!(react-native-gesture-handler)'],
};
