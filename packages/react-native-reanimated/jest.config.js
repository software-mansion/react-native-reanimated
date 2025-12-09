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
}) => ({
  ...rest,
  modulePathIgnorePatterns: [...modulePathIgnorePatterns, '<rootDir>/lib'],
  setupFiles: [...setupFiles, ...sharedSetupFiles],
  setupFilesAfterEnv: [...setupFilesAfterEnv, ...sharedSetupFilesAfterEnv],
});

const nativeProject = createProject({
  displayName: 'native',
  preset: 'react-native',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['\\.web\\.test\\.(?:js|jsx|ts|tsx)$'],
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
  projects: [nativeProject, webProject],
};
