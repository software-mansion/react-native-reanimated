import type { NodePath } from '@babel/core';
import type {
  BlockStatement,
  ClassBody,
  ObjectExpression,
  ObjectMethod,
  Program,
  Statement,
  ThisExpression,
  VariableDeclaration,
} from '@babel/types';
import {
  booleanLiteral,
  classProperty,
  identifier,
  isAssignmentExpression,
  isExpressionStatement,
  isIdentifier,
  isMemberExpression,
  isObjectProperty,
  objectProperty,
} from '@babel/types';

import { contextObjectMarker } from './contextObject';
import { addDirective, replaceImplicitReturnWithBlock } from './directives';
import type { WorkletsPluginPass } from './types';
import {
  isWorkletizableFunctionPath,
  isWorkletizableObjectPath,
} from './types';

export function processIfWorkletFile(
  path: NodePath<Program>,
  state: WorkletsPluginPass
): boolean {
  if (
    !path.node.directives.some(
      (functionDirective) => functionDirective.value.value === 'worklet'
    )
  ) {
    return false;
  }

  // Remove 'worklet' directive from the file.
  path.node.directives = path.node.directives.filter(
    (functionDirective) => functionDirective.value.value !== 'worklet'
  );
  processWorkletFile(path, state);

  return true;
}

/** Adds a worklet directive to each viable top-level entity in the file. */
function processWorkletFile(
  programPath: NodePath<Program>,
  state: WorkletsPluginPass
) {
  const statements = programPath.get('body');
  dehoistCommonJSExports(programPath.node);
  statements.forEach((statement) => {
    const candidatePath = getCandidate(statement);
    processWorkletizableEntity(candidatePath, state);
  });
}

function getCandidate(statementPath: NodePath<Statement>) {
  if (
    statementPath.isExportNamedDeclaration() ||
    statementPath.isExportDefaultDeclaration()
  ) {
    return statementPath.get('declaration') as NodePath<unknown>;
  } else {
    return statementPath;
  }
}

function processWorkletizableEntity(
  nodePath: NodePath<unknown>,
  state: WorkletsPluginPass
) {
  if (isWorkletizableFunctionPath(nodePath)) {
    if (nodePath.isArrowFunctionExpression()) {
      replaceImplicitReturnWithBlock(nodePath.node);
    }
    addDirective(nodePath.node.body as BlockStatement, 'worklet');
  } else if (isWorkletizableObjectPath(nodePath)) {
    if (isImplicitContextObject(nodePath)) {
      appendWorkletContextObjectMarker(nodePath.node);
    } else {
      processWorkletAggregator(nodePath, state);
    }
  } else if (nodePath.isVariableDeclaration()) {
    processVariableDeclaration(nodePath, state);
  } else if (nodePath.isClassDeclaration()) {
    appendWorkletClassMarker(nodePath.node.body);
    if (nodePath.node.id?.name) {
      // We don't support unnamed classes yet.
      state.classesToWorkletize.push({
        node: nodePath.node,
        name: nodePath.node.id.name,
      });
    }
  }
}

function processVariableDeclaration(
  variableDeclarationPath: NodePath<VariableDeclaration>,
  state: WorkletsPluginPass
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
  state: WorkletsPluginPass
) {
  const properties = objectPath.get('properties');
  properties.forEach((property) => {
    if (property.isObjectMethod()) {
      addDirective(property.node.body, 'worklet');
    } else if (property.isObjectProperty()) {
      const valuePath = property.get('value');
      processWorkletizableEntity(valuePath, state);
    }
  });
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

function appendWorkletClassMarker(classBody: ClassBody) {
  classBody.body.push(
    classProperty(identifier('__workletClass'), booleanLiteral(true))
  );
}

function dehoistCommonJSExports(program: Program) {
  const statements = program.body;
  let end = statements.length;
  let current = 0;

  while (current < end) {
    const statement = statements[current];
    if (!isCommonJSExport(statement)) {
      current++;
      continue;
    }
    const exportStatement = statements.splice(current, 1);
    statements.push(...exportStatement);
    // We just removed one element from non-processed part,
    // so we need to decrement the end index but not the current index.
    end--;
  }
}

function isCommonJSExport(statement: Statement) {
  return (
    isExpressionStatement(statement) &&
    isAssignmentExpression(statement.expression) &&
    isMemberExpression(statement.expression.left) &&
    isIdentifier(statement.expression.left.object) &&
    statement.expression.left.object.name === 'exports'
  );
}
