'use strict';

import { initialUpdaterRun } from '../animation';
import type { StyleProps } from '../commonTypes';
import {
  isCSSConfigProp,
  isCSSKeyframesRule,
  isPseudoSelectorValue,
} from '../css/utils';
import type { AnimatedStyleHandle } from '../hook/commonTypes';
import { isSharedValue } from '../isSharedValue';
import { WorkletEventHandler } from '../WorkletEventHandler';
import type {
  AnimatedComponentProps,
  AnimatedComponentTypeInternal,
  AnimatedProps,
  InitialComponentProps,
  IPropsFilter,
} from './commonTypes';
import { getInlineStyle, hasInlineStyles } from './InlinePropManager';
import { svgHitTestResponder, svgInheritedPropDefaults } from './platform';
import { flattenArray, has } from './utils';

function dummyListener() {
  // empty listener we use to assign to listener properties for which animated
  // event is used.
}

function collectSvgInheritedKeyframeProps(
  animationName: unknown,
  propDefaults: Record<string, unknown>,
  inheritedProps: Set<string>
) {
  for (const keyframes of flattenArray(animationName)) {
    if (!keyframes || typeof keyframes !== 'object') {
      continue;
    }
    const cssRules = isCSSKeyframesRule(keyframes)
      ? keyframes.cssRules
      : keyframes;
    for (const keyframe of Object.values(cssRules)) {
      for (const prop in keyframe) {
        if (prop in propDefaults) {
          inheritedProps.add(prop);
        }
      }
    }
  }
}

export class PropsFilter implements IPropsFilter {
  private _initialPropsMap = new Map<AnimatedStyleHandle, StyleProps>();

  public filterNonAnimatedProps(
    component: AnimatedComponentTypeInternal
  ): Record<string, unknown> {
    const inputProps =
      component.props as AnimatedComponentProps<InitialComponentProps>;
    const props: Record<string, unknown> = {};
    let hasPseudoSelectors = false;
    // Props whose only source is keyframes or a pseudo state.
    let svgInheritedProps: Set<string> | undefined;

    for (const key in inputProps) {
      const value = inputProps[key];
      if (key === 'style') {
        const styleProp = inputProps.style;
        const styles = flattenArray<StyleProps>(styleProp ?? []);

        const processedStyle: StyleProps[] = styles.map((style) => {
          if (style?.viewDescriptors) {
            const handle = style as AnimatedStyleHandle;

            if (component._isFirstRender) {
              this._initialPropsMap.set(handle, {
                ...handle.initial.value,
                ...initialUpdaterRun(handle.initial.updater),
              } as StyleProps);
            }

            return this._initialPropsMap.get(handle) ?? {};
          } else if (hasInlineStyles(style)) {
            return getInlineStyle(style, component._isFirstRender);
          } else {
            return style;
          }
        });
        // keep styles as they were passed by the user
        // it will help other libs to interpret styles correctly
        props[key] = processedStyle;

        if (svgInheritedPropDefaults) {
          for (const style of processedStyle) {
            if (style?.animationName === undefined) {
              continue;
            }
            collectSvgInheritedKeyframeProps(
              style.animationName,
              svgInheritedPropDefaults,
              (svgInheritedProps ??= new Set())
            );
          }
        }
      } else if (key === 'animatedProps') {
        // Handled in a second pass after this loop so that animatedProps
        // values always take precedence over inline props with the same key,
        // regardless of JSX attribute order.
        continue;
      } else if (
        has('workletEventHandler', value) &&
        value.workletEventHandler instanceof WorkletEventHandler
      ) {
        if (value.workletEventHandler.eventNames.length > 0) {
          value.workletEventHandler.eventNames.forEach((eventName) => {
            props[eventName] = has('listeners', value.workletEventHandler)
              ? (
                  value.workletEventHandler.listeners as Record<string, unknown>
                )[eventName]
              : dummyListener;
          });
        } else {
          props[key] = dummyListener;
        }
      } else if (isSharedValue(value)) {
        if (component._isFirstRender) {
          props[key] = value.value;
        }
      } else {
        props[key] = value;
      }
    }

    // Second pass: apply animatedProps last so it always wins over inline
    // props that share a key. This makes the precedence deterministic and
    // independent of the order in which attributes were written in JSX.
    const animatedPropsProp = inputProps.animatedProps;
    if (animatedPropsProp) {
      const animatedPropsArray =
        flattenArray<Partial<AnimatedComponentProps<AnimatedProps>>>(
          animatedPropsProp
        );
      animatedPropsArray.forEach((animatedProps) => {
        if (!animatedProps) {
          return;
        }
        if (animatedProps.viewDescriptors && animatedProps.initial) {
          const initialValue = animatedProps.initial.value;
          for (const initialValueKey in initialValue) {
            props[initialValueKey] = initialValue[initialValueKey];
          }
        } else {
          for (const animatedPropKey in animatedProps) {
            const animatedPropValue = animatedProps[animatedPropKey];
            if (isCSSConfigProp(animatedPropKey)) {
              if (
                animatedPropKey === 'animationName' &&
                svgInheritedPropDefaults
              ) {
                collectSvgInheritedKeyframeProps(
                  animatedPropValue,
                  svgInheritedPropDefaults,
                  (svgInheritedProps ??= new Set())
                );
              }
              continue;
            }
            if (isPseudoSelectorValue(animatedPropValue)) {
              hasPseudoSelectors = true;
              // Forward only the resting value; pseudo states are driven by
              // the CSS manager, like pseudo values in style are.
              if (animatedPropValue.default !== undefined) {
                props[animatedPropKey] = animatedPropValue.default;
              } else if (
                svgInheritedPropDefaults &&
                animatedPropKey in svgInheritedPropDefaults
              ) {
                (svgInheritedProps ??= new Set()).add(animatedPropKey);
              }
              continue;
            }
            props[animatedPropKey] = animatedPropValue;
          }
        }
      });
    }

    // Owning the prop also stops react-native-svg merging it in from an
    // ancestor, which would otherwise overwrite the animated value on every
    // draw. A value in the style already reaches it through its own merge.
    if (svgInheritedProps && svgInheritedPropDefaults) {
      const styles = props.style as StyleProps[] | undefined;
      for (const prop of svgInheritedProps) {
        if (
          props[prop] == null &&
          !styles?.some((style) => style?.[prop] != null)
        ) {
          props[prop] = svgInheritedPropDefaults[prop];
        }
      }
    }

    if (
      svgHitTestResponder &&
      hasPseudoSelectors &&
      !props.onStartShouldSetResponder
    ) {
      props.onStartShouldSetResponder = svgHitTestResponder;
    }

    return props;
  }
}
