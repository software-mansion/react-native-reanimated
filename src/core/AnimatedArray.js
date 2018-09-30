import AnimatedNode from './AnimatedNode';
import { val } from '../utils';

export default class AnimatedArray extends AnimatedNode {
  _array;

  constructor(array) {
    super({ type: 'array', array: array.map(n => n.__nodeID) }, array);
    this._array = array;
  }

  __onEvaluate() {
    return this._array.map(val);
  }
}
