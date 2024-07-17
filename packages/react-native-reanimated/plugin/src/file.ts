import {
  blockStatement,
  booleanLiteral,
  directive,
  directiveLiteral,
  identifier,
  isBlockStatement,
  isIdentifier,
  isObjectProperty,
  objectProperty,
  returnStatement,
} from '@babel/types';

import type {
  Program,
  BlockStatement,
  VariableDeclaration,
  ArrowFunctionExpression,
  ObjectExpression,
  Statement,
  Node as BabelNode,
  ThisExpression,
  ObjectMethod,
} from '@babel/types';
import type { NodePath } from '@babel/core';
import {
  isWorkletizableFunctionPath,
  isWorkletizableObjectPath,
} from './types';
import type { ReanimatedPluginPass } from './types';
import { processClass } from './class';
import { contextObjectMarker } from './contextObject';

export function processIfWorkletFile(
  path: NodePath<Program>,
  state: ReanimatedPluginPass
): boolean {
  if (
    !path.node.directives.some(
      (functionDirective) => functionDirective.value.value === 'worklet'
    )
  ) {
    return false;
  }

  processWorkletFile(path, state);
  // Remove 'worklet' directive from the file afterwards.
  path.node.directives = path.node.directives.filter(
    (functionDirective) => functionDirective.value.value !== 'worklet'
  );
  return true;
}

/**
 * Adds a worklet directive to each viable top-level entity in the file.
 */
function processWorkletFile(
  programPath: NodePath<Program>,
  state: ReanimatedPluginPass
) {
  const statements = programPath.get('body');
  statements.forEach((statement) => {
    const candidatePath = getCandidate(statement);
    processWorkletizableEntity(
      candidatePath as NodePath<NonNullable<typeof candidatePath.node>>,
      state
    );
  });
}

function getCandidate(statementPath: NodePath<Statement>) {
  if (
    statementPath.isExportNamedDeclaration() ||
    statementPath.isExportDefaultDeclaration()
  ) {
    return statementPath.get('declaration') as NodePath<
      typeof statementPath.node.declaration
    >;
  } else {
    return statementPath;
  }
}

function processWorkletizableEntity(
  nodePath: NodePath<unknown>,
  state: ReanimatedPluginPass
) {
  if (isWorkletizableFunctionPath(nodePath)) {
    if (nodePath.isArrowFunctionExpression()) {
      replaceImplicitReturnWithBlock(nodePath.node);
    }
    appendWorkletDirective(nodePath.node.body as BlockStatement);
  } else if (isWorkletizableObjectPath(nodePath)) {
    if (isImplicitContextObject(nodePath)) {
      appendWorkletContextObjectMarker(nodePath.node);
    } else {
      processWorkletAggregator(nodePath, state);
    }
  } else if (nodePath.isVariableDeclaration()) {
    processVariableDeclaration(nodePath, state);
  } else if (nodePath.isClassDeclaration()) {
    processClass(nodePath, state);
  }
}

function processVariableDeclaration(
  variableDeclarationPath: NodePath<VariableDeclaration>,
  state: ReanimatedPluginPass
) {
  const declarations = variableDeclarationPath.get('declarations');
  declarations.forEach((declaration) => {
    const initPath = declaration.get('init');
    if (initPath.isExpression()) {
      processWorkletizableEntity(initPath, state);
    }
  });
}

function processWorkletAggregator(
  objectPath: NodePath<ObjectExpression>,
  state: ReanimatedPluginPass
) {
  const properties = objectPath.get('properties');
  properties.forEach((property) => {
    if (property.isObjectMethod()) {
      appendWorkletDirective(property.node.body);
    } else if (property.isObjectProperty()) {
      const valuePath = property.get('value');
      processWorkletizableEntity(valuePath, state);
    }
  });
}

/**
 * Replaces implicit return statements with a block statement i.e.:
 *
 * `() => 1` becomes `() => { return 1 }`
 *
 * This is necessary because the worklet directive is only allowed on block statements.
 */
function replaceImplicitReturnWithBlock(path: ArrowFunctionExpression) {
  if (!isBlockStatement(path.body)) {
    path.body = blockStatement([returnStatement(path.body)]);
  }
}

function appendWorkletDirective(node: BlockStatement) {
  if (
    !node.directives.some(
      (functionDirective) => functionDirective.value.value === 'worklet'
    )
  ) {
    node.directives.push(directive(directiveLiteral('worklet')));
  }
}

function appendWorkletContextObjectMarker(objectExpression: ObjectExpression) {
  if (
    objectExpression.properties.some(
      (value) =>
        isObjectProperty(value) &&
        isIdentifier(value.key) &&
        value.key.name === contextObjectMarker
    )
  ) {
    return;
  }

  objectExpression.properties.push(
    objectProperty(identifier(`${contextObjectMarker}`), booleanLiteral(true))
  );
}

export function isImplicitContextObject(
  path: NodePath<ObjectExpression>
): boolean {
  const propertyPaths = path.get('properties');

  return propertyPaths.some((propertyPath) => {
    if (!propertyPath.isObjectMethod()) {
      return false;
    }

    return hasThisExpression(propertyPath);
  });
}

function hasThisExpression(path: NodePath<ObjectMethod>): boolean {
  let result = false;

  path.traverse({
    ThisExpression(thisPath: NodePath<ThisExpression>) {
      result = true;
      thisPath.stop();
    },
  });

  return result;
}
