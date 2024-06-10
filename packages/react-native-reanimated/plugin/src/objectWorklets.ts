import type { NodePath } from '@babel/core';
import { isWorkletizableFunctionType } from './types';
import type { WorkletizableObject, ReanimatedPluginPass } from './types';
import { processWorklet } from './workletSubstitution';

export function processWorkletizableObject(
  path: NodePath<WorkletizableObject>,
  state: ReanimatedPluginPass
): void {
  const properties = path.get('properties');
  for (const property of properties) {
    if (property.isObjectMethod()) {
      processWorklet(property, state);
    } else if (property.isObjectProperty()) {
      const value = property.get('value');
      if (isWorkletizableFunctionType(value)) {
        processWorklet(value, state);
      }
    } else {
      throw new Error(
        `[Reanimated] '${property.type}' as to-be workletized argument is not supported for object hooks.`
      );
    }
  }
}
