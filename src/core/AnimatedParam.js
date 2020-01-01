import AnimatedNode from './AnimatedNode';
import { val } from '../val';

export class AnimatedParam extends AnimatedNode {
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
    if (!this.argsStack.length) throw new Error(`param: setValue(${value}) failed because argsStack is empty`);
    const top = this.argsStack[this.argsStack.length - 1];
    if (top.setValue) {
      top.setValue(value);
    } else {
      throw new Error(`param: setValue(${value}) failed because the top element has no known method for updating it's current value.`)
    }
  }
  
  __onEvaluate() {
    if (!this.argsStack.length) throw new Error(`param: __onEvaluate() failed because argsStack is empty`);
    const top = this.argsStack[this.argsStack.length - 1];
    return val(top);
  }
}

export function createAnimatedParam() {
  return new AnimatedParam();
}
