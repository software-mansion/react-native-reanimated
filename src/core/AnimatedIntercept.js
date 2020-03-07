import { Platform } from 'react-native';
import AnimatedNode from './AnimatedNode';
import { createAnimatedMap } from './AnimatedMap';

class AnimatedIntercept extends AnimatedNode {
  constructor(eventName, what) {
    if (Platform.OS !== 'android') {
      //throw new Error('Currently experimental direct manipulation are available only on Android');
    }
    super(
      {
        type: 'intercept',
        event: eventName,
        what,
      },
      [what]
    );

    //  attach node so it begins intercepting events
    this.__attach();
  }
}

export function createAnimatedIntercept(eventName, arg) {
  const what = arg instanceof AnimatedNode ? arg : createAnimatedMap(arg);
  return new AnimatedIntercept(eventName, what)
}
