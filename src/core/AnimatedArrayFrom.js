import AnimatedNode from './AnimatedNode';
import { val } from '../utils';

export default class AnimatedArrayFrom extends AnimatedNode {
  _arrayFrom;

  constructor(arrayFrom) {
    super(
      { type: 'arrayFrom', arrayFrom: arrayFrom.map(n => n.__nodeID) },
      arrayFrom
    );
    this._arrayFrom = arrayFrom;
  }

  __onEvaluate() {
    return this._arrayFrom.map(val);
  }
}
