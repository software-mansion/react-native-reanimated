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
  processObjectFit,
  processVerticalAlign,
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

  describe('objectFit', () => {
    test.each([
      ['contain', 'contain'],
      ['cover', 'cover'],
      ['fill', 'stretch'],
      ['none', 'none'],
    ])(
      'round-trips objectFit %s through resizeMode %s',
      (objectFit, resizeMode) => {
        const props: StyleProps = processObjectFit(
          objectFit,
          context
        ) as StyleProps;
        expect(props).toEqual({ resizeMode });

        unprocessProps(props);

        expect(props.objectFit).toBe(objectFit);
      }
    );

    test('reads scale-down back as contain, like React Native renders it', () => {
      const props: StyleProps = processObjectFit(
        'scale-down',
        context
      ) as StyleProps;

      unprocessProps(props);

      expect(props).toEqual({ resizeMode: 'contain', objectFit: 'contain' });
    });

    test.each(['center', 'repeat'])(
      'clears objectFit for resizeMode %s without an objectFit counterpart',
      (resizeMode) => {
        const props: StyleProps = { resizeMode };

        unprocessProps(props);

        expect(props).toEqual({ resizeMode });
        expect('objectFit' in props).toBe(true);
        expect(props.objectFit).toBeUndefined();
      }
    );

    test('overwrites an objectFit from an earlier settle when resizeMode has no counterpart', () => {
      const first: StyleProps = { resizeMode: 'contain' };
      const second: StyleProps = { resizeMode: 'repeat' };

      unprocessProps(first);
      unprocessProps(second);
      const settledStyle = { ...first, ...second };

      expect(settledStyle.objectFit).toBeUndefined();
      expect(settledStyle.resizeMode).toBe('repeat');
    });

    test('leaves a props bag without resizeMode untouched', () => {
      const props: StyleProps = { opacity: 0.5 };

      unprocessProps(props);

      expect('objectFit' in props).toBe(false);
    });
  });

  describe('verticalAlign', () => {
    test.each(['auto', 'top', 'bottom', 'middle'])(
      'round-trips verticalAlign %s through textAlignVertical',
      (verticalAlign) => {
        const props: StyleProps = processVerticalAlign(
          verticalAlign,
          context
        ) as StyleProps;

        unprocessProps(props);

        expect(props.verticalAlign).toBe(verticalAlign);
      }
    );

    test('leaves a props bag without textAlignVertical untouched', () => {
      const props: StyleProps = { opacity: 0.5 };

      unprocessProps(props);

      expect(props).toEqual({ opacity: 0.5 });
    });
  });
});
