module.exports = {
  source: 'src',
  output: 'lib',
  targets: [
    [
      'module',
      {
        esm: true,
        jsxRuntime: 'automatic',
      },
    ],
    'typescript',
  ],
};
