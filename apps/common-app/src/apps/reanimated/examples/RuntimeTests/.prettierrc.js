module.exports = {
  arrowParens: 'avoid',
  bracketSameLine: true,
  overrides: [
    {
      files: '*.snapshot.ts',
      options: {
        printWidth: 1000,
      },
    },
  ],
  printWidth: 120, // Increase line width to make test cases more compact
  singleQuote: true,
  trailingComma: 'all',
};
