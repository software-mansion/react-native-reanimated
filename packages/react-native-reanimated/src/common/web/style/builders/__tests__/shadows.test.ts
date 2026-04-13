'use strict';
import { boxShadowBuilder, textShadowBuilder } from '../shadows';

describe('boxShadowBuilder', () => {
  test('builds box-shadow from all properties', () => {
    boxShadowBuilder.add('shadowColor', 'red');
    boxShadowBuilder.add('shadowOffset', { width: 2, height: 4 });
    boxShadowBuilder.add('shadowOpacity', 0.5);
    boxShadowBuilder.add('shadowRadius', 8);

    const result = boxShadowBuilder.build();

    expect(result).toEqual({
      boxShadow: '2px 4px 8px rgba(255, 0, 0, 0.5)',
    });
  });

  test('uses default values when properties not provided', () => {
    const result = boxShadowBuilder.build();

    expect(result).toEqual({
      boxShadow: '0 0 0 #000',
    });
  });

  test('applies opacity to shadow color', () => {
    boxShadowBuilder.add('shadowColor', '#ff0000');
    boxShadowBuilder.add('shadowOpacity', 0.3);

    const result = boxShadowBuilder.build();

    expect(result).toEqual({
      boxShadow: '0 0 0 rgba(255, 0, 0, 0.3)',
    });
  });

  test('clamps opacity between 0 and 1', () => {
    boxShadowBuilder.add('shadowColor', 'blue');
    boxShadowBuilder.add('shadowOpacity', 1.5);

    const result = boxShadowBuilder.build();

    expect(result).toEqual({
      boxShadow: '0 0 0 blue',
    });
  });

  test('does not apply opacity when it equals 1', () => {
    boxShadowBuilder.add('shadowColor', 'green');
    boxShadowBuilder.add('shadowOpacity', 1);

    const result = boxShadowBuilder.build();

    expect(result).toEqual({
      boxShadow: '0 0 0 green',
    });
  });
});

describe('textShadowBuilder', () => {
  test('builds text-shadow from all properties', () => {
    textShadowBuilder.add('textShadowColor', 'blue');
    textShadowBuilder.add('textShadowOffset', { width: 1, height: 2 });
    textShadowBuilder.add('textShadowRadius', 3);

    const result = textShadowBuilder.build();

    expect(result).toEqual({
      textShadow: '1px 2px 3px blue',
    });
  });

  test('uses default values when properties not provided', () => {
    const result = textShadowBuilder.build();

    expect(result).toEqual({
      textShadow: '0 0 0 #000',
    });
  });
});
