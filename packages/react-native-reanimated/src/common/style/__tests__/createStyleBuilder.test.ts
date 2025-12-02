'use strict';
import type { PlainStyle } from '../../types';
import { ValueProcessorTarget } from '../../types';
import createStyleBuilder from '../createStyleBuilder';
// TODO - add more tests

describe(createStyleBuilder, () => {
  const styleBuilder = createStyleBuilder({
    width: true,
    margin: true,
    borderRadius: true,
    flexDirection: true,
  });

  test("doesn't include undefined values", () => {
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

  test("doesn't include properties that are not in the config", () => {
    const style: PlainStyle = {
      width: 100,
      height: 100, // height is not in the config
    };

    expect(styleBuilder.buildFrom(style)).toEqual({
      width: 100,
    });
  });

  test('passes context to processors', () => {
    const processor = jest.fn();

    const builder = createStyleBuilder(
      {
        borderRadius: {
          process: processor,
        },
      },
      {
        target: ValueProcessorTarget.CSS,
      }
    );

    builder.buildFrom({ borderRadius: 5 });

    expect(processor).toHaveBeenCalledWith(5, {
      target: ValueProcessorTarget.CSS,
    });
  });

  test('uses default target when none provided', () => {
    const processor = jest.fn();

    const builder = createStyleBuilder({ padding: { process: processor } });

    builder.buildFrom({ padding: 8 });

    expect(processor).toHaveBeenCalledWith(8, {
      target: ValueProcessorTarget.Default,
    });
  });
});
