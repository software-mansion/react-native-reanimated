import { describe } from '../../ReanimatedRuntimeTestsRunner/RuntimeTestsApi';

describe('*****ANIMATIONS*****', () => {
  describe('****withTiming**** ⏰', () => {
    require('./withTiming/arrays.test');
    require('./withTiming/basic.test');
    require('./withTiming/objects.test');
    require('./withTiming/colors.test');
    require('./withTiming/easing.test');
    require('./withTiming/transformMatrices.test');
  });
  describe('****withSpring****', () => {
    require('./withSpring/variousConfig.test');
  });
  describe('****withDecay****', () => {
    require('./withDecay/basic.test');
  });
  describe('****withSequence****', () => {
    require('./withSequence/callbackCascade.test');
    require('./withSequence/cancelAnimation.test');
    require('./withSequence/numbers.test');
    require('./withSequence/arrays.test');
    require('./withSequence/colors.test');
  });
});
