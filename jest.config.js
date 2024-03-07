module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: [
    'Example',
    'FabricExample',
    'WebExample',
    'MacOSExample',
    'TVOSExample',
    'VisionOSExample',
    'docs',
    'lib',
    '.eslintrc',
  ],
  setupFiles: ['./jest-setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testEnvironment: 'node',
  transformIgnorePatterns: [],
};
