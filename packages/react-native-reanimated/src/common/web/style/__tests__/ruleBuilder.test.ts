'use strict';
import { createWebRuleBuilder } from '../ruleBuilder';

describe(createWebRuleBuilder, () => {
  test('accumulates props and builds result', () => {
    const shadowBuilder = createWebRuleBuilder(
      {
        shadowColor: true,
        shadowOffset: {
          process: (val: { width: number; height: number }) =>
            `${val.width}px ${val.height}px`,
        },
        shadowRadius: 'px',
      },
      ({ shadowColor = '#000', shadowOffset = '0 0', shadowRadius = '0' }) => ({
        boxShadow: `${shadowOffset} ${shadowRadius} ${shadowColor}`,
      })
    );

    shadowBuilder.add('shadowColor', 'red');
    shadowBuilder.add('shadowOffset', { width: 2, height: 4 });
    shadowBuilder.add('shadowRadius', 8);

    const result = shadowBuilder.build();

    expect(result).toEqual({
      boxShadow: '2px 4px 8px red',
    });
  });

  test('clears accumulated props after build', () => {
    const builder = createWebRuleBuilder(
      {
        prop1: true,
        prop2: 'px',
      },
      ({ prop1 = 'default1', prop2 = 'default2' }) => ({
        combined: `${prop1}-${prop2}`,
      })
    );

    builder.add('prop1', 'first');
    builder.add('prop2', 10);
    const result1 = builder.build();

    builder.add('prop1', 'second');
    builder.add('prop2', 20);
    const result2 = builder.build();

    expect(result1).toEqual({ combined: 'first-10px' });
    expect(result2).toEqual({ combined: 'second-20px' });
  });

  test('handles boolean config', () => {
    const builder = createWebRuleBuilder(
      {
        enabled: true,
        disabled: false,
      },
      ({ enabled = 'none' }) => ({
        result: enabled,
      })
    );

    builder.add('enabled', 'yes');
    const result = builder.build();

    expect(result).toEqual({ result: 'yes' });
  });

  test('handles suffix config', () => {
    const builder = createWebRuleBuilder(
      {
        width: 'px',
        height: '%',
      },
      ({ width = '0', height = '0' }) => ({
        size: `${width}x${height}`,
      })
    );

    builder.add('width', 100);
    builder.add('height', '50%');
    const result = builder.build();

    expect(result).toEqual({ size: '100pxx50%' });
  });

  test('handles value processors', () => {
    const builder = createWebRuleBuilder(
      {
        color: {
          process: (val: string) => val.toUpperCase(),
        },
        size: {
          process: (val: number) => `${val * 2}px`,
        },
      },
      ({ color = 'black', size = '0' }) => ({
        style: `${color} ${size}`,
      })
    );

    builder.add('color', 'red');
    builder.add('size', 10);
    const result = builder.build();

    expect(result).toEqual({ style: 'RED 20px' });
  });

  test('handles name aliases', () => {
    const builder = createWebRuleBuilder(
      {
        oldName: { name: 'newName' },
      },
      (props: Record<string, string>) => ({
        result: props.newName,
      })
    );

    builder.add('oldName', 'value');
    const result = builder.build();

    expect(result).toEqual({ result: 'value' });
  });

  test('handles multiple name aliases', () => {
    const builder = createWebRuleBuilder(
      {
        matrix: { name: 'matrix3d' },
        rotate: true,
      },
      (props: Record<string, string>) => ({
        transform: Object.entries(props)
          .map(([key, value]) => `${key}(${value})`)
          .join(' '),
      })
    );

    builder.add('matrix', '1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1');
    builder.add('rotate', '45deg');
    const result = builder.build();

    expect(result).toEqual({
      transform:
        'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1) rotate(45deg)',
    });
  });
});
