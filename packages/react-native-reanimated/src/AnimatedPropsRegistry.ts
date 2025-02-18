'use strict';
import { ReanimatedError } from './errors';
import { isFabric } from './PlatformChecker';
import { runOnUI } from './WorkletsResolver';

let VIEW_TAGS: number[] = [];

export function removeFromPropsRegistry(viewTag: number) {
  VIEW_TAGS.push(viewTag);
  if (VIEW_TAGS.length === 1) {
    queueMicrotask(flush);
  }
}

const IS_FABRIC = isFabric();

function flush() {
  if (__DEV__ && IS_FABRIC) {
    throw new ReanimatedError(
      'AnimatedPropsRegistry is only available on Fabric.'
    );
  }
  runOnUI(removeFromPropsRegistryOnUI)(VIEW_TAGS);
  VIEW_TAGS = [];
}

function removeFromPropsRegistryOnUI(viewTags: number[]) {
  'worklet';
  global._removeFromPropsRegistry(viewTags);
}
