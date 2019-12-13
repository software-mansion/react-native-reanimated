import { Image, ScrollView, Text, View } from 'react-native';
import Easing from './Easing';
import AnimatedClock from './core/AnimatedClock';
import AnimatedValue from './core/AnimatedValue';
import AnimatedNode from './core/AnimatedNode';
import AnimatedCode from './core/AnimatedCode';
import * as base from './base';
import * as derived from './derived';
import createAnimatedComponent from './createAnimatedComponent';
import {default as ogDecay} from './animations/decay';
import {default as ogTiming} from './animations/timing';
import {default as ogSpring} from './animations/spring';
import TimingAnimation from './animations/TimingAnimation';
import SpringAnimation from './animations/SpringAnimation';
import DecayAnimation from './animations/DecayAnimation';
import {
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
} from './ConfigHelper';
import backwardCompatibleAnimWrapper from './animations/backwardCompatibleAnimWrapper';
import {
  Transition,
  Transitioning,
  createTransitioningComponent,
} from './Transitioning';
import SpringUtils from './animations/SpringUtils';


const decay = backwardCompatibleAnimWrapper(ogDecay, DecayAnimation);
const timing = backwardCompatibleAnimWrapper(ogTiming, TimingAnimation);
const spring = backwardCompatibleAnimWrapper(ogSpring, SpringAnimation);
const Animated = {
  // components
  View: createAnimatedComponent(View),
  Text: createAnimatedComponent(Text),
  Image: createAnimatedComponent(Image),
  ScrollView: createAnimatedComponent(ScrollView),
  Code: AnimatedCode,
  createAnimatedComponent,

  // classes
  Clock: AnimatedClock,
  Value: AnimatedValue,
  Node: AnimatedNode,

  // operations
  ...base,
  ...derived,

  // animations
  decay,
  timing,
  spring,
  SpringUtils,

  // configuration
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
};

export default Animated;

// operations
export * from './base';
export * from './derived';

export {
  Easing,
  Transitioning,
  Transition,
  createTransitioningComponent, 

  // classes
  AnimatedClock as Clock,
  AnimatedValue as Value,
  AnimatedNode as Node,

  // animations
  decay,
  timing,
  spring,
  SpringUtils,
};
