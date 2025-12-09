const darkTheme = require('prism-react-renderer').themes.github;

module.exports = {
  ...darkTheme,
  plain: {
    color: 'var(--swm-navy-light-40)',
  },
  styles: [
    ...darkTheme.styles,
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {
        color: 'var(--swm-navy-light-60)',
        fontStyle: 'italic',
      },
    },
    {
      types: ['namespace'],
      style: {
        opacity: 0.7,
      },
    },
    {
      types: ['string', 'property', 'atrule', 'selector', 'tag'],
      style: {
        color: 'var(--swm-navy-light-40)',
      },
    },
    {
      types: ['punctuation'],
      style: {
        color: 'var(--swm-green-light-80)',
      },
    },
    {
      types: ['inserted'],
      style: {
        color: 'var(--codeblock-diff-inserted-color-dark)',
        backgroundColor: 'var(--codeblock-diff-inserted-background-dark)',
      },
    },
    {
      types: ['deleted'],
      style: {
        color: 'var(--codeblock-diff-deleted-color-dark)',
        backgroundColor: 'var(--codeblock-diff-deleted-background-dark)',
      },
    },
    {
      types: [
        'entity',
        'url',
        'symbol',
        'number',
        'boolean',
        'variable',
        'constant',
        'regex',
        'operator',
        'attr-value',
      ],
      style: {
        color: 'var(--swm-red-light-80)',
      },
    },
    {
      types: ['function', 'function-variable'],
      style: {
        color: 'var(--swm-purple-light-80)',
      },
    },
    {
      types: ['property', 'module', 'attr-name', 'keyword'],
      style: {
        color: 'var(--swm-blue-light-80)',
      },
    },
  ],
};
