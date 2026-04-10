import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
// eslint-disable-next-line import/no-unresolved
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

export function createErrorPrefixRule<MessageId extends string>(
  prefix: string,
  messageId: MessageId
): TSESLint.RuleModule<MessageId, []> {
  return {
    create(context) {
      const sourceCode = context.getSourceCode();
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
              messageId,
              fix(fixer) {
                const closeParen = sourceCode.getLastToken(node)!;
                return fixer.insertTextBefore(closeParen, `'${prefix}'`);
              },
            });
            return;
          }

          const first = args[0];

          if (
            first.type === AST_NODE_TYPES.Literal &&
            typeof first.value === 'string'
          ) {
            if (first.value.startsWith(prefix)) {
              return;
            }
            context.report({
              node,
              messageId,
              fix(fixer) {
                return fixer.replaceText(
                  first,
                  JSON.stringify(`${prefix} ${first.value}`)
                );
              },
            });
          } else if (first.type === AST_NODE_TYPES.TemplateLiteral) {
            const firstQuasi = first.quasis[0];
            const cooked = firstQuasi.value.cooked ?? '';
            if (cooked.startsWith(prefix)) {
              return;
            }
            context.report({
              node,
              messageId,
              fix(fixer) {
                return fixer.replaceTextRange(
                  [firstQuasi.range[0] + 1, firstQuasi.range[0] + 1],
                  `${prefix} `
                );
              },
            });
          } else {
            context.report({
              node,
              messageId,
              fix(fixer) {
                const exprText = sourceCode.getText(first);
                return fixer.replaceText(
                  first,
                  `\`${prefix} \${${exprText}}\``
                );
              },
            });
          }
        },
      };
    },
    meta: {
      docs: {
        description: `Enforce that \`new Error\` messages start with "${prefix}".`,
      },
      messages: {
        [messageId]: `Error messages must start with \`${prefix}\`.`,
      } as Record<MessageId, string>,
      type: 'suggestion',
      schema: [],
      fixable: 'code',
    },
    defaultOptions: [],
  };
}
