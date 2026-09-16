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

  describe('pseudo objects in the style', () => {
    it('forwards the default as the resting value', () => {
      const props = {
        style: {
          backgroundColor: { default: '#eee', ':active': '#ccc' },
          transitionDuration: 100,
        },
      };

      expect(filterCSSProps(props)).toEqual({
        style: { backgroundColor: '#eee' },
      });
    });

    it('drops the property from earlier entries so it rests at its own default without a default', () => {
      const props = {
        style: [
          { backgroundColor: '#eee', width: 100 },
          { backgroundColor: { ':active': '#ccc' }, transitionDuration: 100 },
        ],
      };

      expect(filterCSSProps(props)).toEqual({
        style: [{ width: 100 }, {}],
      });
    });

    it('lets the default replace the value of an earlier entry', () => {
      const props = {
        style: [
          { backgroundColor: '#eee' },
          { backgroundColor: { default: '#fff', ':active': '#ccc' } },
        ],
      };

      expect(filterCSSProps(props)).toEqual({
        style: [{}, { backgroundColor: '#fff' }],
      });
    });

    it('drops the property from a compiled web style entry too', () => {
      const compiled = { $$css: true, backgroundColor: 'r-bg', width: 'r-w' };
      const props = {
        style: [compiled, { backgroundColor: { ':hover': '#ccc' } }],
      };

      expect(filterCSSProps(props)).toEqual({
        style: [{ $$css: true, width: 'r-w' }, {}],
      });
    });

    it('lets a later plain value replace the pseudo object', () => {
      const props = {
        style: [
          { backgroundColor: { default: '#eee', ':active': '#ccc' } },
          { backgroundColor: '#fff' },
        ],
      };

      expect(filterCSSProps(props)).toEqual({
        style: [{ backgroundColor: '#eee' }, { backgroundColor: '#fff' }],
      });
    });

    it('flattens nested style arrays and skips empty entries', () => {
      const props = {
        style: [
          null,
          [{ width: 100 }, false, [{ opacity: { ':hover': 0.5 } }]],
        ],
      };

      expect(filterCSSProps(props)).toEqual({
        style: [{ width: 100 }, {}],
      });
    });
  });
});
