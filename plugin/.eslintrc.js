module.exports = {
  root: true,
  extends: '../.eslintrc.js',
  extends: [
    'standard',
    'plugin:@typescript-eslint/recommended', //We overwrite this not to use type-checked rules in plugin
    'prettier',
    'plugin:import/typescript',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    'curly': 'error',
  },
  ignorePatterns: ['**/*.d.ts','jestUtils.ts']};
