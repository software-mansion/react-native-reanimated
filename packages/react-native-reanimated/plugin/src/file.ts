import {
  blockStatement,
  directive,
  directiveLiteral,
  isArrowFunctionExpression,
  isBlockStatement,
  isExportDefaultDeclaration,
  isExportNamedDeclaration,
  isExpression,
  isVariableDeclaration,
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
} from '@babel/types';
import type { NodePath } from '@babel/core';
import {
  isWorkletizableFunctionNode,
  isWorkletizableObjectNode,
} from './types';
import type { ReanimatedPluginPass } from './types';

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
  path: NodePath<Program>,
  _state: ReanimatedPluginPass
) {
  path.node.body.forEach((statement) => {
    const candidate = getNodeCandidate(statement);
    if (candidate === null || candidate === undefined) {
      return;
    }
    processWorkletizableEntity(candidate);
  });
}

function getNodeCandidate(statement: Statement) {
  if (
    isExportNamedDeclaration(statement) ||
    isExportDefaultDeclaration(statement)
  ) {
    return statement.declaration;
  } else {
    return statement;
  }
}

function processWorkletizableEntity(node: BabelNode) {
  if (isWorkletizableFunctionNode(node)) {
    if (isArrowFunctionExpression(node)) {
      replaceImplicitReturnWithBlock(node);
    }
    appendWorkletDirective(node.body as BlockStatement);
  } else if (isWorkletizableObjectNode(node)) {
    processObjectExpression(node);
  } else if (isVariableDeclaration(node)) {
    processVariableDeclaration(node);
  }
}

function processVariableDeclaration(variableDeclaration: VariableDeclaration) {
  variableDeclaration.declarations.forEach((declaration) => {
    const init = declaration.init;
    if (isExpression(init)) {
      processWorkletizableEntity(init);
    }
  });
}

function processObjectExpression(object: ObjectExpression) {
  object.properties.forEach((property) => {
    if (property.type === 'ObjectMethod') {
      appendWorkletDirective(property.body);
    } else if (property.type === 'ObjectProperty') {
      const value = property.value;
      processWorkletizableEntity(value);
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
