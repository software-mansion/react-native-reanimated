'use strict';
import type { HostInstance } from 'react-native';

import {
  markNodeAsRemovable,
  registerPseudoStyles,
  unmarkNodeAsRemovable,
  unregisterPseudoStyles,
} from '../../native/proxy';
import type { PseudoStylesConfig } from '../../types';
import { createPseudoGroup } from '../pseudoGroup';
import { setPseudoStyles } from '../pseudoStyles';

const mockShadowNodeWrapper = {};

jest.mock('../../../common', () => ({
  ...jest.requireActual('../../../common'),
  IS_JEST: false,
  getPropsBuilder: () => ({ build: (style: object) => ({ ...style }) }),
}));

jest.mock('../../../fabricUtils', () => ({
  getShadowNodeWrapperFromRef: () => mockShadowNodeWrapper,
}));

jest.mock('../../native/proxy', () => ({
  markNodeAsRemovable: jest.fn(),
  registerPseudoStyles: jest.fn(),
  unmarkNodeAsRemovable: jest.fn(),
  unregisterPseudoStyles: jest.fn(),
}));

function createHostInstance(viewTag: number): HostInstance {
  return {
    __nativeTag: viewTag,
    __viewConfig: { uiViewClassName: 'RCTView' },
  } as unknown as HostInstance;
}

const PRESSED_CONFIG: PseudoStylesConfig = {
  defaultStyle: { opacity: 1 },
  selectors: [{ selector: ':active', style: { opacity: 0.5 } }],
};

describe('setPseudoStyles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers own and group selectors, resting a property no default names', () => {
    const group = createPseudoGroup();

    setPseudoStyles(createHostInstance(1), {
      defaultStyle: { opacity: 1 },
      selectors: [
        { selector: ':active', style: { opacity: 0.5 } },
        { selector: ':active', group, style: { transform: [{ scale: 0.9 }] } },
      ],
    });

    expect(registerPseudoStyles).toHaveBeenCalledTimes(1);
    expect(registerPseudoStyles).toHaveBeenCalledWith(mockShadowNodeWrapper, {
      defaultStyle: { opacity: 1, transform: null },
      selectors: [
        {
          selector: ':active',
          selectorStyle: { opacity: 0.5 },
          transition: {
            opacity: expect.objectContaining({ value: [1, 0.5] }),
          },
        },
        {
          selector: ':active',
          group,
          selectorStyle: { transform: [{ scale: 0.9 }] },
          transition: {
            transform: expect.objectContaining({
              value: [null, [{ scale: 0.9 }]],
            }),
          },
        },
      ],
    });
  });

  test('registers a view that only hosts a group', () => {
    const group = createPseudoGroup();

    setPseudoStyles(createHostInstance(2), { hostsGroup: group });

    expect(registerPseudoStyles).toHaveBeenCalledWith(mockShadowNodeWrapper, {
      defaultStyle: {},
      selectors: [],
      hostsGroup: group,
    });
  });

  test('registers an unchanged config once', () => {
    const instance = createHostInstance(3);

    setPseudoStyles(instance, PRESSED_CONFIG);
    setPseudoStyles(instance, { ...PRESSED_CONFIG });

    expect(registerPseudoStyles).toHaveBeenCalledTimes(1);
  });

  test('unregisters on null and marks the node removable until it registers again', () => {
    const instance = createHostInstance(4);

    setPseudoStyles(instance, PRESSED_CONFIG);
    setPseudoStyles(instance, null);
    setPseudoStyles(instance, null);

    expect(unregisterPseudoStyles).toHaveBeenCalledTimes(1);
    expect(unregisterPseudoStyles).toHaveBeenCalledWith(4);
    expect(markNodeAsRemovable).toHaveBeenCalledTimes(1);
    expect(markNodeAsRemovable).toHaveBeenCalledWith(mockShadowNodeWrapper);

    setPseudoStyles(instance, PRESSED_CONFIG);

    expect(unmarkNodeAsRemovable).toHaveBeenCalledWith(4);
    expect(registerPseudoStyles).toHaveBeenCalledTimes(2);
  });

  test('does nothing on null for a view it never registered', () => {
    setPseudoStyles(createHostInstance(5), null);

    expect(unregisterPseudoStyles).not.toHaveBeenCalled();
    expect(markNodeAsRemovable).not.toHaveBeenCalled();
  });

  test('refuses an instance that is not a host component', () => {
    expect(() => setPseudoStyles({} as HostInstance, PRESSED_CONFIG)).toThrow(
      'host component'
    );
  });
});

describe('createPseudoGroup', () => {
  test('creates a distinct group on every call', () => {
    expect(createPseudoGroup()).not.toBe(createPseudoGroup());
  });
});
