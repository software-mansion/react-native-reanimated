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
