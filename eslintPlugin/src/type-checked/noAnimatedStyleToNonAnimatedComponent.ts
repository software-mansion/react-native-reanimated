import { ESLintUtils, TSESLint } from '@typescript-eslint/utils';

const rule: TSESLint.RuleModule<'loopOverEnum'> = {
  create: function (context) {
    return {
      Identifier(node) {
        context.report({
          messageId: 'loopOverEnum',
          node: node,
        });
      },
    };
  },
  meta: {
    docs: {
      recommended: 'error',
      description: 'Avoid looping over enums.',
    },
    messages: {
      loopOverEnum: 'Do not loop over enums.',
    },
    type: 'suggestion',
    schema: [],
  },
  defaultOptions: [],
};

export default rule;
