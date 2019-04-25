import AnimatedNode from './AnimatedNode';
import { adapt } from '../core/AnimatedBlock';

class AnimatedConcat extends AnimatedNode {
  constructor(input) {
    super({ type: 'concat', input: input.map(n => n.__nodeID) }, input);
  }
}

export function createAnimatedConcat(...args) {
  return new AnimatedConcat(args.map(adapt));
}
