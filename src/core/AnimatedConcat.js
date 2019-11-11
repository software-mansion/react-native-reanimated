import AnimatedNode from './AnimatedNode';
import { adapt } from '../core/AnimatedBlock';
import { val } from '../val';

class AnimatedConcat extends AnimatedNode {
  constructor(input) {
    super({ type: 'concat', input: input.map(n => n.__nodeID) }, input);
    this._input = input;
  }

  __onEvaluate() {
    return this._input.reduce((prev, current) => prev + val(current), '');
  }
}

export function createAnimatedConcat(...args) {
  return new AnimatedConcat(args.map(adapt));
}
