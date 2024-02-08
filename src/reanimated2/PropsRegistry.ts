'use strict';
import { isFabric } from './PlatformChecker';
import { runOnUI } from './threads';

const IS_FABRIC = isFabric();

let VIEW_TAGS: number[] = [];

export function removeFromPropsRegistry(viewTag: number) {
  VIEW_TAGS.push(viewTag);
  if (VIEW_TAGS.length === 1) {
    queueMicrotask(flush);
  }
}

function flush() {
  if (__DEV__ && !IS_FABRIC) {
    throw new Error('[Reanimated] PropsRegistry is only available on Fabric.');
  }
  runOnUI(removeFromPropsRegistryOnUI)(VIEW_TAGS);
  VIEW_TAGS = [];
}

function removeFromPropsRegistryOnUI(viewTags: number[]) {
  'worklet';
  _removeFromPropsRegistry(viewTags);
}
