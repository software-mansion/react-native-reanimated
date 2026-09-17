'use strict';
import type { StyleProps } from '../../../commonTypes';
import {
  isCSSConfigProp,
  isCSSKeyframesRule,
  isPseudoSelectorValue,
} from '../../utils';
import { SVG_PROP_LIST_DEFAULTS } from './configs';

function collectFromKeyframes(animationName: unknown, props: Set<string>) {
  const list = Array.isArray(animationName) ? animationName : [animationName];
  for (const keyframes of list) {
    if (!keyframes || typeof keyframes !== 'object') {
      continue;
    }
    const cssRules = (
      isCSSKeyframesRule(keyframes) ? keyframes.cssRules : keyframes
    ) as Record<string, object>;
    for (const selector in cssRules) {
      for (const prop in cssRules[selector]) {
        if (prop in SVG_PROP_LIST_DEFAULTS) {
          props.add(prop);
        }
      }
    }
  }
}

// react-native-svg cascades a fill or stroke prop to an element's children
// only when the element lists it in `propList`, which it builds from the props
// it received in JS. A CSS animation or pseudo state writes to the shadow node
// directly, so a prop it is the only source of has to be passed inline too, at
// the value react-native-svg draws with when it is unset. Owning the prop also
// stops an ancestor from overwriting the animated value on every draw.
export function forwardSvgPropListDefaults(
  props: Record<string, unknown>,
  animatedProps: Record<string, unknown>[]
) {
  let missing: Set<string> | undefined;
  for (const entry of animatedProps) {
    if (!entry || entry.viewDescriptors) {
      continue;
    }
    for (const key in entry) {
      if (key === 'animationName') {
        collectFromKeyframes(entry[key], (missing ??= new Set()));
      } else if (
        !isCSSConfigProp(key) &&
        key in SVG_PROP_LIST_DEFAULTS &&
        isPseudoSelectorValue(entry[key]) &&
        entry[key].default === undefined
      ) {
        (missing ??= new Set()).add(key);
      }
    }
  }
  if (!missing) {
    return;
  }
  const styles = props.style as StyleProps[] | undefined;
  for (const prop of missing) {
    if (
      props[prop] == null &&
      !styles?.some((style) => style?.[prop] != null)
    ) {
      props[prop] =
        SVG_PROP_LIST_DEFAULTS[prop as keyof typeof SVG_PROP_LIST_DEFAULTS];
    }
  }
}
