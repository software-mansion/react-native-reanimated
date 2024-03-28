'use strict';

import { Platform } from 'react-native';
import { processColor } from '../Colors';

const platformSpecific = // Copied from RN, but as far as I know Platform.OS will be always IOS
  Platform.OS === 'android'
    ? (unsigned: number) => unsigned | 0
    : (x: number) => x;

describe('processColor', () => {
  describe('predefined color names', () => {
    it('should convert red', () => {
      const colorFromString = processColor('red');
      const expectedInt = 0xffff0000;
      expect(colorFromString).toEqual(platformSpecific(expectedInt));
    });

    it('should convert white', () => {
      const colorFromString = processColor('white');
      const expectedInt = 0xffffffff;
      expect(colorFromString).toEqual(platformSpecific(expectedInt));
    });

    it('should convert black', () => {
      const colorFromString = processColor('black');
      const expectedInt = 0xff000000;
      expect(colorFromString).toEqual(platformSpecific(expectedInt));
    });

    it('should convert transparent', () => {
      const colorFromString = processColor('transparent');
      const expectedInt = 0x00000000;
      expect(colorFromString).toEqual(platformSpecific(expectedInt));
    });
  });

  describe('color() strings', () => {
    it('should convert color(s r g b)', () => {
      const colorFromString = processColor('color(srgb 1 0 0)');
      expect(colorFromString).toEqual({
        space: 'srgb',
        r: 1,
        g: 0,
        b: 0,
        a: 1,
      });
    });

    it('should convert color(s r g b / a)', () => {
      const colorFromString = processColor('color(display-p3 1 0 0 / 0.5)');
      expect(colorFromString).toEqual({
        space: 'display-p3',
        r: 1,
        g: 0,
        b: 0,
        a: 0.5,
      });
    });
  });

  describe('RGB strings', () => {
    it('should convert rgb(x, y, z)', () => {
      const colorFromString = processColor('rgb(10, 20, 30)');
      const expectedInt = 0xff0a141e;
      expect(colorFromString).toEqual(platformSpecific(expectedInt));
    });
  });

  describe('RGBA strings', () => {
    it('should convert rgba(x, y, z, a)', () => {
      const colorFromString = processColor('rgba(10, 20, 30, 0.4)');
      const expectedInt = 0x660a141e;
      expect(colorFromString).toEqual(platformSpecific(expectedInt));
    });
  });

  describe('HSL strings', () => {
    it('should convert hsl(x, y%, z%)', () => {
      const colorFromString = processColor('hsl(318, 69%, 55%)');
      const expectedInt = 0xffdb3dac;
      expect(colorFromString).toEqual(platformSpecific(expectedInt));
    });
  });

  describe('HSLA strings', () => {
    it('should convert hsla(x, y%, z%, a)', () => {
      const colorFromString = processColor('hsla(318, 69%, 55%, 0.25)');
      const expectedInt = 0x40db3dac;
      expect(colorFromString).toEqual(platformSpecific(expectedInt));
    });
  });

  describe('hex strings', () => {
    it('should convert #xxxxxx', () => {
      const colorFromString = processColor('#1e83c9');
      const expectedInt = 0xff1e83c9;
      expect(colorFromString).toEqual(platformSpecific(expectedInt));
    });
  });
});
