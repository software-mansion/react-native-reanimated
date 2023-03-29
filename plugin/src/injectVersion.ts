import { NodePath } from '@babel/core';
import {
  DirectiveLiteral,
  expressionStatement,
  assignmentExpression,
  memberExpression,
  identifier,
  stringLiteral,
  FunctionDeclaration,
} from '@babel/types';

export function injectVersion(path: NodePath<DirectiveLiteral>) {
  // We want to inject plugin's version only once,
  // hence we have a Directive Literal line in Reanimated code.
  // See src/reanimated2/platform-specific/checkPluginVersion.ts
  // to see the details of this implementation.
  if (path.node.value !== 'inject Reanimated Babel plugin version') {
    return;
  }
  const injectedName = '_REANIMATED_VERSION_BABEL_PLUGIN';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const versionString = require('../../package.json').version;
  const pluginVersionNode = expressionStatement(
    assignmentExpression(
      '=',
      memberExpression(identifier('global'), identifier(injectedName)),
      stringLiteral(versionString)
    )
  );

  const functionParent = (
    path.getFunctionParent() as NodePath<FunctionDeclaration>
  ).node;
  // DirectiveLiteral is in property of its function parent 'directives' hence we cannot just replace it.
  functionParent.body.directives = [];
  functionParent.body.body.unshift(pluginVersionNode);
}
