import type { NodePath } from '@babel/core';

import { findWorklet } from './findWorklet';
import type { WorkletizableObject, WorkletsPluginPass } from './types';
import {
  isWorkletizableFunctionPath,
  isWorkletizableObjectPath,
} from './types';
import { processWorklet } from './workletSubstitution';

export function tryProcessingNode(
  arg: NodePath,
  state: WorkletsPluginPass,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
) {
  const maybeWorklet = findWorklet(
    arg,
    state,
    acceptWorkletizableFunction,
    acceptObject
  );
  // @ts-expect-error There's no need to workletize
  // inside an already workletized function.
  if (!maybeWorklet || maybeWorklet.getFunctionParent()?.node.workletized) {
    return;
  }
  if (isWorkletizableFunctionPath(maybeWorklet)) {
    processWorklet(maybeWorklet, state);
  } else if (isWorkletizableObjectPath(maybeWorklet)) {
    processWorkletizableObject(maybeWorklet, state);
  }
}

export function processWorkletizableObject(
  path: NodePath<WorkletizableObject>,
  state: WorkletsPluginPass
): void {
  const properties = path.get('properties');
  for (const property of properties) {
    if (property.isObjectMethod()) {
      processWorklet(property, state);
    } else if (property.isObjectProperty()) {
      const value = property.get('value');
      tryProcessingNode(
        value,
        state,
        true, // acceptWorkletizableFunction
        false // acceptObject
      );
    } else {
      throw new Error(
        `[Reanimated] '${property.type}' as to-be workletized argument is not supported for object hooks.`
      );
    }
  }
}
