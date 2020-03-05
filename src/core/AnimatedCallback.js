import { val } from '../val';
import { createAnimatedMap } from './AnimatedMap';
import AnimatedNode from './AnimatedNode';
import { Platform } from "react-native";

export default class AnimatedCallback extends AnimatedNode {
  _what;

  constructor(what) {
    if (Platform.OS !== 'android') {
      throw new Error('Currently experimental direct manipulation are available only on Android');
    }

    if (!(what instanceof AnimatedNode)) {
      throw new Error('callback has received illegal arg');
    }

    super(
      {
        type: 'callback',
        what,
      },
      [what]
    );

    this._what = what;
  }

  __onEvaluate() {
    return val(this._what);
  }

  __source() {
    return this._what;
  }
}

export function createAnimatedCallback(...args) {
  const what = createAnimatedMap(args);
  return new AnimatedCallback(what);
}

Object.defineProperty(createAnimatedCallback, 'fromMap', {
  value(map) {
    return new AnimatedCallback(map);
  },
  configurable: false,
  enumerable: true,
  writable: false,
});

Object.defineProperty(createAnimatedCallback, 'fromEnd', {
  value(...args) {
    const what = createAnimatedMap(Array.fromEnd(args));
    return new AnimatedCallback(what);
  },
  configurable: false,
  enumerable: true,
  writable: false,
});