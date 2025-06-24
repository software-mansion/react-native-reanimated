import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
// eslint-disable-next-line import/no-unresolved
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const PACKAGES = ['react-native-reanimated', 'react-native-worklets'] as const;

const detectPackage = (filePath: string) =>
  PACKAGES.find(
    (pkg) => filePath.includes(`${pkg}/`) || filePath.includes(`${pkg}\\`)
  );

const findLoggerImport = (
  body: TSESTree.Statement[]
): TSESTree.ImportDeclaration | undefined =>
  body.find(
    (n): n is TSESTree.ImportDeclaration =>
      n.type === AST_NODE_TYPES.ImportDeclaration &&
      n.specifiers.some((s) => s.local.name === 'logger')
  );

const rule: TSESLint.RuleModule<'wrongLoggerImport', []> = {
  create(context) {
    return {
      'Program:exit'(program: TSESTree.Program) {
        const pkg = detectPackage(context.filename);
        if (!pkg) {
          return;
        }

        const imp = findLoggerImport(program.body);
        if (!imp || imp.source.type !== AST_NODE_TYPES.Literal) {
          return;
        }

        const foreignPkg = PACKAGES.find(
          (p) => p !== pkg && String(imp.source.value).includes(p)
        );
        if (!foreignPkg) {
          return;
        }

        // Show error under the logger specified in the import
        const loggerSpecifier = imp.specifiers.find(
          (s) => s.local.name === 'logger'
        );

        context.report({
          node: loggerSpecifier?.local ?? imp.source,
          messageId: 'wrongLoggerImport',
          data: { foreignPkg },
        });
      },
    };
  },
  meta: {
    docs: {
      recommended: 'recommended',
      description: 'Require the use of logger from the local package.',
    },
    messages: {
      wrongLoggerImport:
        'Logger must be imported from the local package; current import points to "{{ foreignPkg }}".',
    },
    type: 'problem',
    schema: [],
  },
  defaultOptions: [],
};

export default rule;
