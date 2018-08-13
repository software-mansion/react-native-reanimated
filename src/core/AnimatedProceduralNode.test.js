import Animated from './../Animated';
import ReanimatedModule from './../ReanimatedModule';
import React from 'react';

import renderer from 'react-test-renderer';

jest.mock('./../ReanimatedEventEmitter');
jest.mock('./../ReanimatedModule');
jest.mock('./AnimatedProps.js');

describe('ProceduralNode test', () => {
  beforeEach(() => {
    let numberOfNodes = 0;
    ReanimatedModule.createNode = () => numberOfNodes++;
    ReanimatedModule.dropNode = () => numberOfNodes--;
    ReanimatedModule.getNumberOfNodes = () => numberOfNodes;
  });

  it('pass if reusable node economizes number of attached nodes', () => {
    const { Value, proc, pow, add, modulo } = Animated;

    const sampleRN = proc(x => add(modulo(add(pow(x, 2), 5)), 12, x));

    class TestComponent extends React.Component {
      constructor(props) {
        super(props);
        this.transX = new Value(0);
      }
      render() {
        return (
          <Animated.View
            style={{
              transform: [{ translateX: sampleRN(this.transX) }],
            }}
          />
        );
      }
    }

    const numberOfNodesInitially = ReanimatedModule.getNumberOfNodes();
    const wrapper1 = renderer.create(<TestComponent />);
    const numberOfNodesAfterFirstRender = ReanimatedModule.getNumberOfNodes();
    const wrapper2 = renderer.create(<TestComponent />);
    const numberOfNodesAfterSecondRender = ReanimatedModule.getNumberOfNodes();
    wrapper1.unmount();
    const numberOfNodesAfterFirstUnmount = ReanimatedModule.getNumberOfNodes();
    wrapper2.unmount();
    const numberOfNodesAfterSecondUnmount = ReanimatedModule.getNumberOfNodes();

    expect(
      numberOfNodesInitially === numberOfNodesAfterSecondUnmount
    ).toBeTruthy();
    expect(numberOfNodesAfterSecondUnmount === 0).toBeTruthy();
    expect(
      numberOfNodesAfterFirstUnmount === numberOfNodesAfterFirstRender
    ).toBeTruthy();
    expect(numberOfNodesAfterFirstRender * 2).toBeGreaterThan(
      numberOfNodesAfterSecondRender
    );
  });
});
