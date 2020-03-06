import AnimatedNode from './AnimatedNode';
import ReanimatedModule from '../ReanimatedModule';

// Animated value wrapped with extra methods for omit cycle of dependencies
export default class AnimatedSharedValue extends AnimatedNode {
  constructor(sharedValue) {
    super(
        {
            type: 'shared',
            sharedValueId: sharedValue.id,
            initialValue: sharedValue.initialValue,
        }, [],
    );
    this.sharedValue = sharedValue;
  }

  getId = () => {
    return this.sharedValue.id
  }

  set(value) {
    this.sharedValue.set(value);
    ReanimatedModule.setValue(this.__nodeID, value);
  }

  async get() {
    return this.sharedValue.get();
  }
  
  toString() {
    return `AnimatedValue, id: ${this.__nodeID}`;
  }
}