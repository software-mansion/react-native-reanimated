import type { NodePath } from '@babel/core';
import type { Identifier } from '@babel/types';
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
  const workletReference = maybeWorklet.scope.bindings[workletName];
  const isConstant = workletReference.constant;

  if (
    acceptWorkletizableFunction &&
    workletReference.path.isFunctionDeclaration()
  ) {
    return workletReference.path;
  }
  if (isConstant) {
    return findReferencedWorklerFromVariableDeclarator(
      workletReference,
      acceptWorkletizableFunction,
      acceptObject
    );
  }
  return findReferencedWorkletFromAssignmentExpression(
    maybeWorklet,
    acceptWorkletizableFunction,
    acceptObject
  );
}

function findReferencedWorkletFromAssignmentExpression(
  maybeWorklet: NodePath<Identifier>,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): NodePath<WorkletizableFunction> | NodePath<WorkletizableObject> | undefined {
  const workletName = maybeWorklet.node.name;
  const workletDeclaration = maybeWorklet.scope.bindings[
    workletName
  ].constantViolations
    .reverse()
    .find(
      (constantViolation) =>
        constantViolation.isAssignmentExpression() &&
        ((acceptWorkletizableFunction &&
          isWorkletizableFunctionType(constantViolation.get('right'))) ||
          (acceptObject &&
            isWorkletizableObjectType(constantViolation.get('right'))))
    );

  if (!workletDeclaration) {
    return undefined;
  }

  const workletDefinition = workletDeclaration.get('right');

  if (Array.isArray(workletDefinition)) {
    return undefined;
  }
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

function findReferencedWorklerFromVariableDeclarator(
  workletReference: Binding,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): NodePath<WorkletizableFunction> | NodePath<WorkletizableObject> | undefined {
  const workletDeclaration = workletReference.path;
  const worklet = workletDeclaration.get('init');

  if (Array.isArray(worklet)) {
    return;
  }
  if (acceptWorkletizableFunction && isWorkletizableFunctionType(worklet)) {
    return worklet;
  }
  if (acceptObject && isWorkletizableObjectType(worklet)) {
    return worklet;
  }
  return undefined;
}
