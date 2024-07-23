'use strict';
import { isFabric, runOnUI } from 'react-native-worklets';

let VIEW_TAGS: number[] = [];

export function removeFromPropsRegistry(viewTag: number) {
  VIEW_TAGS.push(viewTag);
  if (VIEW_TAGS.length === 1) {
    queueMicrotask(flush);
  }
}

function flush() {
  if (__DEV__ && !isFabric()) {
    throw new Error('[Reanimated] PropsRegistry is only available on Fabric.');
  }
  runOnUI(removeFromPropsRegistryOnUI)(VIEW_TAGS);
  VIEW_TAGS = [];
}

function removeFromPropsRegistryOnUI(viewTags: number[]) {
  'worklet';
  global._removeFromPropsRegistry(viewTags);
}
