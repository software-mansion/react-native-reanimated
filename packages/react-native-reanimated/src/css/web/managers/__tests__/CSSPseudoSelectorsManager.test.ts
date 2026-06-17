'use strict';
import type { ReanimatedHTMLElement } from '../../../../ReanimatedModule/js-reanimated';
import { ANIMATION_NAME_PREFIX } from '../../../constants';
import {
  registerWebSvgPropsBuilder,
  SVG_POLYGON_WEB_PROPERTIES_CONFIG,
} from '../../../svg/web';
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
  const attributes = new Map<string, string>();
  return {
    style: {} as CSSStyleDeclaration,
    setAttribute: jest.fn((name: string, value: string) => {
      attributes.set(name, value);
    }),
    removeAttribute: jest.fn((name: string) => {
      attributes.delete(name);
    }),
    getAttribute: (name: string) => attributes.get(name) ?? null,
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
    const css = (insertMock.mock.calls[0][1] as string[]).join('\n');
    expect(css).toMatch(/:nth-child\(odd\)/);
    expect(css).toMatch(/background-color: red !important/);
    expect(css).not.toMatch(/:has\(/);
  });

  test('resets a property to initial when its selector value is undefined', () => {
    const element = createElement();
    const manager = new CSSPseudoSelectorsManager(element);

    manager.update({
      ':active': {
        selectorStyle: { backgroundColor: undefined },
        defaultStyle: { backgroundColor: 'blue' },
      },
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    const css = (insertMock.mock.calls[0][1] as string[]).join('\n');
    expect(css).toMatch(/:active/);
    expect(css).toMatch(/background-color: initial !important/);
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

    const css = (insertMock.mock.calls[0][1] as string[]).join('\n');
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

    const css = (insertMock.mock.calls[0][1] as string[]).join('\n');
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

  test('skips the CSSOM update when pseudo styles are deeply equal', () => {
    const element = createElement();
    const manager = new CSSPseudoSelectorsManager(element);
    const styles = () => ({
      ':hover': {
        selectorStyle: { color: 'red' },
        defaultStyle: { color: 'black' },
      },
    });

    manager.update(styles());
    manager.update(styles()); // new object, same content - must be a no-op

    expect(insertMock).toHaveBeenCalledTimes(1);

    manager.update({
      ':hover': {
        selectorStyle: { color: 'green' },
        defaultStyle: { color: 'black' },
      },
    });

    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  test('skips a selector that would break out of the element scope (CSS injection)', () => {
    const element = createElement();
    const manager = new CSSPseudoSelectorsManager(element);

    manager.update({
      ':hover, body': {
        selectorStyle: { backgroundColor: 'red' },
        defaultStyle: { backgroundColor: 'blue' },
      },
    });

    const rules = insertMock.mock.calls[0][1] as string[];
    expect(rules.join('\n')).not.toContain('body');
    expect(rules).toHaveLength(0);
  });

  test('uses the SVG props builder for SVG components', () => {
    // Polygon aliases `points` -> `d` and wraps it in path() - a transform only
    // the SVG builder does, so it proves the SVG builder (not the generic one)
    // is used for pseudo styles on SVG components.
    registerWebSvgPropsBuilder(
      'TestPolygon',
      SVG_POLYGON_WEB_PROPERTIES_CONFIG
    );
    const element = createElement();
    const manager = new CSSPseudoSelectorsManager(element, 'TestPolygon');

    manager.update({
      ':hover': {
        selectorStyle: { points: '0,0 10,10 20,0' },
        defaultStyle: { points: '0,0 0,0 0,0' },
      },
    });

    const rules = (insertMock.mock.calls[0][1] as string[]).join('\n');
    expect(rules).toContain('d: path(');
    expect(rules).not.toContain('points:');
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

    const css = (insertMock.mock.calls[0][1] as string[]).join('\n');
    expect(css).toContain(
      `:active:not(:has([data-${ANIMATION_NAME_PREFIX}rps-active="true"]:active))`
    );
  });
});
