'use strict';
import {
  registerWebSvgPropsBuilder,
  SVG_COMMON_WEB_PROPERTIES_CONFIG,
  SVG_PATH_WEB_PROPERTIES_CONFIG,
} from '../../svg/web';
import { processKeyframeDefinitions } from '../animationParser';

beforeAll(() => {
  registerWebSvgPropsBuilder('TestStroke', SVG_COMMON_WEB_PROPERTIES_CONFIG);
  registerWebSvgPropsBuilder('path', SVG_PATH_WEB_PROPERTIES_CONFIG);
});

describe(processKeyframeDefinitions, () => {
  test('synthesizes a strokeDasharray start and serializes the array', () => {
    const result = processKeyframeDefinitions(
      { to: { strokeDasharray: [10, 20, 30] } },
      'TestStroke'
    );
    expect(result).toContain('from { stroke-dasharray: 10px }');
    expect(result).toContain('to { stroke-dasharray: 10px 20px 30px }');
  });

  test('pads a trailing Z so an open->closed path morph interpolates', () => {
    const result = processKeyframeDefinitions(
      { from: { d: 'M0,0 L10,10' }, to: { d: 'M0,0 L20,5 Z' } },
      'path'
    );
    expect(result).toContain('from { d: path("M0,0 L10,10Z") }');
    expect(result).toContain('to { d: path("M0,0 L20,5 Z") }');
  });
});

describe('processKeyframeDefinitions (web)', () => {
  test('serializes from/to keyframe selectors and their block styles', () => {
    expect(
      processKeyframeDefinitions({ from: { opacity: 0 }, to: { opacity: 1 } })
    ).toBe('from { opacity: 0 } to { opacity: 1 }');
  });

  test('converts integer selectors to percentages', () => {
    expect(
      processKeyframeDefinitions({ 0: { opacity: 0 }, 1: { opacity: 1 } })
    ).toBe('0% { opacity: 0 } 100% { opacity: 1 }');
  });

  test('converts a fractional selector to a percentage', () => {
    expect(processKeyframeDefinitions({ 0.5: { opacity: 0.3 } })).toBe(
      '50% { opacity: 0.3 }'
    );
  });

  test('prepends a per-keyframe animationTimingFunction to the block', () => {
    expect(
      processKeyframeDefinitions({
        from: { opacity: 0, animationTimingFunction: 'ease-in' },
        to: { opacity: 1 },
      })
    ).toBe(
      'from { animation-timing-function: ease-in; opacity: 0 } to { opacity: 1 }'
    );
  });

  test('serializes backgroundImage gradient objects to CSS', () => {
    expect(
      processKeyframeDefinitions({
        from: {
          backgroundImage: [
            {
              type: 'linear-gradient',
              direction: '45deg',
              colorStops: [{ color: 'red' }, { color: 'blue' }],
            },
          ],
        },
        to: {
          backgroundImage: [
            {
              type: 'radial-gradient',
              shape: 'circle',
              size: { x: 30, y: 40 },
              position: { top: '10%', left: '20%' },
              colorStops: [
                { color: 'red', positions: [10] },
                { color: 'blue' },
              ],
            },
          ],
        },
      })
    ).toBe(
      'from { background-image: linear-gradient(45deg, red, blue) } ' +
        'to { background-image: radial-gradient(circle 40px at left 20% top 10%, red 10px, blue) }'
    );
  });
});
