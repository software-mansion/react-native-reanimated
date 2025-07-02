import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
// eslint-disable-next-line import/no-unresolved
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const PREFIX_REGEX = /^\s*(\[(?:Reanimated|Worklets)\])\s*/;

const rule: TSESLint.RuleModule<'noLoggerMessagePrefix', []> = {
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const { callee, arguments: args } = node;

        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          !callee.computed &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'logger' &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          (callee.property.name === 'warn' ||
            callee.property.name === 'error') &&
          args.length > 0
        ) {
          const first = args[0];

          if (
            first.type === AST_NODE_TYPES.Literal &&
            typeof first.value === 'string'
          ) {
            const match = first.value.match(PREFIX_REGEX);

            if (!match) {
              return;
            }

            context.report({
              node: first,
              messageId: 'noLoggerMessagePrefix',
              data: { prefix: match[1] },
              fix(fixer) {
                const without = first.value.replace(PREFIX_REGEX, '');
                return fixer.replaceText(first, JSON.stringify(without));
              },
            });
          } else if (first.type === AST_NODE_TYPES.TemplateLiteral) {
            const firstQuasi = first.quasis[0];
            const cooked = firstQuasi.value.cooked ?? '';
            const match = cooked.match(PREFIX_REGEX);

            if (!match) {
              return;
            }

            context.report({
              node: first,
              messageId: 'noLoggerMessagePrefix',
              data: { prefix: match[1] },
              fix(fixer) {
                const prefixLen = match[0].length;
                const removeStart = firstQuasi.range[0] + 1;
                const removeEnd = removeStart + prefixLen;
                return fixer.removeRange([removeStart, removeEnd]);
              },
            });
          }
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        'Disallow redundant prefix that the logger adds automatically.',
    },
    messages: {
      noLoggerMessagePrefix:
        'Remove the redundant "{{prefix}}" prefix; it is added automatically.',
    },
    type: 'problem',
    schema: [],
    fixable: 'code',
  },
  defaultOptions: [],
};

export default rule;
