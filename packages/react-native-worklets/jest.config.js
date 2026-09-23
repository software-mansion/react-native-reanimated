const rnJestPreset = require('@react-native/jest-preset');

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'native',
      preset: '@react-native/jest-preset',
      testEnvironment: 'node',
      modulePathIgnorePatterns: ['lib'],
      moduleNameMapper: {
        ...rnJestPreset.moduleNameMapper,
        '^react-native-worklets$': '<rootDir>/src/index',
        '^react-native-worklets/(.*)$': ['<rootDir>/src/$1', '<rootDir>/$1'],
      },
      transformIgnorePatterns: [],
      testMatch: ['<rootDir>/__tests__/**/*.native.test.ts'],
    },
    {
      displayName: 'web',
      testEnvironment: 'node',
      globals: {
        __DEV__: true,
      },
      modulePathIgnorePatterns: ['lib'],
      moduleNameMapper: {
        '^react-native-worklets$': '<rootDir>/src/index',
        '^react-native-worklets/(.*)$': ['<rootDir>/src/$1', '<rootDir>/$1'],
      },
      transform: {
        '^.+\\.(js|ts|tsx)$': 'babel-jest',
      },
      transformIgnorePatterns: [],
      testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
      testPathIgnorePatterns: ['\\.native\\.test\\.ts$'],
    },
  ],
};
