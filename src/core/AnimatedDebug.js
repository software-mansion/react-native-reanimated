import { val } from '../val';
import AnimatedNode from './AnimatedNode';
import { createAnimatedBlock as block, adapt } from './AnimatedBlock';
import { createAnimatedCall as call } from './AnimatedCall';

class AnimatedDebug extends AnimatedNode {
  _message;
  _value;

  constructor(message, value) {
    super({ type: 'debug', message, value: value.__nodeID }, [value]);
    this._message = message;
    this._value = value;
  }

  __onEvaluate() {
    const value = val(this._value);
    console.log(this._message, value);
    return value;
  }
}

export function createAnimatedDebug(message, value) {
  if (__DEV__) {
    const runningInRemoteDebugger = typeof atob !== 'undefined';
    // hack to detect if app is running in remote debugger
    // https://stackoverflow.com/questions/39022216

    const runningInExpoShell =
      global.Expo && global.Expo.Constants.appOwnership !== 'standalone';

    if (runningInRemoteDebugger || runningInExpoShell) {
      // When running in expo or remote debugger we use JS console.log to output variables
      // otherwise we output to the native console using native debug node
      return block([
        call([value], ([a]) => console.log(`${message} ${a}`)),
        value,
      ]);
    } else {
      return new AnimatedDebug(message, adapt(value));
    }
  }
  // Debugging is disabled in PROD
  return value;
}
