'use strict';
import { isSharedValue } from '../../isSharedValue';
import type {
  AnyRecord,
  CSSAnimationProperties,
  CSSStyle,
  CSSTransitionProperties,
  PlainStyle,
} from '../types';
import { isAnimationProp, isTransitionProp } from './guards';

export function filterCSSAndStyleProperties<S extends AnyRecord>(
  style: CSSStyle<S>
): [CSSAnimationProperties | null, CSSTransitionProperties | null, PlainStyle] {
  let animationProperties: CSSAnimationProperties = {};
  let transitionProperties: CSSTransitionProperties = {};
  const filteredStyle: AnyRecord = {};

  for (const [prop, value] of Object.entries(style)) {
    if (isAnimationProp(prop)) {
      // If there is a shorthand `animation` property, all properties specified
      // before are ignored and only these specified later are taken into account
      // and override ones from the shorthand
      if (prop === 'animation') {
        animationProperties = { animation: value };
      } else {
        animationProperties[prop] = value;
      }
    } else if (isTransitionProp(prop)) {
      // If there is a shorthand `transition` property, all properties specified
      // before are ignored and only these specified later are taken into account
      // and override ones from the shorthand
      if (prop === 'transition') {
        transitionProperties = { transition: value };
      } else {
        transitionProperties[prop] = value;
      }
    } else if (!isSharedValue(value)) {
      filteredStyle[prop] = value;
    }
  }

  return [
    Object.keys(animationProperties).length > 0 ? animationProperties : null,
    Object.keys(transitionProperties).length > 0 ? transitionProperties : null,
    filteredStyle,
  ];
}
