import { val } from '../val';
import { adapt } from './AnimatedBlock';
import { createAnimatedCallback } from './AnimatedMap';
import AnimatedNode from './AnimatedNode';
import ReanimatedModule from '../ReanimatedModule';

class AnimatedInvoke extends AnimatedNode {
  constructor(invokeConfig, ...params) {
    super(
      {
        type: 'invoke',
        ...invokeConfig,
        params: params.map(n => n.__nodeID),
      },
      params
    );
    this.__attach();
  }

  __onEvaluate() {
    return val(this);
  }
}

function createAnimatedInvokeBase(config, ...params) {
  const inputNodes = params.map((value) => {
    if (typeof value === 'object' && value instanceof AnimatedNode === false) {
      return createAnimatedCallback(value);
    }
    else {
      return adapt(value);
    }
  });
  
  return new AnimatedInvoke(config, ...inputNodes);
}

export function createAnimatedInvoke(module, method, ...params) {
  return createAnimatedInvokeBase({ module, method }, ...params);
}

export function createAnimatedDispatch(module, command, ...params) {
  return createAnimatedInvokeBase({ module, command }, ...params);
}

export function getDevUtil() {
  return ReanimatedModule.getDevUtil();
}
