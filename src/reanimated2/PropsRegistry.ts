import { runOnUI } from './threads';

let viewTags: number[] = [];

export function removeFromPropsRegistry(viewTag: number) {
  viewTags.push(viewTag);
  if (viewTags.length === 1) {
    queueMicrotask(flush);
  }
}

function flush() {
  if (__DEV__ && !global._IS_FABRIC) {
    throw new Error('[Reanimated] PropsRegistry is only available on Fabric.');
  }
  runOnUI(removeFromPropsRegistryOnUI)(viewTags);
  viewTags = [];
}

function removeFromPropsRegistryOnUI(viewTags: number[]) {
  'worklet';
  _removeFromPropsRegistry(viewTags);
}
