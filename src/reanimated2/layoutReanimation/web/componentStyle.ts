'use strict';

import { _updatePropsJS } from '../../js-reanimated';
import type { ReanimatedHTMLElement } from '../../js-reanimated';

export interface ReanimatedSnapshot {
  top: number;
  left: number;
  width: number;
  height: number;
  scrollOffsets: ScrollOffsets;
}

export interface ScrollOffsets {
  scrollTopOffset: number;
  scrollLeftOffset: number;
}

export const snapshots = new WeakMap<HTMLElement, ReanimatedSnapshot>();

export function makeElementVisible(element: HTMLElement, delay: number) {
  if (delay === 0) {
    _updatePropsJS(
      { visibility: 'initial' },
      { _component: element as ReanimatedHTMLElement }
    );
  } else {
    setTimeout(() => {
      _updatePropsJS(
        { visibility: 'initial' },
        { _component: element as ReanimatedHTMLElement }
      );
    }, delay * 1000);
  }
}

function fixElementPosition(
  element: HTMLElement,
  parent: HTMLElement,
  snapshot: ReanimatedSnapshot
) {
  const parentRect = parent.getBoundingClientRect();

  const parentBorderTopValue = parseInt(
    getComputedStyle(parent).borderTopWidth
  );

  const parentBorderLeftValue = parseInt(
    getComputedStyle(parent).borderLeftWidth
  );

  const dummyRect = element.getBoundingClientRect();
  // getBoundingClientRect returns DOMRect with position of the element with respect to document body.
  // However, using position `absolute` doesn't guarantee, that the dummy will be placed relative to body element.
  // The trick below allows us to once again get position relative to body, by comparing snapshot with new position of the dummy.
  if (dummyRect.top !== snapshot.top) {
    element.style.top = `${
      snapshot.top - parentRect.top - parentBorderTopValue
    }px`;
  }

  if (dummyRect.left !== snapshot.left) {
    element.style.left = `${
      snapshot.left - parentRect.left - parentBorderLeftValue
    }px`;
  }
}

export function setDummyPosition(
  dummy: HTMLElement,
  snapshot: ReanimatedSnapshot
) {
  dummy.style.transform = '';
  dummy.style.position = 'absolute';
  dummy.style.top = `${snapshot.top}px`;
  dummy.style.left = `${snapshot.left}px`;
  dummy.style.width = `${snapshot.width}px`;
  dummy.style.height = `${snapshot.height}px`;
  dummy.style.margin = '0px'; // tmpElement has absolute position, so margin is not necessary

  if (dummy.parentElement) {
    fixElementPosition(dummy, dummy.parentElement, snapshot);
  }
}
