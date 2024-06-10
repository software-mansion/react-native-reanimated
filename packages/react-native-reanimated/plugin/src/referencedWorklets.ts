import type { NodePath } from '@babel/core';
import type { AssignmentExpression, Identifier } from '@babel/types';
import {
  isWorkletizableFunctionType,
  isWorkletizableObjectType,
} from './types';
import type { WorkletizableFunction, WorkletizableObject } from './types';
import type { Binding } from '@babel/traverse';

export function findReferencedWorklet(
  maybeWorklet: NodePath<Identifier>,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): NodePath<WorkletizableFunction> | NodePath<WorkletizableObject> | undefined {
  const workletName = maybeWorklet.node.name;
  const scope = maybeWorklet.scope;

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

  if (acceptWorkletizableFunction && isWorkletizableFunctionType(worklet)) {
    return worklet;
  }
  if (acceptObject && isWorkletizableObjectType(worklet)) {
    return worklet;
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
          isWorkletizableFunctionType(constantViolation.get('right'))) ||
          (acceptObject &&
            isWorkletizableObjectType(constantViolation.get('right'))))
    ) as NodePath<AssignmentExpression> | undefined;

  if (!workletDeclaration || !workletDeclaration.isAssignmentExpression()) {
    return undefined;
  }

  const workletDefinition = workletDeclaration.get('right');

  if (
    acceptWorkletizableFunction &&
    isWorkletizableFunctionType(workletDefinition)
  ) {
    return workletDefinition;
  }
  if (acceptObject && isWorkletizableObjectType(workletDefinition)) {
    return workletDefinition;
  }
  return undefined;
}
