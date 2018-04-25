import AnimatedNode from './AnimatedNode';
import { val } from '../utils';

export default class AnimatedBlock extends AnimatedNode {
  _array;

  constructor(array) {
    super({ type: 'block', block: array.map(n => n.__nodeID) }, array);
    this._array = array;
  }

  __onEvaluate() {
    let result;
    this._array.forEach(node => {
      result = val(node);
    });
    return result;
  }
}
