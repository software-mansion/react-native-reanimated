import { NativeEventEmitter, NativeModules } from 'react-native';

import { val } from '../utils';
import AnimatedNode from './AnimatedNode';

const { ReanimatedModule } = NativeModules;
const EVENT_EMITTER = new NativeEventEmitter(ReanimatedModule);

const NODE_MAPPING = new Map();

function listener(data) {
  const node = NODE_MAPPING.get(data.id);
  node && node._callback(data.args);
}

export default class AnimatedCall extends AnimatedNode {
  _callback;
  _args;

  constructor(args, jsFunction) {
    super({ type: 'call', input: args.map(n => n.__nodeID) }, args);
    this._callback = jsFunction;
    this._args = args;
  }

  __attach() {
    super.__attach();
    NODE_MAPPING.set(this.__nodeID, this);
    if (NODE_MAPPING.size === 1) {
      EVENT_EMITTER.addListener('onReanimatedCall', listener);
    }
  }

  __detach() {
    NODE_MAPPING.delete(this.__nodeID);
    if (NODE_MAPPING.size === 0) {
      EVENT_EMITTER.removeAllListeners('onReanimatedCall');
    }
    super.__detach();
  }

  __onEvaluate() {
    this._callback(this._args.map(val));
    return 0;
  }
}
