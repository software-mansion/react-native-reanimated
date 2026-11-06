'use strict';
import { processColor as processColorRN } from 'react-native';
// @ts-expect-error React Native ships no type declarations for this internal module.
import processBackgroundImageRN from 'react-native/Libraries/StyleSheet/processBackgroundImage';
// @ts-expect-error React Native ships no type declarations for this internal module.
import processBoxShadowRN from 'react-native/Libraries/StyleSheet/processBoxShadow';

import {
  processBackgroundImage,
  processBoxShadow,
  processColor,
} from '../common/style/processors';
import { ValueProcessorTarget } from '../common/types';
import type { StyleProps } from '../commonTypes';
import { unprocessSettledUpdate } from '../PropsRegistryGarbageCollector';

const context = { target: ValueProcessorTarget.Default };

describe('unprocessSettledUpdate', () => {
  describe('colors', () => {
    const COLORS = [
      '#ff0000',
      '#00ff0080',
      'rgba(0, 0, 255, 0.5)',
      'hsl(120, 100%, 50%)',
      'red',
      'transparent',
    ];

    test.each(
      ['backgroundColor', 'color', 'borderColor', 'shadowColor', 'tintColor']
        .map((property) => COLORS.map((color) => [property, color]))
        .flat()
    )('round-trips %s: %s through React Native', (property, color) => {
      const props: StyleProps = { [property]: processColor(color) };
      const style: StyleProps = { [property]: processColor(color) };

      unprocessSettledUpdate({ props, style });

      for (const unprocessed of [props, style]) {
        expect(typeof unprocessed[property]).toBe('string');
        expect(processColorRN(unprocessed[property] as string)).toBe(
          processColorRN(color)
        );
      }
    });

    test('leaves a non-color property untouched', () => {
      const props: StyleProps = { opacity: 0.5, width: 10 };
      const style: StyleProps = { opacity: 0.5, width: 10 };

      unprocessSettledUpdate({ props, style });

      expect(props).toEqual({ opacity: 0.5, width: 10 });
      expect(style).toEqual({ opacity: 0.5, width: 10 });
    });
  });

  describe('boxShadow', () => {
    test.each([
      '0px 4px 8px 2px rgba(0, 0, 0, 0.5)',
      'inset 1px 2px 3px 4px #00ff00',
      '1px 1px 1px 1px red, -2px -2px 2px 2px blue',
      [
        {
          offsetX: 1,
          offsetY: 2,
          blurRadius: 3,
          spreadDistance: 4,
          color: '#ff0000',
          inset: true,
        },
      ],
    ])('round-trips %s through React Native', (boxShadow) => {
      const style = {
        boxShadow: processBoxShadow(boxShadow, context),
      } as unknown as StyleProps;

      unprocessSettledUpdate({ props: {}, style });

      expect(processBoxShadowRN(style.boxShadow)).toEqual(
        processBoxShadowRN(boxShadow)
      );
    });

    test('leaves a boxShadow passed as a prop untouched', () => {
      const boxShadow = [
        { offsetX: 1, offsetY: 2, blurRadius: 3, color: '#ff0000' },
      ];
      const props = { boxShadow: [...boxShadow] } as unknown as StyleProps;

      unprocessSettledUpdate({ props, style: {} });

      expect(props.boxShadow).toEqual(boxShadow);
    });
  });

  describe('backgroundImage', () => {
    test.each([
      'linear-gradient(45deg, #ff0000 0%, #0000ff 100%)',
      'linear-gradient(to top right, red, 30%, blue 90%)',
      'linear-gradient(rgba(255, 0, 0, 0.5) 10px, transparent 20px)',
      'radial-gradient(circle at 30% 50%, #ffffff, #0000ff00 20px)',
      'radial-gradient(ellipse 22% 70% at 50% 0%, #ffe6c4 0%, transparent 100%)',
      'radial-gradient(closest-side, red, blue), linear-gradient(180deg, red, blue)',
    ])('round-trips %s through React Native', (backgroundImage) => {
      const style = {
        backgroundImage: processBackgroundImage(backgroundImage, context),
      } as unknown as StyleProps;

      unprocessSettledUpdate({ props: {}, style });

      expect(processBackgroundImageRN(style.backgroundImage)).toEqual(
        processBackgroundImageRN(backgroundImage)
      );
    });
  });
});
