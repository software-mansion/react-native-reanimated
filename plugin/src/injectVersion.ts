import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';
import reanimatedPluginVersion from '../../package.json';

export function injectVersion(
  path: BabelCore.NodePath<BabelTypes.DirectiveLiteral>
) {
  // We want to inject plugin's version only once,
  // hence we have a Directive Literal line in Reanimated code.
  // See src/reanimated2/platform-specific/checkPluginVersion.ts
  // to see the details of this implementation.
  if (path.node.value !== 'inject Reanimated Babel plugin version') {
    return;
  }
  const injectedName = '_REANIMATED_VERSION_BABEL_PLUGIN';
  const versionString = reanimatedPluginVersion.version;
  const pluginVersionNode = BabelTypes.expressionStatement(
    BabelTypes.assignmentExpression(
      '=',
      BabelTypes.memberExpression(
        BabelTypes.identifier('global'),
        BabelTypes.identifier(injectedName)
      ),
      BabelTypes.stringLiteral(versionString)
    )
  );

  const functionParent = (
    path.getFunctionParent() as BabelCore.NodePath<BabelTypes.FunctionDeclaration>
  ).node;
  // DirectiveLiteral is in property of its function parent 'directives' hence we cannot just replace it.
  functionParent.body.directives = [];
  functionParent.body.body.unshift(pluginVersionNode);
}
