import { val } from '../utils';
import AnimatedNode from './AnimatedNode';
import ReanimatedEventEmitter from '../ReanimatedEventEmitter';

const NODE_MAPPING = new Map();

function listener(data) {
  const node = NODE_MAPPING.get(data.id);
  node && node._console(data.val);
}

export default class AnimatedDebug extends AnimatedNode {
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

  _console(val) {
    console.warn(`${this._message} ${val}`);
  }

  __attach() {
    super.__attach();
    NODE_MAPPING.set(this.__nodeID, this);
    if (NODE_MAPPING.size === 1) {
      ReanimatedEventEmitter.addListener('onDebugJS', listener);
    }
  }

  __detach() {
    NODE_MAPPING.delete(this.__nodeID);
    if (NODE_MAPPING.size === 0) {
      ReanimatedEventEmitter.removeAllListeners('onDebugJS');
    }
    super.__detach();
  }
}
