import AnimatedNode from './AnimatedNode';
import { val, adapt } from '../utils';

function sanitizeArray(arr) {
  return arr.map(x => (x instanceof AnimatedNode ? x.__nodeID : x));
}

function compareArrays(newArr, oldArr) {
  if (newArr.length !== oldArr.length) return false;

  const sanatizedNewArr = sanitizeArray(newArr);
  const sanatizedOldArr = sanitizeArray(oldArr);

  return sanatizedNewArr.every((x, i) => x === sanatizedOldArr[i]);
}

export default function createOrReuseArrayFromNode(arr, oldNode) {
  const equals = oldNode ? compareArrays(arr, oldNode._arrayFrom) : false;

  if (equals) {
    return oldNode;
  }

  return new AnimatedArrayFrom(arr);
}

class AnimatedArrayFrom extends AnimatedNode {
  _arrayFrom;

  constructor(arrayFrom) {
    const adapted = arrayFrom.map(adapt);
    super(
      { type: 'arrayFrom', arrayFrom: adapted.map(n => n.__nodeID) },
      adapted
    );
    this._arrayFrom = arrayFrom;
  }

  __onEvaluate() {
    return this._arrayFrom.map(val);
  }
}
