'use strict';

import type { ReanimatedHTMLElement } from '../../../../ReanimatedModule/js-reanimated';
import type {
  CSSAnimationKeyframes,
  ExistingCSSAnimationProperties,
} from '../../../types';

import { convertPropertiesToArrays } from '../../../../common';
import { configureWebCSSAnimations, insertCSSAnimation, removeCSSAnimation } from '../../domUtils';
import { parseTimingFunction } from '../../utils';
import CSSAnimationsManager from '../CSSAnimationsManager';

jest.mock('../../domUtils', () => ({
  configureWebCSSAnimations: jest.fn(),
  insertCSSAnimation: jest.fn(),
  removeCSSAnimation: jest.fn(),
}));

jest.mock('../../animationParser', () => ({
  processKeyframeDefinitions: jest.fn((keyframes: CSSAnimationKeyframes) =>
    JSON.stringify(keyframes)
  ),
}));

const STYLE_FIELDS = [
  'animationName',
  'animationDuration',
  'animationDelay',
  'animationDirection',
  'animationFillMode',
  'animationPlayState',
  'animationIterationCount',
  'animationTimingFunction',
] as const;

type StyleField = (typeof STYLE_FIELDS)[number];

const initialStyles = Object.fromEntries(STYLE_FIELDS.map((field) => [field, ''])) as Record<StyleField, string>;

const createElement = (overrides?: Partial<Record<StyleField, string>>) =>
  ({
    style: { ...initialStyles, ...overrides } as unknown as CSSStyleDeclaration,
    previousStyle: {},
    props: {},
    _touchableNode: { setAttribute: jest.fn() },
  } as unknown as ReanimatedHTMLElement);

const createAnimationProperties = (
  overrides?: Partial<ExistingCSSAnimationProperties>
): ExistingCSSAnimationProperties => ({
  animationName: [
    {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
  ],
  animationDuration: ['150ms'],
  animationDelay: ['20ms'],
  animationTimingFunction: ['ease-in-out'],
  ...overrides,
});

const getStyles = (element: ReanimatedHTMLElement) =>
  STYLE_FIELDS.reduce<Record<StyleField, string>>((acc, field) => {
    acc[field] = (element.style as unknown as Record<StyleField, string>)[field];
    return acc;
  }, {} as Record<StyleField, string>);

const generatedAnimationNamePattern = /^REA-CSS-\d+$/;

describe('CSSAnimationsManager (web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('configures web CSS animations during construction', () => {
    const element = createElement();

    new CSSAnimationsManager(element);

    expect(configureWebCSSAnimations).toHaveBeenCalledTimes(1);
  });

  test('update applies basic animation properties to the element', () => {
    const element = createElement();
    const manager = new CSSAnimationsManager(element);

    const properties = createAnimationProperties();
    manager.update(properties);

    expect(insertCSSAnimation).toHaveBeenCalledTimes(1);

    const expectedSettings = convertPropertiesToArrays(properties);
    const expectedStyles = {
      animationName: expect.any(String),
      animationDuration: expectedSettings.animationDuration.join(','),
      animationDelay: expectedSettings.animationDelay.join(','),
      animationDirection: '',
      animationFillMode: '',
      animationPlayState: '',
      animationIterationCount: '',
      animationTimingFunction: parseTimingFunction(
        expectedSettings.animationTimingFunction ?? []
      ),
    };

    expect(getStyles(element)).toEqual(
      expect.objectContaining(expectedStyles)
    );
  });

  test('update(null) clears animation styles and removes keyframes', () => {
    const element = createElement();
    const manager = new CSSAnimationsManager(element);

    manager.update(createAnimationProperties());
    jest.clearAllMocks();

    manager.update(null);

    const styles = getStyles(element);
    expect(styles.animationName).toEqual(expect.stringMatching(generatedAnimationNamePattern));
    const clearedStyles = Object.fromEntries(
      STYLE_FIELDS.map((key) => [key, key === 'animationName' ? styles.animationName : ''])
    );

    expect(styles).toEqual(clearedStyles);
    expect(removeCSSAnimation).toHaveBeenCalledTimes(1);
  });
});
