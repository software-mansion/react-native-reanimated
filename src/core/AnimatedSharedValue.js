import AnimatedNode from './AnimatedNode';

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
  }  

  setValue(value) {
    //TODO
  }
  
  toString() {
    return `AnimatedValue, id: ${this.__nodeID}`;
  }
}