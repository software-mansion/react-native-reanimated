import type { HostInstance } from 'react-native';
import { describe, expect, test } from 'tstyche';

import type { PseudoGroup } from '..';
import { createPseudoGroup, setPseudoStyles } from '..';

declare const instance: HostInstance;

describe('setPseudoStyles', () => {
  test('accepts own and group selectors', () => {
    const group = createPseudoGroup();
    expect(setPseudoStyles).type.toBeCallableWith(instance, {
      defaultStyle: { opacity: 1 },
      selectors: [
        { selector: ':active', style: { opacity: 0.5 } },
        { selector: ':active', group, style: { opacity: 0.8 } },
      ],
      hostsGroup: createPseudoGroup(),
      transition: { transitionProperty: 'opacity', transitionDuration: 150 },
    });
  });

  test('accepts null to unregister', () => {
    expect(setPseudoStyles).type.toBeCallableWith(instance, null);
  });

  test('rejects a group that createPseudoGroup did not create', () => {
    expect(setPseudoStyles).type.not.toBeCallableWith(instance, {
      selectors: [{ selector: ':active', group: 1, style: {} }],
    });
    expect(setPseudoStyles).type.not.toBeCallableWith(instance, {
      hostsGroup: 1,
    });
  });

  test('rejects a selector native pseudo styles do not support', () => {
    expect(setPseudoStyles).type.not.toBeCallableWith(instance, {
      selectors: [{ selector: ':visited', style: {} }],
    });
  });
});

describe('createPseudoGroup', () => {
  test('returns a PseudoGroup', () => {
    expect(createPseudoGroup()).type.toBe<PseudoGroup>();
  });
});
