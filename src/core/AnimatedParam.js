import AnimatedNode from './AnimatedNode';
import { val } from '../val';

class AnimatedParam extends AnimatedNode {
  argsStack = [];

  constructor() {
    super({ type: 'param' }, []);
    this.__attach();
  }

  beginContext(ref) {
    this.argsStack.push(ref);
  }

  endContext() {
    this.argsStack.pop();
  }

  setValue(value) {
    const top = this.argsStack[this.argsStack.length - 1];
    top.setValue(value);
  }

  __onEvaluate() {
    const top = this.argsStack[this.argsStack.length - 1];
    return val(top);
  }
}

export function createAnimatedParam() {
  return new AnimatedParam();
}
