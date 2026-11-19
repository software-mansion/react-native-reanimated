/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest/setupSnapshots.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^react-native-worklets/plugin$': '<rootDir>/index',
    '^react-native-worklets/package\\.json$': '<rootDir>/../package.json',
  },
  transform: {
    '^.+\\.(js|ts)$': [
      'babel-jest',
      {
        configFile: false,
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
};
