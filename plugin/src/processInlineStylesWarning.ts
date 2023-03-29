import { NodePath } from '@babel/core';
import {
  MemberExpression,
  callExpression,
  arrowFunctionExpression,
  isMemberExpression,
  isArrayExpression,
  isObjectExpression,
  ArrayExpression,
  ObjectExpression,
  isObjectProperty,
  JSXAttribute,
  isJSXExpressionContainer,
  Expression,
  identifier,
  stringLiteral,
  expressionStatement,
  memberExpression,
  returnStatement,
  blockStatement,
  ObjectProperty,
  isIdentifier,
} from '@babel/types';
import { isRelease } from './utils';
import { ReanimatedPluginPass } from './types';

function generateInlineStylesWarning(path: NodePath<MemberExpression>) {
  // replaces `sharedvalue.value` with `(()=>{console.warn(require('react-native-reanimated').getUseOfValueInStyleWarning());return sharedvalue.value;})()`
  return callExpression(
    arrowFunctionExpression(
      [],
      blockStatement([
        expressionStatement(
          callExpression(
            memberExpression(identifier('console'), identifier('warn')),
            [
              callExpression(
                memberExpression(
                  callExpression(identifier('require'), [
                    stringLiteral('react-native-reanimated'),
                  ]),
                  identifier('getUseOfValueInStyleWarning')
                ),
                []
              ),
            ]
          )
        ),
        returnStatement(path.node),
      ])
    ),
    []
  );
}

function processPropertyValueForInlineStylesWarning(
  path: NodePath<ObjectProperty['value']>
) {
  // if it's something like object.value then raise a warning
  if (isMemberExpression(path.node) && isIdentifier(path.node.property)) {
    if (path.node.property.name === 'value') {
      path.replaceWith(
        generateInlineStylesWarning(path as NodePath<MemberExpression>)
      );
    }
  }
}

function processTransformPropertyForInlineStylesWarning(
  path: NodePath<ObjectProperty['value']>
) {
  if (isArrayExpression(path.node)) {
    const elements = path.get('elements') as Array<
      NodePath<ArrayExpression['elements'][number]>
    >;
    for (const element of elements) {
      if (isObjectExpression(element.node)) {
        processStyleObjectForInlineStylesWarning(
          element as NodePath<ObjectExpression>
        ); // why is it not inferred? [TO DO]
      }
    }
  }
}

function processStyleObjectForInlineStylesWarning(
  path: NodePath<ObjectExpression>
) {
  const properties = path.get('properties') as Array<
    NodePath<ObjectExpression['properties'][number]>
  >;
  for (const property of properties) {
    if (!isObjectProperty(property.node)) continue;
    const value = property.get('value') as NodePath<ObjectProperty['value']>;
    if (isObjectProperty(property)) {
      if (
        isIdentifier(property.node.key) &&
        property.node.key.name === 'transform'
      ) {
        processTransformPropertyForInlineStylesWarning(value);
      } else {
        processPropertyValueForInlineStylesWarning(value);
      }
    }
  }
}

export function processInlineStylesWarning(
  path: NodePath<JSXAttribute>,
  state: ReanimatedPluginPass
) {
  if (isRelease()) return;
  if (state.opts.disableInlineStylesWarning) return;
  if (path.node.name.name !== 'style') return;
  if (!isJSXExpressionContainer(path.node.value)) return;

  const expression = path
    .get('value')
    .get('expression') as NodePath<Expression>;
  // style={[{...}, {...}]}
  if (isArrayExpression(expression.node)) {
    const elements = expression.get('elements') as Array<
      NodePath<ArrayExpression['elements'][number]>
    >;
    for (const element of elements) {
      if (isObjectExpression(element.node)) {
        processStyleObjectForInlineStylesWarning(
          element as NodePath<ObjectExpression>
        ); // why is it not inferred? [TO DO]
      }
    }
  }
  // style={{...}}
  else if (isObjectExpression(expression.node)) {
    processStyleObjectForInlineStylesWarning(
      expression as NodePath<ObjectExpression>
    ); // why is it not inferred? [TO DO]
  }
}
