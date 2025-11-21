import type { NodePath } from '@babel/core';

import { findReferencedWorklet } from './referencedWorklets';
import type {
  ReanimatedPluginPass,
  WorkletizableFunction,
  WorkletizableObject,
} from './types';
import {
  isWorkletizableFunctionPath,
  isWorkletizableObjectPath,
} from './types';

export function findWorklet(
  arg: NodePath,
  acceptWorkletizableFunction: boolean,
  acceptObject: boolean,
  state: ReanimatedPluginPass
): NodePath<WorkletizableFunction> | NodePath<WorkletizableObject> | undefined {
  if (acceptWorkletizableFunction && isWorkletizableFunctionPath(arg)) {
    return arg;
  }
  if (acceptObject && isWorkletizableObjectPath(arg)) {
    return arg;
  }
  if (arg.isIdentifier() && arg.isReferencedIdentifier()) {
    const a = findReferencedWorklet(
      arg,
      acceptWorkletizableFunction,
      acceptObject,
      state
    );
    return a;
  }
  return undefined;
}
