import { Image, ScrollView, Text, View } from 'react-native';
import EasingNode from './src/Easing';
import AnimatedClock from './src/core/AnimatedClock';
import AnimatedValue from './src/core/AnimatedValue';
import AnimatedNode from './src/core/AnimatedNode';
import AnimatedCode from './src/core/AnimatedCode';
import * as base from './src/base';
import * as derived from './src/derived';
import createAnimatedComponent from './src/createAnimatedComponent';
import decay from './src/animations/decay';
import timing from './src/animations/timing';
import spring from './src/animations/spring';
import Animation from './src/animations/Animation';
import {
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
} from './src/ConfigHelper';
import backwardCompatibleAnimWrapper from './src/animations/backwardCompatibleAnimWrapper';
import {
  Transition,
  Transitioning,
  createTransitioningComponent,
} from './src/Transitioning';
import SpringUtils from './src/animations/SpringUtils';
import useValue from './src/useValue';
import * as reanimated2 from './src/reanimated2';

const decayWrapper = backwardCompatibleAnimWrapper(
  decay,
  Animation.decayDefaultState
);
const timingWrapper = backwardCompatibleAnimWrapper(
  timing,
  Animation.timingDefaultState
);
const springWrapper = backwardCompatibleAnimWrapper(
  spring,
  Animation.springDefaultState
);
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
  decay: decayWrapper,
  timing: timingWrapper,
  spring: springWrapper,
  SpringUtils,

  // configuration
  addWhitelistedNativeProps,
  addWhitelistedUIProps,

  // hooks
  useValue,

  // reanimated2
  ...reanimated2,
};

export default Animated;

// operations
export * from './src/base';
export * from './src/derived';

export * from './src/reanimated2';

export {
  EasingNode,
  Transitioning,
  Transition,
  createTransitioningComponent,
  // classes
  AnimatedClock as Clock,
  AnimatedValue as Value,
  AnimatedNode as Node,
  // animations
  decayWrapper as decay,
  timingWrapper as timing,
  springWrapper as spring,
  SpringUtils,
  // hooks
  useValue,
};
