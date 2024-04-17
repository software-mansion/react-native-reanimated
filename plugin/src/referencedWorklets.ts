import type { NodePath } from '@babel/core';
import type { FunctionDeclaration, Identifier } from '@babel/types';
import { isWorkletizableFunctionType } from './types';
import type { ReanimatedPluginPass } from './types';
import { processWorklet } from './workletSubstitution';

export function processReferencedWorklet(
  maybeWorklet: NodePath<Identifier>,
  state: ReanimatedPluginPass
): void {
  const workletName = maybeWorklet.node.name;
  const workletReference = maybeWorklet.scope.bindings[workletName];
  const isConstant = workletReference.constant;
  if (workletReference.path.isFunctionDeclaration()) {
    processReferencedWorkletFunctionDeclaration(workletReference.path, state);
  } else if (isConstant) {
    processConstantReferencedWorklet(maybeWorklet, state);
  } else {
    processReferencedWorkletConstantViolation(maybeWorklet, state);
  }
}

function processReferencedWorkletFunctionDeclaration(
  worklet: NodePath<FunctionDeclaration>,
  state: ReanimatedPluginPass
) {
  processWorklet(worklet, state);
}

function processReferencedWorkletConstantViolation(
  maybeWorklet: NodePath<Identifier>,
  state: ReanimatedPluginPass
) {
  const workletName = maybeWorklet.node.name;
  const workletDeclaration = maybeWorklet.scope.bindings[
    workletName
  ].constantViolations
    .reverse()
    .find(
      (constantViolation) =>
        constantViolation.isAssignmentExpression() &&
        isWorkletizableFunctionType(constantViolation.get('right'))
    );

  if (workletDeclaration) {
    const workletDefinition = workletDeclaration.get('right');
    if (
      !Array.isArray(workletDefinition) &&
      isWorkletizableFunctionType(workletDefinition)
    ) {
      processWorklet(workletDefinition, state);
    }
  }
}

function processConstantReferencedWorklet(
  maybeWorklet: NodePath<Identifier>,
  state: ReanimatedPluginPass
) {
  const workletName = maybeWorklet.node.name;
  const workletDeclaration = maybeWorklet.scope.bindings[workletName].path;

  if (!workletDeclaration) {
    return;
  }

  const worklet = workletDeclaration.get('init');
  if (!Array.isArray(worklet) && isWorkletizableFunctionType(worklet)) {
    processWorklet(worklet, state);
  }
}
