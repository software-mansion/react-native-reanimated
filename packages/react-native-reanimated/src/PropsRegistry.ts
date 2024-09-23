'use strict';
import { ReanimatedError } from './errors';
import { isFabric } from './PlatformChecker';
import { runOnUI } from './threads';

let VIEW_TAGS: number[] = [];

export function removeFromPropsRegistry(viewTag: number) {
  VIEW_TAGS.push(viewTag);
  if (VIEW_TAGS.length === 1) {
    queueMicrotask(flush);
  }
}

function flush() {
  if (__DEV__ && !isFabric()) {
    throw new ReanimatedError('PropsRegistry is only available on Fabric.');
  }
  runOnUI(removeFromPropsRegistryOnUI)(VIEW_TAGS);
  VIEW_TAGS = [];
}

function removeFromPropsRegistryOnUI(viewTags: number[]) {
  'worklet';
  global._removeFromPropsRegistry(viewTags);
}
