import AnimatedNode from './AnimatedNode';

class AnimatedParam extends AnimatedNode {
  constructor() {
    super({ type: 'param' }, []);
    this.__attach();
  }
}

export function createAnimatedParam() {
  return new AnimatedParam();
}
