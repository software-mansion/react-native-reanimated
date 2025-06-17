import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
// eslint-disable-next-line import/no-unresolved
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const rule: TSESLint.RuleModule<'useReanimatedError', []> = {
  create (context) {
    return {
      NewExpression(node: TSESTree.NewExpression) {
        // Check if the expression is `new Error`
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'Error'
        ) {
          context.report({
            node,
            messageId: 'useReanimatedError',
            fix (fixer) {
              // Replace `Error` with `ReanimatedError`
              return fixer.replaceText(node.callee, 'ReanimatedError');
            },
          });
        }
      },
    };
  },
  meta: {
    docs: {
      recommended: 'recommended',
      description:
        'Warns when `new Error` is used instead of `new ReanimatedError`.',
    },
    messages: {
      useReanimatedError: 'Use `new ReanimatedError` instead of `new Error`.',
    },
    type: 'suggestion',
    schema: [],
    fixable: 'code',
  },
  defaultOptions: [],
};

export default rule;
