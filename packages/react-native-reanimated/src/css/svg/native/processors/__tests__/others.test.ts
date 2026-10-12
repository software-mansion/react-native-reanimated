'use strict';

import {
  getPropsBuilder,
  registerComponentPropsBuilder,
} from '../../../../../common';
import { SVG_TEXT_PROPERTIES_CONFIG } from '../../configs';
import { processNumberArray } from '../others';

describe(processNumberArray, () => {
  test.each([
    ['1 2 3', ['1', '2', '3']],
    ['1,2,3', ['1', '2', '3']],
    ['1, 2 , 3', ['1', '2', '3']],
  ])('splits %j into %p', (input, expected) => {
    expect(processNumberArray(input)).toEqual(expected);
  });

  test('wraps a lone number into an array', () => {
    expect(processNumberArray(5)).toEqual([5]);
  });

  test('returns an array unchanged', () => {
    expect(processNumberArray([1, 2])).toEqual([1, 2]);
  });

  // The processor is reached only through a props builder, which hands it an
  // already trimmed value, so padding has to be covered through the builder.
  test('the props builder strips the padding before splitting', () => {
    registerComponentPropsBuilder('RNSVGText', SVG_TEXT_PROPERTIES_CONFIG);

    expect(getPropsBuilder('RNSVGText').build({ x: '  1, 2, 3  ' })).toEqual({
      x: ['1', '2', '3'],
    });
  });
});
