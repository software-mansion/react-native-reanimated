'use strict';

import { isWindowAvailable } from '../../../PlatformChecker';
import { logger } from '../../../logger';
import { ReanimatedError } from '../../errors';

const CSS_ANIMATIONS_STYLE_TAG_ID = 'ReanimatedCSSStyleTag';

// Since we cannot remove keyframe from DOM by its name, we have to store its id
const cssNameToIndex = new Map<string, number>();
const cssNameList: string[] = [];

export function configureWebCSSAnimations() {
  if (
    !isWindowAvailable() || // Without this check SSR crashes because document is undefined (NextExample on CI)
    document.getElementById(CSS_ANIMATIONS_STYLE_TAG_ID) !== null
  ) {
    return;
  }

  const cssStyleTag = document.createElement('style');
  cssStyleTag.id = CSS_ANIMATIONS_STYLE_TAG_ID;

  cssStyleTag.onload = () => {
    if (!cssStyleTag.sheet) {
      logger.error('Failed to create layout animations stylesheet.');
    }
  };

  document.head.append(cssStyleTag);
}

export function insertCSSAnimation(animationName: string, keyframes: string) {
  // Without window availability check SSR crashes because document is undefined
  // (NextExample on CI)
  if (!isWindowAvailable() || cssNameToIndex.has(animationName)) {
    return;
  }

  const styleTag = document.getElementById(
    CSS_ANIMATIONS_STYLE_TAG_ID
  ) as HTMLStyleElement;

  if (!styleTag.sheet) {
    logger.error('Failed to create layout animations stylesheet.');
    return;
  }

  const animation = `@keyframes ${animationName} { ${keyframes} }`;

  styleTag.sheet.insertRule(animation, 0);
  cssNameList.unshift(animationName);
  cssNameToIndex.set(animationName, 0);

  for (let i = 1; i < cssNameList.length; ++i) {
    const nextCSSName = cssNameList[i];
    const nextCSSIndex = cssNameToIndex.get(nextCSSName);

    if (nextCSSIndex === undefined) {
      throw new ReanimatedError('Failed to obtain animation index.');
    }

    cssNameToIndex.set(cssNameList[i], nextCSSIndex + 1);
  }
}

export function removeCSSAnimation(animationName: string) {
  // Without this check SSR crashes because document is undefined (NextExample on CI)
  if (!isWindowAvailable()) {
    return;
  }

  const styleTag = document.getElementById(
    CSS_ANIMATIONS_STYLE_TAG_ID
  ) as HTMLStyleElement;

  const currentCSSIndex = cssNameToIndex.get(animationName);

  if (currentCSSIndex === undefined) {
    throw new ReanimatedError('Failed to obtain animation index.');
  }

  styleTag.sheet?.deleteRule(currentCSSIndex);

  cssNameList.splice(currentCSSIndex, 1);
  cssNameToIndex.delete(animationName);

  for (let i = currentCSSIndex; i < cssNameList.length; ++i) {
    const nextCSSName = cssNameList[i];
    const nextCSSIndex = cssNameToIndex.get(nextCSSName);

    if (nextCSSIndex === undefined) {
      throw new ReanimatedError('Failed to obtain animation index.');
    }

    cssNameToIndex.set(cssNameList[i], nextCSSIndex - 1);
  }
}
