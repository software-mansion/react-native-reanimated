'use strict';

import { withTiming } from '../../animation';
import { SlideInLeft } from '../defaultAnimations/Slide';
import { buildNativeLayoutAnimationDescriptor } from '../nativeAnimationDescriptor';

describe('native layout animation descriptor', () => {
  test('samples SlideInLeft and adds its target opacity', () => {
    const style = SlideInLeft.duration(100).build()({
      targetOriginX: 100,
      targetGlobalOriginX: 100,
      targetOriginY: 200,
      targetGlobalOriginY: 200,
      targetWidth: 50,
      targetHeight: 50,
      targetBorderRadius: 0,
      windowWidth: 400,
      windowHeight: 800,
    });

    const descriptor = buildNativeLayoutAnimationDescriptor(style, 0.4);

    expect(descriptor.properties.map((property) => property.keyPath)).toEqual([
      'originX',
      'opacity',
    ]);
  });

  test('adds the target opacity to a geometry-only entering animation', () => {
    const descriptor = buildNativeLayoutAnimationDescriptor(
      {
        animations: {
          originX: withTiming(100, { duration: 100 }),
        },
        initialValues: {
          originX: 0,
        },
      },
      0.4
    );

    expect(
      descriptor.properties.find((property) => property.keyPath === 'opacity')
    ).toEqual({
      keyPath: 'opacity',
      offsets: [0, 1],
      values: [0.4, 0.4],
    });
  });

  test('keeps an explicit opacity animation unchanged', () => {
    const descriptor = buildNativeLayoutAnimationDescriptor(
      {
        animations: {
          opacity: withTiming(1, { duration: 100 }),
        },
        initialValues: {
          opacity: 0,
        },
      },
      0.4
    );

    const opacity = descriptor.properties.find(
      (property) => property.keyPath === 'opacity'
    );
    expect(opacity?.values[0]).toBe(0);
    expect(opacity?.values[opacity.values.length - 1]).toBe(1);
  });
});
