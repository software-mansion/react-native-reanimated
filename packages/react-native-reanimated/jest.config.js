/** @type {import('jest').Config} */
module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: ['lib'],
  setupFiles: ['./jest-setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testEnvironment: 'node',
  maxWorkers: 3,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@testing-library|react-clone-referenced-element|@react-navigation)/)',
  ],
  transform: {
    '^.+\\.(js|ts|tsx)$': [
      'babel-jest',
      { configFile: './jest.babel.config.js', sourceMaps: false },
    ],
  },
};
