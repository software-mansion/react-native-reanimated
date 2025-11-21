'use strict';

import type { ReanimatedHTMLElement } from '../../../../ReanimatedModule/js-reanimated';
import type { CSSTransitionProperties } from '../../../types';

import { kebabizeCamelCase } from '../../../../common';
import {
  normalizeCSSTransitionProperties,
} from '../../normalization';
import { maybeAddSuffixes, parseTimingFunction } from '../../utils';
import CSSTransitionsManager from '../CSSTransitionsManager';

type StyleField = Extract<keyof CSSTransitionProperties, string>;

const STYLE_FIELDS: readonly StyleField[] = [
  'transition',
  'transitionProperty',
  'transitionDuration',
  'transitionDelay',
  'transitionTimingFunction',
  'transitionBehavior',
];

const initialStyleValues = Object.fromEntries(
  STYLE_FIELDS.map((key) => [key, ''])
) as Record<StyleField, string>;

const createElement = (
  overrides: Partial<Record<StyleField, string>> = {}
): ReanimatedHTMLElement => {
  const style = { ...initialStyleValues, ...overrides } as Record<
    StyleField,
    string
  >;

  return {
    style: style as CSSStyleDeclaration,
    previousStyle: {},
    props: {},
    _touchableNode: { setAttribute: jest.fn() },
  } as unknown as ReanimatedHTMLElement;
};

const transitionConfig: CSSTransitionProperties = {
  transitionProperty: ['opacity', 'transform', 'backgroundColor'],
  transitionDuration: ['150ms', '0.3s', 120],
  transitionDelay: ['25ms', '0.05s', 75],
  transitionTimingFunction: ['ease-in', 'ease-out', 'linear'],
  transitionBehavior: ['allow-discrete', 'normal', 'normal'],
};

describe('CSSTransitionsManager (web)', () => {
  test('update applies normalized transition settings to the element', () => {
    const element = createElement();
    const manager = new CSSTransitionsManager(element);

    const normalized = normalizeCSSTransitionProperties(transitionConfig);

    manager.update(transitionConfig);

    const expectedStyles: Record<StyleField, string> = {
      transition: '',
      transitionProperty: normalized.transitionProperty
        .map(kebabizeCamelCase)
        .join(','),
      transitionDuration: maybeAddSuffixes(normalized, 'transitionDuration', 'ms').join(','),
      transitionDelay: maybeAddSuffixes(normalized, 'transitionDelay', 'ms').join(','),
      transitionTimingFunction: parseTimingFunction(
        normalized.transitionTimingFunction
      ),
      transitionBehavior: normalized.transitionBehavior
        .map(kebabizeCamelCase)
        .join(','),
    };

    expect(element.style).toEqual(expect.objectContaining(expectedStyles));
  });

  test('update(null) clears transition styles after an active transition', () => {
    const element = createElement();
    const manager = new CSSTransitionsManager(element);

    manager.update(transitionConfig);
    manager.update(null);

    const clearedStyles: Record<StyleField, string> = {
      transition: '',
      transitionProperty: '',
      transitionDuration: '',
      transitionDelay: '',
      transitionTimingFunction: '',
      transitionBehavior: '',
    };

    expect(element.style).toEqual(expect.objectContaining(clearedStyles));
  });

  test('update(null) without prior transitions leaves styles unchanged', () => {
    const overrides: Partial<Record<StyleField, string>> = {
      transitionProperty: 'opacity',
      transitionDuration: '300ms',
      transitionDelay: '100ms',
      transitionTimingFunction: 'ease-in-out',
      transitionBehavior: 'allow-discrete',
    };
    const element = createElement(overrides);
    const manager = new CSSTransitionsManager(element);

    manager.update(null);

    expect(element.style).toEqual(
      expect.objectContaining({
        ...initialStyleValues,
        ...overrides,
      })
    );
  });
});
