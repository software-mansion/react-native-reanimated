const { builtinRules } = require('eslint/use-at-your-own-risk');

const ruleNames = ['camelcase', 'consistent-this', 'no-undef-init'];

const strict = builtinRules.get('strict');

module.exports = {
  meta: { name: 'eslint-core' },
  rules: {
    ...Object.fromEntries(
      ruleNames.map((name) => [name, builtinRules.get(name)])
    ),
    strict: {
      meta: strict.meta,
      create: (context) => {
        const { Program, ...rest } = strict.create(
          Object.create(context, {
            languageOptions: { value: { parserOptions: {} } },
          })
        );
        return {
          ...rest,
          Program: (node) => Program({ ...node, sourceType: 'script' }),
        };
      },
    },
  },
};
