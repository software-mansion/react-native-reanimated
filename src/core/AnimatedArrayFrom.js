import invariant from 'fbjs/lib/invariant';

import AnimatedNode from './AnimatedNode';
import { val, adapt } from '../utils';

const mem = {};

export default function memoizeArrayFromNode(arr) {
  invariant(
    arguments.length === 1 && Array.isArray(arr),
    'node arrayFrom expect single array as argument'
  );

  const hash = arr
    .map(x => (x instanceof AnimatedNode ? x.__nodeID : 'e'))
    .join('s');
  /**
   * We are adding 'e' for all arbitrary values to prevent cases when the same
   * animated value is used in few places without that [0, 1, AV, 2] and [AV, 1]
   * could be resolved to the same array. 's' is used as separator to prevent
   * clash if few ids joined together create another valid ids
   * (ie. ids [11, 22, 33] and [112, 233] would create the same hash)
   */

  if (!mem.hasOwnProperty(hash)) {
    /**
     * If we call adapt before this function all arbitrary values will get new
     * nodeID on each re-render and there will be no way to cache it.
     */
    mem[hash] = new AnimatedArrayFrom(arr.map(adapt));
  }

  return mem[hash];
}

class AnimatedArrayFrom extends AnimatedNode {
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
