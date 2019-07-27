import AnimatedNode from './AnimatedNode';

class AnimatedParam extends AnimatedNode {
  
  constructor(name) {
    super({ type: 'param', name }, []);  
    this.__attach();
  }
}

export function createAnimatedParam(name) {
  return new AnimatedParam(name);
}
