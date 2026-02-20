// @ts-expect-error - jest-expo/config doesn't have type declarations
const { getWebPreset } = require('jest-expo/config');

const sharedSetupFiles = ['<rootDir>/jest/setup.js'];
const sharedSetupFilesAfterEnv = ['@testing-library/jest-native/extend-expect'];

/**
 * @param {import('jest').Config} presetConfig
 * @returns {import('jest').Config}
 */
const createProject = ({
  modulePathIgnorePatterns = [],
  setupFiles = [],
  setupFilesAfterEnv = [],
  ...rest
} = {}) => ({
  ...rest,
  modulePathIgnorePatterns: [...modulePathIgnorePatterns, '<rootDir>/lib'],
  setupFiles: [...setupFiles, ...sharedSetupFiles],
  setupFilesAfterEnv: [...setupFilesAfterEnv, ...sharedSetupFilesAfterEnv],
});

/**
 * @param {import('jest').Config} config
 * @returns {import('jest').Config}
 */
const createReactNativeProject = (config = {}) =>
  createProject({
    preset: 'react-native',
    testEnvironment: 'node',
    resolver: 'react-native-worklets/jest/resolver',
    ...config,
  });

const nativeProject = createReactNativeProject({
  displayName: 'native',
  testRegex: '.*(?<!\\.(?:ios|android|web))\\.test\\.(?:js|jsx|ts|tsx)$',
});

const iosProject = createReactNativeProject({
  displayName: 'ios',
  testMatch: ['**/*.ios.test.@(js|jsx|ts|tsx)'],
  setupFiles: ['<rootDir>/jest/setup.ios.js'],
});

const androidProject = createReactNativeProject({
  displayName: 'android',
  testMatch: ['**/*.android.test.@(js|jsx|ts|tsx)'],
  setupFiles: ['<rootDir>/jest/setup.android.js'],
});

const {
  snapshotResolver: _,
  watchPlugins: __,
  ...baseWebPreset
} = getWebPreset();

const webProject = createProject({
  ...baseWebPreset,
  setupFiles: [...baseWebPreset.setupFiles, '<rootDir>/jest/setup.web.js'],
  displayName: 'web',
  testMatch: ['**/*.web.test.@(js|jsx|ts|tsx)'],
  testEnvironment: 'jsdom',
});

module.exports = {
  projects: [nativeProject, iosProject, androidProject, webProject],
};
