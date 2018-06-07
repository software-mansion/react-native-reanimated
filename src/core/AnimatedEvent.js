import { findNodeHandle } from 'react-native';
import ReanimatedModule from '../ReanimatedModule';

import AnimatedNode from './AnimatedNode';
import AnimatedValue from './AnimatedValue';

import invariant from 'fbjs/lib/invariant';

function sanitizeArgMapping(argMapping) {
  // Find animated values in `argMapping` and create an array representing their
  // key path inside the `nativeEvent` object. Ex.: ['contentOffset', 'x'].
  const eventMappings = [];

  const traverse = (value, path) => {
    if (value instanceof AnimatedValue) {
      eventMappings.push(path.concat(value.__nodeID));
    } else if (typeof value === 'object') {
      for (const key in value) {
        traverse(value[key], path.concat(key));
      }
    }
  };

  invariant(
    argMapping[0] && argMapping[0].nativeEvent,
    'Native driven events only support animated values contained inside `nativeEvent`.'
  );

  // Assume that the event containing `nativeEvent` is always the first argument.
  traverse(argMapping[0].nativeEvent, []);

  return eventMappings;
}

export default class AnimatedEvent extends AnimatedNode {
  constructor(argMapping, config = {}) {
    super({ type: 'event', argMapping: sanitizeArgMapping(argMapping) });
  }

  attachEvent(viewRef, eventName) {
    this.__attach();
    const viewTag = findNodeHandle(viewRef);
    ReanimatedModule.attachEvent(viewTag, eventName, this.__nodeID);
  }

  detachEvent(viewRef, eventName) {
    const viewTag = findNodeHandle(viewRef);
    ReanimatedModule.detachEvent(viewTag, eventName, this.__nodeID);
    this.__detach();
  }
}
