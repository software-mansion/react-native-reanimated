import Animated, { Easing } from './Animated';
import ReanimatedModule from './ReanimatedModule';
import AnimatedNode from './core/AnimatedNode';
const { getNumberOfNodes } = ReanimatedModule;

jest.mock('./ReanimatedEventEmitter');
jest.mock('./ReanimatedModule');

const { Value, timing, spring, decay } = Animated;
function checkIfAttachAndDetachNodesProperly(animation) {
  const transX = new Value(0);

  const initial = getNumberOfNodes();
  const v = new AnimatedNode({ type: 'sampleView', value: 0 }, [transX]);
  v.__addChild(transX);
  const before = getNumberOfNodes();
  const anim = animation.node(transX, animation.config);
  anim.start();
  const during = getNumberOfNodes();
  anim.__detach_testOnly();
  const after = getNumberOfNodes();
  v.__removeChild(transX);
  const final = getNumberOfNodes();

  console.log(initial, before, during, after, final);

  return (
    initial === final &&
    after === before &&
    during > after &&
    initial === 0 &&
    before === 2
  );
}

it('fails if timing does not attach nodes correctly', () => {
  expect(
    checkIfAttachAndDetachNodesProperly({
      node: timing,
      name: 'timing',
      config: {
        duration: 5000,
        toValue: 120,
        easing: Easing.inOut(Easing.ease),
      },
    })
  ).toBeTruthy();
});

it('fails if decay does not attach nodes correctly', () => {
  expect(
    checkIfAttachAndDetachNodesProperly({
      node: decay,
      name: 'decay',
      config: {
        deceleration: 0.997,
      },
    })
  ).toBeTruthy();
});

it('fails if spring does not attach nodes correctly', () => {
  expect(
    checkIfAttachAndDetachNodesProperly({
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
    })
  ).toBeTruthy();
});

it('fails if clock while animation does not behave correctly', () => {
  expect(
    checkIfAttachAndDetachNodesProperly({
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
    })
  ).toBeTruthy();
});

it('fails if animation related nodes are still attached after detaching of value', () => {
  const { timing, Value } = Animated;
  const transX = new Value(0);
  const config = {
    duration: 5000,
    toValue: -120,
    easing: Easing.inOut(Easing.ease),
  };
  const anim = timing(transX, config);
  const anim2 = timing(transX, config);
  const v = new AnimatedNode({ type: 'sampleView', value: 0 }, [transX]);
  transX.__addChild(v);
  anim.start();
  anim2.start();
  v.__detach();
  expect(ReanimatedModule.getNumberOfNodes()).toBe(0);
});
