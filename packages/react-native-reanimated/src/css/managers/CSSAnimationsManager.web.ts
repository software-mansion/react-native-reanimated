import type { ReanimatedHTMLElement } from '../../js-reanimated';
import type { CSSAnimationKeyframes, CSSAnimationProperties } from '../types';
import { convertConfigPropertiesToArrays } from '../utils';
import { generateKeyframe } from '../web/animationParser';
import {
  configureWebCSSAnimations,
  insertCSSAnimation,
  removeCSSAnimation,
} from '../web/domUtils';
import { kebabize, maybeAddSuffix, parseTimingFunction } from '../web/utils';

export default class CSSAnimationsManager {
  private readonly element: ReanimatedHTMLElement;
  private readonly animations: string[];

  constructor(element: ReanimatedHTMLElement) {
    configureWebCSSAnimations();

    this.element = element;
    this.animations = [];
  }

  attach(animationProperties: CSSAnimationProperties | null) {
    if (!animationProperties) {
      return;
    }

    this.update(animationProperties);
  }

  update(animationProperties: CSSAnimationProperties | null) {
    if (!animationProperties) {
      this.detach();
      return;
    }

    const definitions =
      animationProperties.animationName as CSSAnimationKeyframes;

    if (Array.isArray(definitions)) {
      definitions.forEach(this.createAnimation.bind(this));
    } else {
      this.createAnimation(definitions);
    }

    this.setElementAnimation(animationProperties);
  }

  detach() {
    this.element.style.animationDuration = '';
    this.element.style.animationDelay = '';
    this.element.style.animationDirection = '';
    this.element.style.animationFillMode = '';
    this.element.style.animationPlayState = '';
    this.element.style.animationTimingFunction = '';

    this.animations.forEach(removeCSSAnimation);
  }

  private createAnimation(definition: CSSAnimationKeyframes) {
    const { animationName, keyframes } = generateKeyframe(definition);
    insertCSSAnimation(animationName, keyframes);

    this.animations.push(animationName);
  }

  private setElementAnimation(animationProperties: CSSAnimationProperties) {
    const propertiesAsArray =
      convertConfigPropertiesToArrays(animationProperties);

    const maybeDuration = maybeAddSuffix(
      propertiesAsArray,
      'animationDuration',
      'ms'
    );

    if (maybeDuration) {
      this.element.style.animationDuration = maybeDuration.join(',');
    }

    const maybeDelay = maybeAddSuffix(
      propertiesAsArray,
      'animationDelay',
      'ms'
    );
    if (maybeDelay) {
      this.element.style.animationDelay = maybeDelay.join(',');
    }

    if (propertiesAsArray.animationIterationCount) {
      this.element.style.animationIterationCount =
        propertiesAsArray.animationIterationCount.join(',');
    }

    if (propertiesAsArray.animationDirection) {
      this.element.style.animationDirection =
        propertiesAsArray.animationDirection.map(kebabize).join(',');
    }

    if (propertiesAsArray.animationFillMode) {
      this.element.style.animationFillMode =
        propertiesAsArray.animationFillMode.join(',');
    }

    if (propertiesAsArray.animationPlayState) {
      this.element.style.animationPlayState =
        propertiesAsArray.animationPlayState.join(',');
    }

    if (propertiesAsArray.animationTimingFunction) {
      this.element.style.animationTimingFunction = parseTimingFunction(
        propertiesAsArray.animationTimingFunction
      );
    }

    this.element.style.animationName = this.animations.join(',');
  }
}
