// @ts-expect-error - jest-expo/config doesn't have type declarations
const { getWebPreset } = require('jest-expo/config');

const sharedSetupFiles = ['<rootDir>/jest/setup.js'];
const sharedSetupFilesAfterEnv = ['@testing-library/jest-native/extend-expect'];
const sharedModuleNameMapper = {
  '^react-native-reanimated$': '<rootDir>/src/index',
  '^react-native-worklets$': '<rootDir>/../react-native-worklets/src/index',
};

/**
 * @param {import('jest').Config} presetConfig
 * @returns {import('jest').Config}
 */
const createProject = ({
  modulePathIgnorePatterns = [],
  setupFiles = [],
  setupFilesAfterEnv = [],
  moduleNameMapper = {},
  ...rest
} = {}) => ({
  ...rest,
  moduleNameMapper: { ...moduleNameMapper, ...sharedModuleNameMapper },
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
    preset: '@react-native/jest-preset',
    testEnvironment: 'node',
    resolver: '<rootDir>/jest/resolver.js',
    transformIgnorePatterns: [
      'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-worklets)/)',
    ],
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
  moduleNameMapper: { '^react-native($|/.*)': ___, ...webModuleNameMapper },
  ...baseWebPreset
} = getWebPreset();

const webProject = createProject({
  ...baseWebPreset,
  moduleNameMapper: webModuleNameMapper,
  setupFiles: [...baseWebPreset.setupFiles, '<rootDir>/jest/setup.web.js'],
  displayName: 'web',
  testMatch: ['**/*.web.test.@(js|jsx|ts|tsx)'],
  testEnvironment: 'jsdom',
});

module.exports = {
  projects: [nativeProject, iosProject, androidProject, webProject],
};
