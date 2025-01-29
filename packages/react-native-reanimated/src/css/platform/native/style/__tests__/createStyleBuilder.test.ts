'use strict';
import createStyleBuilder from '../builderFactory';
import type { PlainStyle } from '../../../../types';

// TODO - add more tests

describe(createStyleBuilder, () => {
  const styleBuilder = createStyleBuilder({
    width: true,
    margin: true,
    borderRadius: true,
    flexDirection: true,
  });

  it("doesn't include undefined values", () => {
    const style: PlainStyle = {
      width: undefined,
      margin: 'auto',
      borderRadius: 10,
      flexDirection: undefined,
    };

    expect(styleBuilder.buildFrom(style)).toEqual({
      margin: 'auto',
      borderRadius: 10,
    });
  });

  it("doesn't include properties that are not in the config", () => {
    const style: PlainStyle = {
      width: 100,
      height: 100, // height is not in the config
    };

    expect(styleBuilder.buildFrom(style)).toEqual({
      width: 100,
    });
  });
});
