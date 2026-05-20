'use strict';
import type { ReanimatedHTMLElement } from '../../../../ReanimatedModule/js-reanimated';
import {
  insertPseudoSelectorCSS,
  removePseudoSelectorCSS,
} from '../../domUtils';
import CSSPseudoSelectorsManager from '../CSSPseudoSelectorsManager';

jest.mock('../../domUtils', () => ({
  insertPseudoSelectorCSS: jest.fn(),
  removePseudoSelectorCSS: jest.fn(),
}));

const insertMock = insertPseudoSelectorCSS as jest.Mock;
const removeMock = removePseudoSelectorCSS as jest.Mock;

const createElement = (): ReanimatedHTMLElement => {
  const classNames: string[] = [];
  return {
    style: {} as CSSStyleDeclaration,
    classList: {
      add: jest.fn((c: string) => classNames.push(c)),
      remove: jest.fn((c: string) => {
        const i = classNames.indexOf(c);
        if (i >= 0) {
          classNames.splice(i, 1);
        }
      }),
      contains: (c: string) => classNames.includes(c),
    } as unknown as DOMTokenList,
  } as unknown as ReanimatedHTMLElement;
};

describe(CSSPseudoSelectorsManager, () => {
  beforeEach(() => {
    insertMock.mockClear();
    removeMock.mockClear();
  });

  test('emits a raw CSS rule for an arbitrary selector', () => {
    const element = createElement();
    const manager = new CSSPseudoSelectorsManager(element);

    manager.update({
      ':nth-child(odd)': {
        selectorStyle: { backgroundColor: 'red' },
        defaultStyle: { backgroundColor: 'blue' },
      },
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    const [, css] = insertMock.mock.calls[0];
    expect(css).toMatch(/:nth-child\(odd\)/);
    expect(css).toMatch(/background-color: red !important/);
    expect(css).not.toMatch(/:has\(/);
  });

  test('orders known selectors before arbitrary ones (last wins on overlap)', () => {
    const element = createElement();
    const manager = new CSSPseudoSelectorsManager(element);

    manager.update({
      ':hover': {
        selectorStyle: { color: 'red' },
        defaultStyle: { color: 'black' },
      },
      ':nth-child(odd)': {
        selectorStyle: { color: 'green' },
        defaultStyle: { color: 'black' },
      },
    });

    const [, css] = insertMock.mock.calls[0];
    const hoverIdx = css.indexOf(':hover');
    const nthIdx = css.indexOf(':nth-child(odd)');
    expect(hoverIdx).toBeGreaterThanOrEqual(0);
    expect(nthIdx).toBeGreaterThan(hoverIdx);
  });

  test('mixes known + arbitrary selectors in the same rule set', () => {
    const element = createElement();
    const manager = new CSSPseudoSelectorsManager(element);

    manager.update({
      ':hover': {
        selectorStyle: { opacity: 0.5 },
        defaultStyle: { opacity: 1 },
      },
      ':focus-visible': {
        selectorStyle: { borderColor: 'blue' },
        defaultStyle: { borderColor: 'gray' },
      },
    });

    const [, css] = insertMock.mock.calls[0];
    expect(css).toMatch(/:hover/);
    expect(css).toMatch(/:focus-visible/);
  });

  test('calls removePseudoSelectorCSS on unmount', () => {
    const element = createElement();
    const manager = new CSSPseudoSelectorsManager(element);

    manager.update({
      ':nth-child(odd)': {
        selectorStyle: { color: 'red' },
        defaultStyle: { color: 'black' },
      },
    });
    manager.unmountCleanup();

    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  test('skips inserting when called with null', () => {
    const element = createElement();
    const manager = new CSSPseudoSelectorsManager(element);

    manager.update(null);
    expect(insertMock).not.toHaveBeenCalled();
  });

  test(':active-deepest emits the :has() guard against descendant :active', () => {
    const element = createElement();
    const manager = new CSSPseudoSelectorsManager(element);

    manager.update({
      ':active-deepest': {
        selectorStyle: { backgroundColor: 'red' },
        defaultStyle: { backgroundColor: 'blue' },
      },
    });

    const [, css] = insertMock.mock.calls[0];
    expect(css).toMatch(/:active:not\(:has\(\.rps-active:active\)\)/);
  });
});
