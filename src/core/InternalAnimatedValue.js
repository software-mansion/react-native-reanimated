import AnimatedNode from './AnimatedNode';
import { val } from '../val';
import ReanimatedEventEmitter from '../ReanimatedEventEmitter';

const DETACHED_NODE_MAPPING = new Map();
let DETACHED_LISTENER_SETUP = false;

/**
 * This method registers a detached nodes in a temporary map and waits for
 * onReanimatedValueDropped event to be triggered. Once the event happens it
 * updates the dropped node's condif with the value provided from native.
 * This is needed for the nodes that are being reused at later times and mounted
 * as dependencies with some other components. Before this method's been
 * introduced we were relying on `getValue` call. However due to a large volume
 * of RN callback's this method yielded we had to update this code to rely on
 * events instead. Ideally we should find a way to tell if a given node is going
 * to be reused or not (most of the nodes are not being reused). Perhaps
 * a concept of `TempValue` would be a good enough solution?
 */
function updateConfigValueOnDetach(node) {
  if (!DETACHED_LISTENER_SETUP) {
    ReanimatedEventEmitter.addListener('onReanimatedValueDropped', data => {
      const node = DETACHED_NODE_MAPPING.get(data.id);
      if (node) {
        node.__nodeConfig.value = data.value;
        DETACHED_NODE_MAPPING.delete(node);
      }
    });
    DETACHED_LISTENER_SETUP = true;
  }
  DETACHED_NODE_MAPPING.set(node.__nodeID, node);
}

function sanitizeValue(value) {
  return value === null || value === undefined || typeof value === 'string'
    ? value
    : Number(value);
}

/**
 * This class has been made internal in order to omit dependencies' cycles which
 * were caused by imperative setValue and interpolate – they are currently exposed with AnimatedValue.js
 */
export default class InternalAnimatedValue extends AnimatedNode {
  constructor(value) {
    super({ type: 'value', value: sanitizeValue(value) });
    this._startingValue = this._value = value;
    this._animation = null;
  }

  __detach() {
    updateConfigValueOnDetach(this);
    this.__detachAnimation(this._animation);
    super.__detach();
  }

  __detachAnimation(animation) {
    animation && animation.__detach();
    if (this._animation === animation) {
      this._animation = null;
    }
  }

  __attachAnimation(animation) {
    this.__detachAnimation(this._animation);
    this._animation = animation;
  }

  __onEvaluate() {
    if (this.__inputNodes && this.__inputNodes.length) {
      this.__inputNodes.forEach(val);
    }
    return this._value + this._offset;
  }

  _updateValue(value) {
    this._value = value;
    this.__forceUpdateCache(value);
  }
}
