import type { NodePath } from '@babel/core';
import type {
  MemberExpression,
  ObjectExpression,
  JSXAttribute,
  ObjectProperty,
} from '@babel/types';
import {
  callExpression,
  arrowFunctionExpression,
  isArrayExpression,
  isJSXExpressionContainer,
  identifier,
  stringLiteral,
  expressionStatement,
  memberExpression,
  returnStatement,
  blockStatement,
  isIdentifier,
} from '@babel/types';
import { isRelease } from './utils';
import type { ReanimatedPluginPass } from './types';
import { strict as assert } from 'assert';

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
  if (path.isMemberExpression() && isIdentifier(path.node.property)) {
    if (path.node.property.name === 'value') {
      path.replaceWith(generateInlineStylesWarning(path));
    }
  }
}

function processTransformPropertyForInlineStylesWarning(
  path: NodePath<ObjectProperty['value']>
) {
  if (isArrayExpression(path.node)) {
    const elements = path.get('elements');
    assert(
      Array.isArray(elements),
      '[Reanimated] `elements` should be an array.'
    );
    for (const element of elements) {
      if (element.isObjectExpression()) {
        processStyleObjectForInlineStylesWarning(element);
      }
    }
  }
}

function processStyleObjectForInlineStylesWarning(
  path: NodePath<ObjectExpression>
) {
  const properties = path.get('properties');
  for (const property of properties) {
    if (property.isObjectProperty()) {
      const value = property.get('value');
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
  if (isRelease()) {
    return;
  }
  if (state.opts.disableInlineStylesWarning) {
    return;
  }
  if (path.node.name.name !== 'style') {
    return;
  }
  if (!isJSXExpressionContainer(path.node.value)) {
    return;
  }

  const expression = path.get('value').get('expression');
  // style={[{...}, {...}]}
  assert(
    !Array.isArray(expression),
    '[Reanimated] `expression` should not be an array.'
  );
  if (expression.isArrayExpression()) {
    const elements = expression.get('elements');
    assert(
      Array.isArray(elements),
      '[Reanimated] `elements` should be an array.'
    );
    for (const element of elements) {
      if (element.isObjectExpression()) {
        processStyleObjectForInlineStylesWarning(element);
      }
    }
  }
  // style={{...}}
  else if (expression.isObjectExpression()) {
    processStyleObjectForInlineStylesWarning(expression);
  }
}
