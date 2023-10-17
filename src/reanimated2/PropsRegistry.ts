'use strict';
import { runOnUI } from './threads';

let viewTags: number[] = [];

function removeFromPropsRegistryOnUI(_viewTags: number[]) {
  'worklet';
  _removeFromPropsRegistry(_viewTags);
}

function flush() {
  if (__DEV__ && !global._IS_FABRIC) {
    throw new Error('[Reanimated] PropsRegistry is only available on Fabric.');
  }
  runOnUI(removeFromPropsRegistryOnUI)(viewTags);
  viewTags = [];
}

export function removeFromPropsRegistry(viewTag: number) {
  viewTags.push(viewTag);
  if (viewTags.length === 1) {
    queueMicrotask(flush);
  }
}
