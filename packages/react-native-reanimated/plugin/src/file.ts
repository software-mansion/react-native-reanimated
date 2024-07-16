import {
  blockStatement,
  directive,
  directiveLiteral,
  returnStatement,
} from '@babel/types';

import type {
  Expression,
  Program,
  BlockStatement,
  VariableDeclaration,
  ArrowFunctionExpression,
  ObjectExpression,
  Statement,
} from '@babel/types';
import type { NodePath } from '@babel/core';
import {
  isWorkletizableFunctionType,
  isWorkletizableObjectType,
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
  path.get('body').forEach((bodyPath) => {
    const candidatePath = getNodePathCandidate(bodyPath);
    if (isWorkletizableFunctionType(candidatePath)) {
      if (candidatePath.isArrowFunctionExpression()) {
        replaceImplicitReturnWithBlock(candidatePath);
      }
      appendWorkletDirective(candidatePath.node.body as BlockStatement);
    } else if (isWorkletizableObjectType(candidatePath)) {
      processObjectExpression(candidatePath);
    } else if (candidatePath.isVariableDeclaration()) {
      processVariableDeclaration(candidatePath);
    }
  });
}

function getNodePathCandidate(path: NodePath<Statement>): NodePath<unknown> {
  if (path.isExportNamedDeclaration() || path.isExportDefaultDeclaration()) {
    return path.get('declaration') as NodePath<typeof path.node.declaration>;
  } else {
    return path;
  }
}

function processWorkletizableEntity(path: NodePath) {
  if (isWorkletizableFunctionType(path)) {
    if (path.isArrowFunctionExpression()) {
      replaceImplicitReturnWithBlock(path);
    }

    appendWorkletDirective(path.node.body as BlockStatement);
  } else if (isWorkletizableObjectType(path)) {
    processObjectExpression(path);
  }
}

function processVariableDeclaration(path: NodePath<VariableDeclaration>) {
  path.get('declarations').forEach((declaration) => {
    const initPath = declaration.get('init');
    if (initPath.isExpression()) {
      processWorkletizableEntity(initPath);
    }
  });
}

function processObjectExpression(path: NodePath<ObjectExpression>) {
  path.node.properties.forEach((property) => {
    if (property.type === 'ObjectMethod') {
      appendWorkletDirective(property.body);
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
function replaceImplicitReturnWithBlock(
  path: NodePath<ArrowFunctionExpression>
) {
  const bodyPath = path.get('body');
  if (!bodyPath.isBlockStatement()) {
    bodyPath.replaceWith(
      blockStatement([returnStatement(bodyPath.node as Expression)])
    );
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
