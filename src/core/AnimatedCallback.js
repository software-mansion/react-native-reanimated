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
    super(
      {
        type: 'callback',
        what: what.__nodeID,
      },
      [what]
    );
    this._what = what;
    this.__attach();
  }

  __onEvaluate() {
    return val(this._what);
  }

  __source() {
    return this._what;
  }
}

export function createAnimatedCallback(...args) {
  let what;
  if (args.length === 1 && args[0] instanceof AnimatedNode) {
    what = args[0];
  } else {
    what = createAnimatedMap(args);
  }

  return new AnimatedCallback(what);
}

Object.defineProperty(createAnimatedCallback, 'fromEnd', {
  value(...args) {
    const what = createAnimatedMap(Array.fromEnd(args));
    return new AnimatedCallback(what);
  },
  configurable: false,
  enumerable: true,
  writable: false,
});