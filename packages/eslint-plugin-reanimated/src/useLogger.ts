import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
// eslint-disable-next-line import/no-unresolved
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const rule: TSESLint.RuleModule<'useLogger', []> = {
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const { callee } = node;

        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          !callee.computed &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'console' &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          (callee.property.name === 'warn' || callee.property.name === 'error')
        ) {
          const method = callee.property.name;

          context.report({
            node: callee,
            messageId: 'useLogger',
            data: { method },
            fix(fixer) {
              return fixer.replaceText(callee.object, 'logger');
            },
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        'Require the use of logger instead of console for warnings and errors.',
    },
    messages: {
      useLogger: 'Use logger.{{ method }}() instead of console.{{ method }}().',
    },
    type: 'problem',
    schema: [],
    fixable: 'code',
  },
  defaultOptions: [],
};

export default rule;
