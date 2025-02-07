import type { NodePath } from '@babel/core';
import type { AssignmentExpression, Identifier } from '@babel/types';
import {
  isWorkletizableFunctionPath,
  isWorkletizableObjectPath,
} from './types';
import type { WorkletizableFunction, WorkletizableObject } from './types';
import type { Binding } from '@babel/traverse';

export function findReferencedWorklet(
  workletIdentifier: NodePath<Identifier>,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): NodePath<WorkletizableFunction> | NodePath<WorkletizableObject> | undefined {
  const workletName = workletIdentifier.node.name;
  const scope = workletIdentifier.scope;

  const workletBinding = scope.getBinding(workletName);
  if (!workletBinding) {
    return undefined;
  }

  if (
    acceptWorkletizableFunction &&
    workletBinding.path.isFunctionDeclaration()
  ) {
    return workletBinding.path;
  }

  const isConstant = workletBinding.constant;
  if (isConstant) {
    return findReferencedWorkletFromVariableDeclarator(
      workletBinding,
      acceptWorkletizableFunction,
      acceptObject
    );
  }
  return findReferencedWorkletFromAssignmentExpression(
    workletBinding,
    acceptWorkletizableFunction,
    acceptObject
  );
}

function findReferencedWorkletFromVariableDeclarator(
  workletBinding: Binding,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): NodePath<WorkletizableFunction> | NodePath<WorkletizableObject> | undefined {
  const workletDeclaration = workletBinding.path;
  if (!workletDeclaration.isVariableDeclarator()) {
    return undefined;
  }
  const worklet = workletDeclaration.get('init');

  if (acceptWorkletizableFunction && isWorkletizableFunctionPath(worklet)) {
    return worklet;
  }
  if (acceptObject && isWorkletizableObjectPath(worklet)) {
    return worklet;
  }
  if (worklet.isIdentifier() && worklet.isReferencedIdentifier()) {
    return findReferencedWorklet(
      worklet,
      acceptWorkletizableFunction,
      acceptObject
    );
  }
  return undefined;
}

function findReferencedWorkletFromAssignmentExpression(
  workletBinding: Binding,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): NodePath<WorkletizableFunction> | NodePath<WorkletizableObject> | undefined {
  const workletDeclaration = workletBinding.constantViolations
    .reverse()
    .find(
      (constantViolation) =>
        constantViolation.isAssignmentExpression() &&
        ((acceptWorkletizableFunction &&
          isWorkletizableFunctionPath(constantViolation.get('right'))) ||
          (acceptObject &&
            isWorkletizableObjectPath(constantViolation.get('right'))))
    ) as NodePath<AssignmentExpression> | undefined;

  if (!workletDeclaration || !workletDeclaration.isAssignmentExpression()) {
    return undefined;
  }

  const workletDefinition = workletDeclaration.get('right');

  if (
    acceptWorkletizableFunction &&
    isWorkletizableFunctionPath(workletDefinition)
  ) {
    return workletDefinition;
  }
  if (acceptObject && isWorkletizableObjectPath(workletDefinition)) {
    return workletDefinition;
  }
  if (
    workletDefinition.isIdentifier() &&
    workletDefinition.isReferencedIdentifier()
  ) {
    return findReferencedWorklet(
      workletDefinition,
      acceptWorkletizableFunction,
      acceptObject
    );
  }
  return undefined;
}
