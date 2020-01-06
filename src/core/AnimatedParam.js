import invariant from 'fbjs/lib/invariant';
import AnimatedNode from './AnimatedNode';
import AnimatedClock from './AnimatedClock';
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

  _getTopNode() {
    if (this.argsStack.length === 0) throw new Error(`param: Invocation failed because argsStack is empty`);
    const top = this.argsStack[this.argsStack.length - 1];
    return top;
  }

  setValue(value) {
    const top = this._getTopNode();
    if (top.setValue) {
      top.setValue(value);
    } else {
      throw new Error(`param: setValue(${value}) failed because the top element has no known method for updating it's current value.`)
    }
  }
  
  __onEvaluate() {
    const top = this._getTopNode();
    return val(top);
  }

  start() {
    const node = this._getTopNode();
    invariant(
      node instanceof AnimatedClock || node instanceof AnimatedParam,
      `param: top node should be of type AnimatedClock but got ${node}`
    );
    node.start();
  }

  stop() {
    const node = this._getTopNode();
    invariant(
      node instanceof AnimatedClock || node instanceof AnimatedParam,
      `param: top node should be of type AnimatedClock but got ${node}`
    );
    node.stop();
  }

  isRunning() {
    const node = this._getTopNode();
    invariant(
      node instanceof AnimatedClock || node instanceof AnimatedParam,
      `param: top node should be of type AnimatedClock but got ${node}`
    );
    return node.isRunning()
  }
}

export function createAnimatedParam() {
  return new AnimatedParam();
}
