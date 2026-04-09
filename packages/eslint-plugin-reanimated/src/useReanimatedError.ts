import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
// eslint-disable-next-line import/no-unresolved
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const PREFIX = '[Reanimated]';

const rule: TSESLint.RuleModule<'useReanimatedError', []> = {
  create(context) {
    return {
      NewExpression(node: TSESTree.NewExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.Identifier ||
          node.callee.name !== 'Error'
        ) {
          return;
        }

        const args = node.arguments;

        if (args.length === 0) {
          context.report({
            node,
            messageId: 'useReanimatedError',
            fix(fixer) {
              const closeParen = context.sourceCode.getLastToken(node)!;
              return fixer.insertTextBefore(closeParen, `'${PREFIX}'`);
            },
          });
          return;
        }

        const first = args[0];

        if (
          first.type === AST_NODE_TYPES.Literal &&
          typeof first.value === 'string'
        ) {
          if (first.value.startsWith(PREFIX)) {
            return;
          }
          context.report({
            node,
            messageId: 'useReanimatedError',
            fix(fixer) {
              return fixer.replaceText(
                first,
                JSON.stringify(`${PREFIX} ${first.value}`)
              );
            },
          });
        } else if (first.type === AST_NODE_TYPES.TemplateLiteral) {
          const firstQuasi = first.quasis[0];
          const cooked = firstQuasi.value.cooked ?? '';
          if (cooked.startsWith(PREFIX)) {
            return;
          }
          context.report({
            node,
            messageId: 'useReanimatedError',
            fix(fixer) {
              return fixer.replaceTextRange(
                [firstQuasi.range[0] + 1, firstQuasi.range[0] + 1],
                `${PREFIX} `
              );
            },
          });
        } else {
          context.report({
            node,
            messageId: 'useReanimatedError',
            fix(fixer) {
              const exprText = context.sourceCode.getText(first);
              return fixer.replaceText(first, `\`${PREFIX} \${${exprText}}\``);
            },
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description: `Enforce that \`new Error\` messages start with "${PREFIX}".`,
    },
    messages: {
      useReanimatedError: `Error messages must start with \`${PREFIX}\`.`,
    },
    type: 'suggestion',
    schema: [],
    fixable: 'code',
  },
  defaultOptions: [],
};

export default rule;
