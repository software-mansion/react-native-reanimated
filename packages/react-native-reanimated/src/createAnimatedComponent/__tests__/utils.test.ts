'use strict';
import { makeMutable } from '../..';
import type { StyleProps } from '../../commonTypes';
import type { CSSStyle } from '../../css';
import { filterCSSAndStyleProperties } from '../../css/utils/props';
import { filterStyles, mergeCSSAnimatedProps } from '../utils';

const styleArray = (...entries: Record<string, unknown>[]): StyleProps[] =>
  entries as StyleProps[];

describe(filterStyles, () => {
  test('returns no CSS style without input', () => {
    expect(filterStyles(undefined)).toEqual({
      animatedStyles: [],
      cssStyle: null,
    });
  });

  test('separates animated styles from CSS styles', () => {
    const animatedStyle = { viewDescriptors: {}, opacity: 0 };

    expect(filterStyles([{ width: 100 }, animatedStyle])).toEqual({
      animatedStyles: [animatedStyle],
      cssStyle: { width: 100 },
    });
  });

  describe('pseudo objects without default', () => {
    test('rest at the plain value from an earlier entry', () => {
      const { cssStyle } = filterStyles(
        styleArray(
          { backgroundColor: '#eee' },
          { backgroundColor: { ':active': '#ccc' }, transitionDuration: 100 }
        )
      );

      expect(cssStyle).toEqual({
        backgroundColor: { default: '#eee', ':active': '#ccc' },
        transitionDuration: 100,
      });
    });

    test('rest at the default of the pseudo object they replace', () => {
      const { cssStyle } = filterStyles(
        styleArray(
          { opacity: { default: 1, ':hover': 0.8 } },
          { opacity: { ':active': 0.5 } }
        )
      );

      expect(cssStyle).toEqual({
        opacity: { default: 1, ':active': 0.5 },
      });
    });

    test('stay without default when no earlier entry sets the property', () => {
      const { cssStyle } = filterStyles(
        styleArray({ width: 100 }, { backgroundColor: { ':active': '#ccc' } })
      );

      expect(cssStyle).toEqual({
        width: 100,
        backgroundColor: { ':active': '#ccc' },
      });
    });

    test('do not take an inline shared value as default', () => {
      const opacity = makeMutable(1);
      const { cssStyle } = filterStyles(
        styleArray({ opacity }, { opacity: { ':active': 0.5 } })
      );

      expect(cssStyle).toEqual({ opacity: { ':active': 0.5 } });
    });
  });

  test('keeps the default written in the pseudo object', () => {
    const { cssStyle } = filterStyles(
      styleArray(
        { backgroundColor: '#eee' },
        { backgroundColor: { default: '#fff', ':active': '#ccc' } }
      )
    );

    expect(cssStyle).toEqual({
      backgroundColor: { default: '#fff', ':active': '#ccc' },
    });
  });

  test('lets a later plain value replace a pseudo object', () => {
    const { cssStyle } = filterStyles(
      styleArray(
        { backgroundColor: { default: '#eee', ':active': '#ccc' } },
        { backgroundColor: '#fff' }
      )
    );

    expect(cssStyle).toEqual({ backgroundColor: '#fff' });
  });

  test('gives the CSS manager the same resting value as the host style', () => {
    const { cssStyle } = filterStyles(
      styleArray(
        { backgroundColor: '#eee' },
        { backgroundColor: { ':active': '#ccc' }, transitionDuration: 100 }
      )
    );
    const [, , pseudoStyles, filteredStyle] = filterCSSAndStyleProperties(
      cssStyle as CSSStyle
    );

    expect(filteredStyle).toEqual({ backgroundColor: '#eee' });
    expect(pseudoStyles).toEqual({
      ':active': {
        selectorStyle: { backgroundColor: '#ccc' },
        defaultStyle: { backgroundColor: '#eee' },
      },
    });
  });
});

describe(mergeCSSAnimatedProps, () => {
  test('rests a pseudo object without default at the plain prop', () => {
    const cssStyle = mergeCSSAnimatedProps(
      { fill: 'red', style: { width: 10 }, animatedProps: {} },
      { fill: { ':hover': 'yellow' }, transitionDuration: 100 }
    );

    expect(cssStyle).toEqual({
      fill: { default: 'red', ':hover': 'yellow' },
      transitionDuration: 100,
    });
  });

  test('keeps the default written in the pseudo object over the plain prop', () => {
    const cssStyle = mergeCSSAnimatedProps(
      { fill: 'red' },
      { fill: { default: 'blue', ':hover': 'yellow' } }
    );

    expect(cssStyle).toEqual({
      fill: { default: 'blue', ':hover': 'yellow' },
    });
  });

  test('keeps plain props that animatedProps do not override', () => {
    const cssStyle = mergeCSSAnimatedProps(
      { r: 20, stroke: 'black' },
      { fill: { default: 'red', ':hover': 'yellow' } }
    );

    expect(cssStyle).toEqual({
      r: 20,
      stroke: 'black',
      fill: { default: 'red', ':hover': 'yellow' },
    });
  });
});
