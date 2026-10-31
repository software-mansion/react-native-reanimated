'use strict';
import type { BoxShadowValue } from 'react-native';
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
import { unprocessSettledUpdate } from '../PropsRegistryGarbageCollector';

const context = { target: ValueProcessorTarget.Default };

const RAW_BOX_SHADOW: BoxShadowValue[] = [
  {
    offsetX: 1,
    offsetY: 2,
    blurRadius: 3,
    spreadDistance: 0,
    color: '#ff0000',
  },
];

const RAW_BACKGROUND_IMAGE = [
  {
    type: 'linear-gradient' as const,
    direction: '45deg',
    colorStops: [
      { color: '#ff0000', positions: ['0%'] },
      { color: '#0000ff', positions: ['100%'] },
    ],
  },
];

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

      unprocessSettledUpdate({
        props,
        style,
        keysLastWrittenByAnimatedStyle: [property],
      });

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

      unprocessSettledUpdate({
        props,
        style,
        keysLastWrittenByAnimatedStyle: ['opacity', 'width'],
      });

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

      unprocessSettledUpdate({
        props: {},
        style,
        keysLastWrittenByAnimatedStyle: ['boxShadow'],
      });

      expect(processBoxShadowRN(style.boxShadow)).toEqual(
        processBoxShadowRN(boxShadow)
      );
    });

    test('leaves a boxShadow last written by animated props untouched', () => {
      const props = { boxShadow: [...RAW_BOX_SHADOW] } as unknown as StyleProps;
      const style = { boxShadow: [...RAW_BOX_SHADOW] } as unknown as StyleProps;

      unprocessSettledUpdate({
        props,
        style,
        keysLastWrittenByAnimatedStyle: [],
      });

      expect(props.boxShadow).toEqual(RAW_BOX_SHADOW);
      expect(style.boxShadow).toEqual(RAW_BOX_SHADOW);
    });

    test('unprocesses a boxShadow last written by animated style in props and in style', () => {
      const props = {
        boxShadow: processBoxShadow(RAW_BOX_SHADOW, context),
      } as unknown as StyleProps;
      const style = {
        boxShadow: processBoxShadow(RAW_BOX_SHADOW, context),
      } as unknown as StyleProps;

      unprocessSettledUpdate({
        props,
        style,
        keysLastWrittenByAnimatedStyle: ['boxShadow'],
      });

      for (const unprocessed of [props, style]) {
        const [shadow] = unprocessed.boxShadow as BoxShadowValue[];
        expect(typeof shadow.color).toBe('string');
        expect(processBoxShadowRN(unprocessed.boxShadow)).toEqual(
          processBoxShadowRN(RAW_BOX_SHADOW)
        );
      }
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

      unprocessSettledUpdate({
        props: {},
        style,
        keysLastWrittenByAnimatedStyle: ['backgroundImage'],
      });

      expect(processBackgroundImageRN(style.backgroundImage)).toEqual(
        processBackgroundImageRN(backgroundImage)
      );
    });

    test('leaves a backgroundImage last written by animated props untouched', () => {
      const props = {
        backgroundImage: [...RAW_BACKGROUND_IMAGE],
      } as unknown as StyleProps;
      const style = {
        backgroundImage: [...RAW_BACKGROUND_IMAGE],
      } as unknown as StyleProps;

      unprocessSettledUpdate({
        props,
        style,
        keysLastWrittenByAnimatedStyle: [],
      });

      expect(props.backgroundImage).toEqual(RAW_BACKGROUND_IMAGE);
      expect(style.backgroundImage).toEqual(RAW_BACKGROUND_IMAGE);
    });

    test.each(['backgroundImage', 'experimental_backgroundImage'])(
      'unprocesses a %s last written by animated style in props and in style',
      (key) => {
        const props: StyleProps = {
          [key]: processBackgroundImage(RAW_BACKGROUND_IMAGE, context),
        };
        const style: StyleProps = {
          [key]: processBackgroundImage(RAW_BACKGROUND_IMAGE, context),
        };

        unprocessSettledUpdate({
          props,
          style,
          keysLastWrittenByAnimatedStyle: [key],
        });

        for (const unprocessed of [props, style]) {
          expect(processBackgroundImageRN(unprocessed[key])).toEqual(
            processBackgroundImageRN(RAW_BACKGROUND_IMAGE)
          );
        }
      }
    );
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
        const style = processObjectFit(objectFit, context) as StyleProps;
        expect(style).toEqual({ resizeMode });

        unprocessSettledUpdate({
          props: {},
          style,
          keysLastWrittenByAnimatedStyle: ['resizeMode'],
        });

        expect(style.objectFit).toBe(objectFit);
      }
    );

    test('reads scale-down back as contain, like React Native renders it', () => {
      const style = processObjectFit('scale-down', context) as StyleProps;

      unprocessSettledUpdate({
        props: {},
        style,
        keysLastWrittenByAnimatedStyle: ['resizeMode'],
      });

      expect(style).toEqual({ resizeMode: 'contain', objectFit: 'contain' });
    });

    test.each(['center', 'repeat'])(
      'clears objectFit for resizeMode %s without an objectFit counterpart',
      (resizeMode) => {
        const style: StyleProps = { resizeMode };

        unprocessSettledUpdate({
          props: {},
          style,
          keysLastWrittenByAnimatedStyle: ['resizeMode'],
        });

        expect(style).toEqual({ resizeMode });
        expect('objectFit' in style).toBe(true);
        expect(style.objectFit).toBeUndefined();
      }
    );

    test('overwrites an objectFit from an earlier settle when resizeMode has no counterpart', () => {
      const first: StyleProps = { resizeMode: 'contain' };
      const second: StyleProps = { resizeMode: 'repeat' };

      for (const style of [first, second]) {
        unprocessSettledUpdate({
          props: {},
          style,
          keysLastWrittenByAnimatedStyle: ['resizeMode'],
        });
      }
      const settledStyle = { ...first, ...second };

      expect(settledStyle.objectFit).toBeUndefined();
      expect(settledStyle.resizeMode).toBe('repeat');
    });

    test('leaves a resizeMode last written by animated props untouched', () => {
      const props: StyleProps = { resizeMode: 'cover' };
      const style: StyleProps = { resizeMode: 'cover' };

      unprocessSettledUpdate({
        props,
        style,
        keysLastWrittenByAnimatedStyle: [],
      });

      expect(props).toEqual({ resizeMode: 'cover' });
      expect(style).toEqual({ resizeMode: 'cover' });
    });

    test('leaves a settled update without resizeMode untouched', () => {
      const style: StyleProps = { opacity: 0.5 };

      unprocessSettledUpdate({
        props: {},
        style,
        keysLastWrittenByAnimatedStyle: ['resizeMode'],
      });

      expect(style).toEqual({ opacity: 0.5 });
    });
  });

  describe('verticalAlign', () => {
    test.each(['auto', 'top', 'bottom', 'middle'])(
      'round-trips verticalAlign %s through textAlignVertical',
      (verticalAlign) => {
        const style = processVerticalAlign(
          verticalAlign,
          context
        ) as StyleProps;

        unprocessSettledUpdate({
          props: {},
          style,
          keysLastWrittenByAnimatedStyle: ['textAlignVertical'],
        });

        expect(style.verticalAlign).toBe(verticalAlign);
      }
    );

    test('leaves a textAlignVertical last written by animated props untouched', () => {
      const style: StyleProps = { textAlignVertical: 'center' };

      unprocessSettledUpdate({
        props: {},
        style,
        keysLastWrittenByAnimatedStyle: [],
      });

      expect(style).toEqual({ textAlignVertical: 'center' });
    });

    test('leaves a settled update without textAlignVertical untouched', () => {
      const style: StyleProps = { opacity: 0.5 };

      unprocessSettledUpdate({
        props: {},
        style,
        keysLastWrittenByAnimatedStyle: ['textAlignVertical'],
      });

      expect(style).toEqual({ opacity: 0.5 });
    });
  });
});
