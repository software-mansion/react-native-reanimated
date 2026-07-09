import type { NodePath } from '@babel/core';

import { findReferencedWorklet } from './referencedWorklets';
import type {
  WorkletizableFunction,
  WorkletizableObject,
  WorkletsPluginPass,
} from './types';
import {
  isWorkletizableFunctionPath,
  isWorkletizableObjectPath,
} from './types';

export function findWorklet(
  nodePath: NodePath,
  state: WorkletsPluginPass,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean
): NodePath<WorkletizableFunction> | NodePath<WorkletizableObject> | undefined {
  if (acceptWorkletizableFunction && isWorkletizableFunctionPath(nodePath)) {
    return nodePath;
  }
  if (acceptObject && isWorkletizableObjectPath(nodePath)) {
    return nodePath;
  }
  if (nodePath.isIdentifier() && nodePath.isReferencedIdentifier()) {
    const worklet = findReferencedWorklet(
      nodePath,
      acceptWorkletizableFunction,
      acceptObject,
      state
    );
    return worklet;
  }
  return undefined;
}

export function forEachWorkletizableFunction(
  arg: NodePath,
  state: WorkletsPluginPass,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean,
  callback: (path: NodePath<WorkletizableFunction>) => void
): void {
  const maybeWorklet = findWorklet(
    arg,
    state,
    acceptWorkletizableFunction,
    acceptObject
  );
  if (!maybeWorklet) {
    return;
  }
  if (isWorkletizableFunctionPath(maybeWorklet)) {
    callback(maybeWorklet);
  } else if (isWorkletizableObjectPath(maybeWorklet)) {
    forEachWorkletizableObjectProperty(maybeWorklet, state, callback);
  }
}

export function forEachWorkletizableObjectProperty(
  path: NodePath<WorkletizableObject>,
  state: WorkletsPluginPass,
  callback: (path: NodePath<WorkletizableFunction>) => void
): void {
  const properties = path.get('properties');
  for (const property of properties) {
    if (property.isObjectMethod()) {
      callback(property);
    } else if (property.isObjectProperty()) {
      const value = property.get('value');
      forEachWorkletizableFunction(
        value,
        state,
        true, // acceptWorkletizableFunction
        false, // acceptObject
        callback
      );
    } else {
      throw new Error(
        `'${property.type}' as to-be workletized argument is not supported for object hooks.`
      );
    }
  }
}
