'use strict';
import { filterCSSProps } from '../utils';

describe('filterCSSProps', () => {
  it('keeps the CSS callbacks away from the wrapped component', () => {
    const onCSSAnimationEnd = jest.fn();
    const props = {
      onCSSAnimationEnd,
      onCSSTransitionRun: jest.fn(),
      onPress: onCSSAnimationEnd,
      testID: 'box',
    };

    expect(filterCSSProps(props)).toEqual({
      onPress: onCSSAnimationEnd,
      testID: 'box',
    });
  });

  it('passes everything through when there are no callbacks', () => {
    const props = { collapsable: false, testID: 'box' };

    expect(filterCSSProps(props)).toEqual(props);
  });

  it('strips the CSS config from the style', () => {
    const props = { style: { animationDuration: '1s', opacity: 0.5 } };

    expect(filterCSSProps(props)).toEqual({ style: { opacity: 0.5 } });
  });
});
