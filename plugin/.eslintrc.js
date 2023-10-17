module.exports = {
  root: true,
  extends: '../.eslintrc.js',
  rules:{
    '@typescript-eslint/no-use-before-define':'off'
  },
  ignorePatterns: ['**/*.d.ts','jestUtils.ts']
};
