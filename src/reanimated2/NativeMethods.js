import { findNodeHandle } from 'react-native';

export function getTag(view) {
  return findNodeHandle(view);
}

export function measure(viewTag) {
  'worklet';
  if (!_WORKLET) {
    throw new Error('(measure) method cannot be used on RN side!');
  }
  const result = _measure(viewTag);
  if (result.x === -1234567) {
    throw new Error(`The view with tag ${viewTag} could not be measured`);
  }
  return result;
}

export function scrollTo(animatedRef, x, y, animated) {
  'worklet';
  if (!_WORKLET) {
    return;
  }
  const viewTag = animatedRef()
  _scrollTo(viewTag, x, y, animated);
}
