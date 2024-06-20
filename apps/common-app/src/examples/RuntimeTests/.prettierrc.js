module.exports = {
  arrowParens: 'avoid',
  bracketSameLine: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 120, // Increase line width to make test cases more compact
  overrides: [
    {
      files: '*.snapshot.ts',
      options: {
        printWidth: 1000,
      },
    },
  ],
};
