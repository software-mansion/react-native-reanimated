import { Platform, findNodeHandle } from 'react-native';
import ReanimatedModule from '../ReanimatedModule';

import AnimatedNode from './AnimatedNode';
import { sanitizeArgMapping } from './AnimatedMap';

import invariant from 'fbjs/lib/invariant';

function sanitizeEventMapping(argMapping) {
  invariant(
    argMapping[0] && argMapping[0].nativeEvent,
    'Native driven events only support animated values contained inside `nativeEvent`.'
  );

  // Assume that the event containing `nativeEvent` is always the first argument.
  const ev = argMapping[0].nativeEvent;

  // Find animated values in `argMapping` and create an array representing their
  // key path inside the `nativeEvent` object. Ex.: ['contentOffset', 'x'].
  return sanitizeArgMapping(ev);
}

export default class AnimatedEvent extends AnimatedNode {
  _alwaysNodes;
  constructor(argMapping, config = {}) {
    const { objectMappings, alwaysNodes } = sanitizeEventMapping(argMapping);
    super({ type: 'event', argMapping: objectMappings });
    this._alwaysNodes = alwaysNodes;

    if (Platform.OS === 'web') {
      this._argMapping = objectMappings;
      this.__getHandler = () => {
        return ({ nativeEvent }) => {
          for (const [key, value] of this._argMapping) {
            if (key in nativeEvent) value.setValue(nativeEvent[key]);
          }
        };
      };
    }
  }

  // The below field is a temporary workaround to make AnimatedEvent object be recognized
  // as Animated.event event callback and therefore filtered out from being send over the
  // bridge which was causing the object to be frozen in JS.
  __isNative = true;

  attachEvent(viewRef, eventName) {
    for (let i = 0; i < this._alwaysNodes.length; i++) {
      this._alwaysNodes[i].__attach();
    }
    this.__attach();
    const viewTag = findNodeHandle(viewRef);
    ReanimatedModule.attachEvent(viewTag, eventName, this.__nodeID);
  }

  __onEvaluate() {
    return 0;
  }

  detachEvent(viewRef, eventName) {
    for (let i = 0; i < this._alwaysNodes.length; i++) {
      this._alwaysNodes[i].isNativelyInitialized() &&
        this._alwaysNodes[i].__detach();
    }
    const viewTag = findNodeHandle(viewRef);
    ReanimatedModule.detachEvent(viewTag, eventName, this.__nodeID);
    this.__detach();
  }
}

export function createAnimatedEvent(argMapping, config) {
  return new AnimatedEvent(argMapping, config);
}
