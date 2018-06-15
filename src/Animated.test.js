import { initializedNodes } from './core/AnimatedNode';
import Animated, { Easing } from './Animated';
import AnimatedAlways from './core/AnimatedAlways';

jest.mock('./ReanimatedEventEmitter');
jest.mock('./ReanimatedModule');

const { Value, timing, spring, decay } = Animated;
expect.extend({
  toAttachNodesProperly(animation) {
    const transX = new Value(0);

    const v = new AnimatedAlways(transX);
    const initial = initializedNodes.size;
    v.__addChild(v);
    const before = initializedNodes.size;
    const anim = animation.node(transX, animation.config);
    anim.start();
    const during = initializedNodes.size;
    anim.stop();
    for (let i = 0; i < anim.__state.persConf.length; i++) {
      anim.__state.persConf[i].__removeChild(anim.__state.val);
    }
    const after = initializedNodes.size;
    v.__removeChild(v);
    const final = initializedNodes.size;

    const pass =
      initial === final &&
      after === before &&
      during > after &&
      initial === 0 &&
      before === 2;
    if (pass) {
      return {
        message: () =>
          `expected ${
            animation.name
          }'s nodes to be attached and detached correctly`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${
            animation.name
          }'s nodes not to be attached and detached correctly`,
        pass: false,
      };
    }
  },
});
it('fails if timing does attach nodes correctly', () => {
  expect({
    node: timing,
    name: 'timing',
    config: {
      duration: 5000,
      toValue: 120,
      easing: Easing.inOut(Easing.ease),
      delay: 1000,
    },
  }).toAttachNodesProperly();
});

it('fails if decay does attach nodes correctly', () => {
  expect({
    node: decay,
    name: 'decay',
    config: {
      deceleration: 0.997,
    },
  }).toAttachNodesProperly();
});

it('fails if spring does attach nodes correctly', () => {
  expect({
    node: spring,
    name: 'spring',
    config: {
      toValue: 0,
      damping: 7,
      mass: 1,
      stiffness: 121.6,
      overshootClamping: false,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
    },
  }).toAttachNodesProperly();
});

it('fails if clock while animation does not behave correctly', () => {
  expect({
    node: spring,
    name: 'spring',
    config: {
      toValue: 0,
      damping: 7,
      mass: 1,
      stiffness: 121.6,
      overshootClamping: false,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
    },
  }).toAttachNodesProperly();
});
