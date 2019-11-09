module.exports = {
  preset: 'react-native',
  roots: ['<rootDir>'],
  "transform": {
    "^.+\\.js$": "<rootDir>/node_modules/react-native/jest/preprocessor.js"
  },
  modulePathIgnorePatterns: ['Example'],
  modulePaths: ['<rootDir>'],
  setupFiles: ['<rootDir>/jestSetup.js']
};
