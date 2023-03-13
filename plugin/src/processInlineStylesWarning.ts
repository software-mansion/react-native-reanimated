import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';
import { isRelease } from './commonFunctions';
import { ReanimatedPluginPass } from './commonInterfaces';

function generateInlineStylesWarning(
  t: typeof BabelCore.types,
  memberExpression: BabelCore.NodePath<BabelTypes.MemberExpression>
) {
  // replaces `sharedvalue.value` with `(()=>{console.warn(require('react-native-reanimated').getUseOfValueInStyleWarning());return sharedvalue.value;})()`
  return t.callExpression(
    t.arrowFunctionExpression(
      [],
      t.blockStatement([
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('console'), t.identifier('warn')),
            [
              t.callExpression(
                t.memberExpression(
                  t.callExpression(t.identifier('require'), [
                    t.stringLiteral('react-native-reanimated'),
                  ]),
                  t.identifier('getUseOfValueInStyleWarning')
                ),
                []
              ),
            ]
          )
        ),
        t.returnStatement(memberExpression.node),
      ])
    ),
    []
  );
}

function processPropertyValueForInlineStylesWarning(
  t: typeof BabelCore.types,
  path: BabelCore.NodePath<BabelTypes.ObjectProperty['value']>
) {
  // if it's something like object.value then raise a warning
  if (t.isMemberExpression(path.node) && t.isIdentifier(path.node.property)) {
    if (path.node.property.name === 'value') {
      path.replaceWith(
        generateInlineStylesWarning(
          t,
          path as BabelCore.NodePath<BabelTypes.MemberExpression>
        )
      );
    }
  }
}

function processTransformPropertyForInlineStylesWarning(
  t: typeof BabelCore.types,
  path: BabelCore.NodePath<BabelTypes.ObjectProperty['value']>
) {
  if (t.isArrayExpression(path.node)) {
    const elements = path.get('elements') as Array<
      BabelCore.NodePath<BabelTypes.ArrayExpression['elements'][number]>
    >;
    for (const element of elements) {
      if (t.isObjectExpression(element.node)) {
        processStyleObjectForInlineStylesWarning(
          t,
          element as BabelCore.NodePath<BabelTypes.ObjectExpression>
        ); // why is it not inferred? [TO DO]
      }
    }
  }
}

function processStyleObjectForInlineStylesWarning(
  t: typeof BabelCore.types,
  path: BabelCore.NodePath<BabelTypes.ObjectExpression>
) {
  const properties = path.get('properties') as Array<
    BabelCore.NodePath<BabelTypes.ObjectExpression['properties'][number]>
  >;
  for (const property of properties) {
    if (!BabelTypes.isObjectProperty(property.node)) continue;
    const value = property.get('value') as BabelCore.NodePath<
      BabelTypes.ObjectProperty['value']
    >;
    if (t.isObjectProperty(property)) {
      if (
        t.isIdentifier(property.node.key) &&
        property.node.key.name === 'transform'
      ) {
        processTransformPropertyForInlineStylesWarning(t, value);
      } else {
        processPropertyValueForInlineStylesWarning(t, value);
      }
    }
  }
}

function processInlineStylesWarning(
  t: typeof BabelCore.types,
  path: BabelCore.NodePath<BabelTypes.JSXAttribute>,
  state: ReanimatedPluginPass
) {
  if (isRelease()) return;
  if (state.opts.disableInlineStylesWarning) return;
  if (path.node.name.name !== 'style') return;
  if (!t.isJSXExpressionContainer(path.node.value)) return;

  const expression = path
    .get('value')
    .get('expression') as BabelCore.NodePath<BabelTypes.Expression>;
  // style={[{...}, {...}]}
  if (BabelTypes.isArrayExpression(expression.node)) {
    const elements = expression.get('elements') as Array<
      BabelCore.NodePath<BabelTypes.ArrayExpression['elements'][number]>
    >;
    for (const element of elements) {
      if (t.isObjectExpression(element.node)) {
        processStyleObjectForInlineStylesWarning(
          t,
          element as BabelCore.NodePath<BabelTypes.ObjectExpression>
        ); // why is it not inferred? [TO DO]
      }
    }
  }
  // style={{...}}
  else if (t.isObjectExpression(expression.node)) {
    processStyleObjectForInlineStylesWarning(
      t,
      expression as BabelCore.NodePath<BabelTypes.ObjectExpression>
    ); // why is it not inferred? [TO DO]
  }
}

export { processInlineStylesWarning };
