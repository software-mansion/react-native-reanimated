module.exports = {
  root: true,
  extends: '../.eslintrc.js',
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    'curly': 'error',
  },
  ignorePatterns: ['**/*.d.ts','jestUtils.ts']};
