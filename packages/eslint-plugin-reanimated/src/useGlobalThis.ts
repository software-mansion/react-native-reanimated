import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
// eslint-disable-next-line import/no-unresolved
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const rule: TSESLint.RuleModule<'useGlobalThis', []> = {
  create (context) {
    return {
      Identifier(node: TSESTree.Identifier) {
        if (
          node.name === '_WORKLET' &&
          node.parent?.type !== AST_NODE_TYPES.MemberExpression
        ) {
          context.report({
            node,
            messageId: 'useGlobalThis',
            fix (fixer) {
              return fixer.replaceText(node, 'globalThis._WORKLET');
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
        'Warns when `_WORKLET` is used instead of `globalThis._WORKLET`.',
    },
    messages: {
      useGlobalThis: 'Use `globalThis._WORKLET` instead of `_WORKLET`.',
    },
    type: 'suggestion',
    schema: [],
    fixable: 'code',
  },
  defaultOptions: [],
};

export default rule;
