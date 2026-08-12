'use strict';

import { initialUpdaterRun } from '../animation';
import { IS_WEB } from '../common';
import type { StyleProps } from '../commonTypes';
import { isCSSConfigProp, isPseudoSelectorValue } from '../css/utils';
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
import { flattenArray, has } from './utils';

function dummyListener() {
  // empty listener we use to assign to listener properties for which animated
  // event is used.
}

// react-native-svg hit-tests a shape only once a responder prop marked it
// responsible, and accepts any truthy one. False claims nothing.
const neverClaimResponder = () => false;

export class PropsFilter implements IPropsFilter {
  private _initialPropsMap = new Map<AnimatedStyleHandle, StyleProps>();

  public filterNonAnimatedProps(
    component: AnimatedComponentTypeInternal
  ): Record<string, unknown> {
    const inputProps =
      component.props as AnimatedComponentProps<InitialComponentProps>;
    const props: Record<string, unknown> = {};
    let hasPseudoSelectors = false;

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
            if (isCSSConfigProp(animatedPropKey)) {
              continue;
            }
            const animatedPropValue = animatedProps[animatedPropKey];
            if (isPseudoSelectorValue(animatedPropValue)) {
              hasPseudoSelectors = true;
              // Forward only the resting value; pseudo states are driven by
              // the CSS manager, like pseudo values in style are.
              if (animatedPropValue.default !== undefined) {
                props[animatedPropKey] = animatedPropValue.default;
              }
              continue;
            }
            props[animatedPropKey] = animatedPropValue;
          }
        }
      });
    }

    // Makes react-native-svg shapes hit-testable, so their pseudo selectors
    // receive presses at all. Web resolves those states with plain CSS.
    if (!IS_WEB && hasPseudoSelectors && !props.onStartShouldSetResponder) {
      props.onStartShouldSetResponder = neverClaimResponder;
    }

    return props;
  }
}
