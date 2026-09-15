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
import { unprocessProps } from '../PropsRegistryGarbageCollector';

const context = { target: ValueProcessorTarget.Default };

describe('unprocessProps', () => {
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

      unprocessProps(props);

      expect(typeof props[property]).toBe('string');
      expect(processColorRN(props[property] as string)).toBe(
        processColorRN(color)
      );
    });

    test('leaves a non-color property untouched', () => {
      const props: StyleProps = { opacity: 0.5, width: 10 };

      unprocessProps(props);

      expect(props).toEqual({ opacity: 0.5, width: 10 });
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
      const props = {
        boxShadow: processBoxShadow(boxShadow, context),
      } as unknown as StyleProps;

      unprocessProps(props);

      expect(processBoxShadowRN(props.boxShadow)).toEqual(
        processBoxShadowRN(boxShadow)
      );
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
      const props = {
        backgroundImage: processBackgroundImage(backgroundImage, context),
      } as unknown as StyleProps;

      unprocessProps(props);

      expect(processBackgroundImageRN(props.backgroundImage)).toEqual(
        processBackgroundImageRN(backgroundImage)
      );
    });
  });
});
