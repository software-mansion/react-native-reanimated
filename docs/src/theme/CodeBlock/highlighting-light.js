const lightTheme = require('prism-react-renderer/themes/github');

module.exports = {
  ...lightTheme,
  plain: {
    color: 'var(--swm-navy-light-80)',
  },
  styles: [
    ...lightTheme.styles,
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {
        color: 'var(--swm-navy-light-40)',
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
        color: 'var(--swm-navy-light-80)',
      },
    },
    {
      types: ['punctuation'],
      style: {
        color: 'var(--swm-green-light-100)',
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
        'inserted',
        'operator',
        'attr-value',
      ],
      style: {
        color: 'var(--swm-red-light-100)',
      },
    },
    {
      types: ['function', 'function-variable', 'deleted'],
      style: {
        color: 'var(--swm-purple-light-100)',
      },
    },
    {
      types: ['property', 'module', 'attr-name', 'keyword'],
      style: {
        color: 'var(--swm-blue-light-100)',
      },
    },
  ],
};
