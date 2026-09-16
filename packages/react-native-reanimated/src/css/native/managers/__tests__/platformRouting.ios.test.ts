'use strict';
import {
  platformBlockedUntil,
  supportsPlatformRouting,
} from '../platformRouting';

// Mirrors React Native's useCoreAnimationBorderRendering on iOS.
describe('supportsPlatformRouting (iOS)', () => {
  const RED = 0xffff0000;
  const TRANSPARENT = 0x00000000;

  test.each([
    ['no border', {}],
    ['zero width border', { borderWidth: 0, borderColor: RED }],
    ['clipped visible border', { borderWidth: 2, overflow: 'hidden' }],
    ['scroll clips too', { borderWidth: 2, overflow: 'scroll' }],
    ['transparent border', { borderWidth: 2, borderColor: TRANSPARENT }],
    [
      'uniform radius',
      { borderRadius: 12, borderWidth: 2, overflow: 'hidden' },
    ],
    [
      'longhands equal to the shorthand',
      {
        borderWidth: 2,
        borderTopWidth: 2,
        borderRadius: 4,
        borderTopLeftRadius: 4,
        overflow: 'hidden',
      },
    ],
    [
      'explicit solid style',
      { borderWidth: 2, borderStyle: 'solid', overflow: 'hidden' },
    ],
  ])('supports %s', (_name, style) => {
    expect(supportsPlatformRouting(style)).toBe(true);
  });

  test.each([
    ['a visible border on a non-clipping view', { borderWidth: 2 }],
    [
      'a visible border with the default color',
      { borderWidth: 2, borderColor: undefined },
    ],
    [
      'a dashed border',
      { borderWidth: 2, borderStyle: 'dashed', overflow: 'hidden' },
    ],
    ['a border on one side only', { borderTopWidth: 2, overflow: 'hidden' }],
    [
      'a differing side width',
      { borderWidth: 2, borderLeftWidth: 4, overflow: 'hidden' },
    ],
    [
      'a color on one side only',
      { borderWidth: 2, borderTopColor: RED, overflow: 'hidden' },
    ],
    ['a corner radius on its own', { borderTopLeftRadius: 8 }],
    [
      'a differing corner radius',
      { borderRadius: 8, borderBottomRightRadius: 2 },
    ],
    ['a percentage radius', { borderRadius: '50%' }],
    [
      'a platform color border',
      { borderWidth: 2, borderColor: { semantic: ['label'] } },
    ],
  ])('rejects %s', (_name, style) => {
    expect(supportsPlatformRouting(style)).toBe(false);
  });
});

describe('platformBlockedUntil (iOS)', () => {
  const settings = (duration: number, delay = 0) => ({
    duration,
    delay,
    timingFunction: 'ease',
    allowDiscrete: false,
    value: [0, 1],
  });

  test('blocks until a border transition ends', () => {
    expect(
      platformBlockedUntil({ borderWidth: settings(300, 100) } as never, 1000)
    ).toBe(1400);
  });

  test('takes the latest end of several', () => {
    expect(
      platformBlockedUntil(
        { borderColor: settings(200), overflow: settings(500) } as never,
        1000
      )
    ).toBe(1500);
  });

  test('ignores other properties and removed ones', () => {
    expect(
      platformBlockedUntil(
        { backgroundColor: settings(300), borderRadius: null } as never,
        1000
      )
    ).toBe(0);
  });
});
