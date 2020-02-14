import { createAnimatedSet as set } from '../core/AnimatedSet';
import AnimatedNode from './AnimatedNode';
import { Platform } from 'react-native';
import { evaluateOnce } from '../derived/evaluateOnce';
import ReanimatedModule from '../ReanimatedModule';
import SharedValue from '../reanimated2/SharedValue';

// Animated value wrapped with extra methods for omit cycle of dependencies
export default class AnimatedSharedValue extends AnimatedNode {
  constructor(sharedValue) {
    super(
        {
            type: 'shared',
            sharedValueId: sharedValue.id,
            initialValue: sharedValue.initialValue,
        },[]
    );
  }  

  setValue(value) {
    //TODO
  }
  
  toString() {
    return `AnimatedValue, id: ${super.__nodeID}`;
  }
}