import AnimatedNode from './AnimatedNode';
import Value from './AnimatedValue';
import { createAnimatedParam } from './AnimatedParam';
import { val } from '../val';
import AnimatedMap, { createAnimatedMap } from './AnimatedMap';
import { adapt } from './AnimatedBlock';
import { createAnimatedAlways } from './AnimatedAlways';

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

export function createAnimatedInvoke(config, ...params) {
  const inputNodes = params.map((value) => {
    if (typeof value === 'object' && value instanceof AnimatedNode === false) {
      return createAnimatedMap(value);
    }
    else {
      return adapt(value);
    }
  });
  
  return new AnimatedInvoke(config, ...inputNodes);
}
