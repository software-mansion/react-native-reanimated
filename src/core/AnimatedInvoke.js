import AnimatedNode from './AnimatedNode';
import Value from './AnimatedValue';
import { createAnimatedParam } from './AnimatedParam';
import { val } from '../val';
import AnimatedMap, { createAnimatedMap } from './AnimatedMap';

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

function createFinalParamNode(arg) {
  if (arg instanceof AnimatedMap) {
    return arg;
  }
  else if (typeof arg === 'object') {
    return createAnimatedMap(arg);
  }
  else {
    return createAnimatedParam();
  }
}

export function createAnimatedInvoke(config, ...params) {
  const inputNodes = params.map((value) => {
    if (value instanceof AnimatedNode) {
      return value;
    }
    if (typeof value === 'object') {
      return createAnimatedMap(value);
    }
    else if (typeof value === 'number') {
      return new Value(value);
    }
    else {
      throw new Error('prip');
    }
  });

  console.log(inputNodes.map(n => n.__nodeID))
  
  return new AnimatedInvoke(config, ...inputNodes);
}
