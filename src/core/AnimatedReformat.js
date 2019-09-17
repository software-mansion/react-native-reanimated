import AnimatedNode from './AnimatedNode';
import { adapt } from '../core/AnimatedBlock';
import { val } from '../val';

class AnimatedReformat extends AnimatedNode {
  constructor(input, reformat) {
    super({ type: 'reformat', input: [input.__nodeID] }, [input]);
    this._input = input;
    this._reformat = reformat;
  }

  __onEvaluate() {
    return this._reformat(val(this._input));
  }
}

export function createAnimatedReformat(input, reformat) {
  return new AnimatedReformat(adapt(input), reformat);
}
