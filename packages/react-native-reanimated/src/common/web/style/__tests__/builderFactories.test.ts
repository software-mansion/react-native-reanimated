'use strict';
import { createRuleBuilder, createStyleBuilder } from '../builderFactories';

describe(createStyleBuilder, () => {
  test('builds CSS declarations with aliases, suffixes, and rule builders', () => {
    const radiusBuilder = createRuleBuilder(
      {
        borderTopLeftRadius: 'px',
        borderTopRightRadius: 'px',
      },
      ({ borderTopLeftRadius = '0px', borderTopRightRadius = '0px' }) => ({
        'border-radius': `${borderTopLeftRadius} ${borderTopRightRadius}`,
      })
    );

    const builder = createStyleBuilder(
      {
        width: true,
        margin: 'px',
        padding: { name: 'padding-inline' },
        color: { process: (value: string) => value.toUpperCase() },
        borderTopLeftRadius: radiusBuilder,
        borderTopRightRadius: radiusBuilder,
      },
      (props, aliases) =>
        Object.entries(props)
          .map(([key, value]) => `${aliases[key] ?? key}: ${value}`)
          .join('; ')
    );

    builder.add('width', 100);
    builder.add('margin', 8);
    builder.add('padding', '2rem');
    builder.add('color', 'blue');
    builder.add('borderTopLeftRadius', 4);
    builder.add('borderTopRightRadius', 8);

    const result = builder.build();

    expect(result).toBe(
      'width: 100; margin: 8px; padding-inline: 2rem; color: BLUE; border-radius: 4px 8px'
    );

    expect(builder.build()).toBe('');
  });

  test('returns null when no properties are added', () => {
    const builder = createStyleBuilder({ width: true });
    expect(builder.build()).toBeNull();
  });
});

describe(createRuleBuilder, () => {
  test('aggregates values using the build handler', () => {
    const builder = createRuleBuilder(
      {
        offsetX: 'px',
        offsetY: 'px',
      },
      ({ offsetX = '0px', offsetY = '0px' }) => ({
        transform: `translate(${offsetX}, ${offsetY})`,
      })
    );

    builder.add('offsetX', 12);
    builder.add('offsetY', 4);

    expect(builder.build()).toEqual({
      transform: 'translate(12px, 4px)',
    });

    expect(builder.build()).toEqual({
      transform: 'translate(0px, 0px)',
    });
  });
});
