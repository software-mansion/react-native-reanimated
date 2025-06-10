'use strict';
import { logger } from 'react-native-worklets';

import { IS_WINDOW_AVAILABLE, ReanimatedError } from '../../../common';

export const ANIMATION_NAME_PREFIX = 'REA-CSS-';
const CSS_ANIMATIONS_STYLE_TAG_ID = 'ReanimatedCSSStyleTag';

// Since we cannot remove keyframe from DOM by its tag, we have to store its
// index
const cssTagToIndex = new Map<number, number>();
const cssTagList: number[] = [];

export function configureWebCSSAnimations() {
  if (
    !IS_WINDOW_AVAILABLE || // Without this check SSR crashes because document is undefined (NextExample on CI)
    document.getElementById(CSS_ANIMATIONS_STYLE_TAG_ID) !== null
  ) {
    return;
  }

  const cssStyleTag = document.createElement('style');
  cssStyleTag.id = CSS_ANIMATIONS_STYLE_TAG_ID;

  cssStyleTag.onload = () => {
    if (!cssStyleTag.sheet) {
      logger.error('Failed to create CSS animations stylesheet.');
    }
  };

  document.head.append(cssStyleTag);
}

function getStyleSheet() {
  return (
    (
      document.getElementById(
        CSS_ANIMATIONS_STYLE_TAG_ID
      ) as HTMLStyleElement | null
    )?.sheet ?? null
  );
}

export function insertCSSAnimation(animationTag: number, keyframes: string) {
  // Without window availability check SSR crashes because document is undefined
  // (NextExample on CI)
  if (!IS_WINDOW_AVAILABLE || cssTagToIndex.has(animationTag)) {
    return;
  }

  const sheet = getStyleSheet();

  if (!sheet) {
    logger.error('Failed to create CSS animations stylesheet.');
    return;
  }

  const animation = `@keyframes ${ANIMATION_NAME_PREFIX}${animationTag} { ${keyframes} }`;

  sheet.insertRule(animation, 0);
  cssTagList.unshift(animationTag);
  cssTagToIndex.set(animationTag, 0);

  for (let i = 1; i < cssTagList.length; ++i) {
    const nextCSSTag = cssTagList[i];
    const nextCSSIndex = cssTagToIndex.get(nextCSSTag);

    if (nextCSSIndex === undefined) {
      throw new ReanimatedError('Failed to obtain CSS animation index.');
    }

    cssTagToIndex.set(cssTagList[i], nextCSSIndex + 1);
  }
}

export function removeCSSAnimation(animationTag: number) {
  // Without this check SSR crashes because document is undefined (NextExample on CI)
  if (!IS_WINDOW_AVAILABLE) {
    return;
  }

  const sheet = getStyleSheet();
  const currentCSSIndex = cssTagToIndex.get(animationTag);

  if (currentCSSIndex === undefined) {
    throw new ReanimatedError('Failed to obtain CSS animation index.');
  }

  sheet?.deleteRule(currentCSSIndex);
  cssTagList.splice(currentCSSIndex, 1);
  cssTagToIndex.delete(animationTag);

  for (let i = currentCSSIndex; i < cssTagList.length; ++i) {
    const nextCSSTag = cssTagList[i];
    const nextCSSIndex = cssTagToIndex.get(nextCSSTag);

    if (nextCSSIndex === undefined) {
      throw new ReanimatedError('Failed to obtain CSS animation index.');
    }

    cssTagToIndex.set(cssTagList[i], nextCSSIndex - 1);
  }
}
