'use strict';
import type { ViewInfo } from '../../../../createAnimatedComponent/commonTypes';
import CSSAnimationsManager from '../CSSAnimationsManager';
import CSSManager from '../CSSManager';

jest.mock('../../domUtils');
jest.mock('../CSSAnimationsManager');
jest.mock('../CSSPseudoSelectorsManager');
jest.mock('../CSSTransitionsManager');

const builderKey = () => jest.mocked(CSSAnimationsManager).mock.calls[0][1];

const viewInfo = (DOMElement: ViewInfo['DOMElement']): ViewInfo => ({
  viewTag: null,
  shadowNodeWrapper: null,
  DOMElement,
});

describe('CSSManager (web) SVG props builder key', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Production bundlers mangle a component's class name, so the SVG props builder
  // must be keyed on the rendered element's tag (never mangled), not the class name.
  test('uses the element tag, ignoring the minifiable class name', () => {
    const element = document.createElement('circle');
    new CSSManager(viewInfo(element), 'h');
    expect(builderKey()).toBe(element.tagName);
  });

  test('falls back to the class name when there is no rendered element', () => {
    new CSSManager(viewInfo(null), 'Circle');
    expect(builderKey()).toBe('Circle');
  });
});
