import Animated, { Easing } from './Animated';
import ReanimatedModule from './ReanimatedModule';
import AnimatedNode from './core/AnimatedNode';
import React from 'react';

import renderer from 'react-test-renderer';

jest.mock('./ReanimatedEventEmitter');
jest.mock('./ReanimatedModule');
jest.mock('./derived/evaluateOnce');
jest.mock('./core/AnimatedProps');

const { Value, timing, spring, decay } = Animated;
describe('Reanimated backward compatible API', () => {
  beforeEach(() => {
    let numberOfNodes = 0;
    ReanimatedModule.createNode = () => numberOfNodes++;
    ReanimatedModule.dropNode = () => numberOfNodes--;
    ReanimatedModule.getNumberOfNodes = () => numberOfNodes;
  });

  const checkIfAttachAndDetachNodesProperly = animation => {
    class TestComponent extends React.Component {
      constructor(props) {
        super(props);
        this.transX = new Value(0);
        this.anim = animation.node(this.transX, animation.config);
      }
      start() {
        this.anim.start();
      }
      stop() {
        this.anim.__stopImmediately_testOnly();
      }
      render() {
        return (
          <Animated.View style={{ transform: [{ translateX: this.transX }] }} />
        );
      }
    }
    const ref = React.createRef();

    const initial = ReanimatedModule.getNumberOfNodes();
    const wrapper = renderer.create(<TestComponent ref={ref} />);
    const before = ReanimatedModule.getNumberOfNodes();
    ref.current.start();
    const during = ReanimatedModule.getNumberOfNodes();
    ref.current.stop();
    const after = ReanimatedModule.getNumberOfNodes();
    wrapper.unmount();
    const final = ReanimatedModule.getNumberOfNodes();

    return (
      initial === final &&
      after === before &&
      during > after &&
      initial === 0 &&
      before === 4
    );
  };

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

  it('fails if animation related nodes are detached if there are two children and only one detach', () => {
    const { timing, Value } = Animated;
    const transX = new Value(0);
    const transY = new Value(0);
    const config = {
      duration: 5000,
      toValue: -120,
      easing: Easing.inOut(Easing.ease),
    };
    const anim = timing(transX, config);
    const v = new AnimatedNode({ type: 'sampleView', value: 0 }, [
      transX,
      transY,
    ]);
    transX.__addChild(v);
    transY.__addChild(v);
    anim.start();
    const numberOfNodesBoforeDetach = ReanimatedModule.getNumberOfNodes();
    transY.__removeChild(v);
    const numberOfNodesAfterDetach = ReanimatedModule.getNumberOfNodes();
    const result =
      numberOfNodesBoforeDetach - 1 === numberOfNodesAfterDetach &&
      numberOfNodesAfterDetach > 1;

    expect(result).toBeTruthy();
  });
});
