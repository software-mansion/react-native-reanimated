import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

const rule: TSESLint.RuleModule<'useWorkletsResolver', []> = {
  create: function (context) {
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const workletsRegex = /\/worklets[/.*]?/;
        if (node.source.value.match(workletsRegex)) {
          const replacement = node.source.value.replace(
            workletsRegex,
            '/WorkletsResolver'
          );

          context.report({
            node,
            messageId: 'useWorkletsResolver',
            fix: function (fixer) {
              return fixer.replaceText(node.source, `'${replacement}'`);
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
        "Warns when `react-native-reanimated` doesn't use `WorkletsResolver` to import worklets' files`.",
    },
    messages: {
      useWorkletsResolver: "Import worklets' files via WorkletsResolver.",
    },
    type: 'suggestion',
    schema: [],
    fixable: 'code',
  },
  defaultOptions: [],
};

export default rule;
