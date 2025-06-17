import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
// eslint-disable-next-line import/no-unresolved
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const rule: TSESLint.RuleModule<'useWorkletsError', []> = {
  create(context) {
    return {
      NewExpression(node: TSESTree.NewExpression) {
        // Check if the expression is `new Error`
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'Error'
        ) {
          context.report({
            node,
            messageId: 'useWorkletsError',
            fix(fixer) {
              // Replace `Error` with `WorkletsError`
              return fixer.replaceText(node.callee, 'WorkletsError');
            },
          });
        }
      },
    };
  },
  meta: {
    docs: {
      // recommended: 'recommended',
      description:
        'Warns when `new Error` is used instead of `new WorkletsError`.',
    },
    messages: {
      useWorkletsError: 'Use `new WorkletsError` instead of `new Error`.',
    },
    type: 'suggestion',
    schema: [],
    fixable: 'code',
  },
  defaultOptions: [],
};

export default rule;
