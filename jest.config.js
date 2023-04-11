module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: ['Example', 'FabricExample', 'docs', 'lib'],
  setupFiles: ['./jest-setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testEnvironment: 'node',
  transformIgnorePatterns: ['//node_modules/react-native-web'],
};
