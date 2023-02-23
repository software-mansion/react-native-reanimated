import { NodePath, PluginPass } from '@babel/core';
import {
  CallExpression,
  isSequenceExpression,
  isObjectExpression,
  Expression,
  isMemberExpression,
  ObjectMethod,
  ObjectProperty,
  isObjectMethod,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression,
  identifier,
  isIdentifier,
  isFunctionParent,
  objectProperty,
  callExpression,
  isScopable,
  isExportNamedDeclaration,
  isArrowFunctionExpression,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { functionArgsToWorkletize, objectHooks } from './commonObjects';
import { makeWorklet } from './makeWorklet';

export function processWorkletFunction(
  fun: NodePath<
    FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
  >,
  state: PluginPass
) {
  // Replaces FunctionDeclaration, FunctionExpression or ArrowFunctionExpression
  // with a workletized version of itself.

  if (!isFunctionParent(fun)) {
    return;
  }

  const newFun = makeWorklet(fun, state);

  const replacement = callExpression(newFun, []);

  // we check if function needs to be assigned to variable declaration.
  // This is needed if function definition directly in a scope. Some other ways
  // where function definition can be used is for example with variable declaration:
  // const ggg = function foo() { }
  // ^ in such a case we don't need to define variable for the function
  const needDeclaration =
    isScopable(fun.parent) || isExportNamedDeclaration(fun.parent);
  fun.replaceWith(
    !isArrowFunctionExpression(fun.node) && fun.node.id && needDeclaration
      ? variableDeclaration('const', [
          variableDeclarator(fun.node.id, replacement),
        ])
      : replacement
  );
}

function processWorkletObjectMethod(
  path: NodePath<ObjectMethod>,
  state: PluginPass
) {
  // Replaces ObjectMethod with a workletized version of itself.

  if (!isFunctionParent(path)) return;

  const newFun = makeWorklet(path, state);

  const replacement = objectProperty(
    identifier(isIdentifier(path.node.key) ? path.node.key.name : ''),
    callExpression(newFun, [])
  );

  path.replaceWith(replacement);
}

export function processWorklets(
  path: NodePath<CallExpression>,
  state: PluginPass
) {
  const callee = isSequenceExpression(path.node.callee)
    ? path.node.callee.expressions[path.node.callee.expressions.length - 1]
    : path.node.callee;

  const name = isMemberExpression(callee) // @ts-expect-error [TO DO]
    ? callee.property.name // @ts-expect-error [TO DO]
    : callee.name;

  if (
    objectHooks.has(name) &&
    isObjectExpression((path.get('arguments.0') as NodePath<Expression>).node)
  ) {
    const properties = path.get('arguments.0.properties') as Array<
      NodePath<ObjectMethod | ObjectProperty>
    >;
    for (const property of properties) {
      if (isObjectMethod(property.node)) {
        processWorkletObjectMethod(property as NodePath<ObjectMethod>, state);
      } else {
        const value = property.get('value') as NodePath<Expression>;
        processWorkletFunction(
          value as NodePath<
            FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
          >,
          state
        ); // temporarily given 3 types [TO DO]
      }
    }
  } else {
    const indexes = functionArgsToWorkletize.get(name);
    if (Array.isArray(indexes)) {
      indexes.forEach((index) => {
        processWorkletFunction(
          path.get(`arguments.${index}`) as NodePath<
            FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
          >,
          state
        ); // temporarily given 3 types [TO DO]
      });
    }
  }
}
