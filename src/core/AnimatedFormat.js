import AnimatedNode from './AnimatedNode';
import { adapt } from '../core/AnimatedBlock';

class AnimatedFormat extends AnimatedNode {
  constructor(value, format = '##.###') {
    super({ type: 'format', value: value.__nodeID, format }, [value]);
  }
}

export function createAnimatedFormat(value, format) {
  return new AnimatedFormat(adapt(value), format);
}
