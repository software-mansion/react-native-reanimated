import Animated from './../Animated';
import ReanimatedModule from './../ReanimatedModule';
import React from 'react';

import renderer from 'react-test-renderer';

jest.mock('./../ReanimatedEventEmitter');
jest.mock('./../ReanimatedModule');
jest.mock('./AnimatedProps.js');

describe('ReusableNode test', () => {
  beforeEach(() => {
    let numberOfNodes = 0;
    ReanimatedModule.createNode = () => numberOfNodes++;
    ReanimatedModule.dropNode = () => numberOfNodes--;
    ReanimatedModule.getNumberOfNodes = () => numberOfNodes;
  });

  it('pass if reusable node economize number of attached nodes', () => {
    const { Value, ReusableNode, pow, add, modulo } = Animated;

    const sampleRN = new ReusableNode(x =>
      add(modulo(add(pow(x, 2), 5)), 12, x)
    );

    class TestComponent1 extends React.Component {
      constructor(props) {
        super(props);
        this.transX = new Value(0);
      }
      render() {
        return (
          <Animated.View
            style={{
              transform: [{ translateX: sampleRN.invoke(this.transX) }],
            }}
          />
        );
      }
    }

    class TestComponent2 extends React.Component {
      constructor(props) {
        super(props);
        this.transX = new Value(0);
      }
      render() {
        return (
          <Animated.View
            style={{
              transform: [{ translateX: sampleRN.invoke(this.transX) }],
            }}
          />
        );
      }
    }

    const numberOfNodesInitially = ReanimatedModule.getNumberOfNodes();
    const wrapper1 = renderer.create(<TestComponent1 />);
    const numberOfNodesAfterFirstRender = ReanimatedModule.getNumberOfNodes();
    const wrapper2 = renderer.create(<TestComponent2 />);
    const numberOfNodesAfterSecondRender = ReanimatedModule.getNumberOfNodes();
    wrapper1.unmount();
    const numberOfNodesAfterFirstUnmount = ReanimatedModule.getNumberOfNodes();
    wrapper2.unmount();
    const numberOfNodesAfterSecondUnmount = ReanimatedModule.getNumberOfNodes();

    const pass =
      numberOfNodesInitially === numberOfNodesAfterSecondUnmount &&
      numberOfNodesAfterSecondUnmount === 0 &&
      numberOfNodesAfterFirstUnmount === numberOfNodesAfterFirstRender &&
      numberOfNodesAfterSecondRender < 2 * numberOfNodesAfterFirstRender;

    expect(pass).toBeTruthy();
  });
});
