import AnimatedNode from './AnimatedNode';
import { val } from '../val';

<<<<<<< HEAD
export class AnimatedParam extends AnimatedNode {
<<<<<<< HEAD
=======
export default class AnimatedParam extends AnimatedNode {
>>>>>>> parent of 71b1b0c... Merge pull request #2 from ShaMan123/TransitionStateChange
=======
>>>>>>> parent of 6e156bb... Merge branch 'android-cwd' into patch-1
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
