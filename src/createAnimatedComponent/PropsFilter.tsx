'use strict';

import { shallowEqual } from '../reanimated2/hook/utils';
import type { StyleProps } from '../reanimated2/commonTypes';
import { isSharedValue } from '../reanimated2/isSharedValue';
import { isChromeDebugger } from '../reanimated2/PlatformChecker';
import { WorkletEventHandler } from '../reanimated2/WorkletEventHandler';
import { initialUpdaterRun } from '../reanimated2/animation';
import { hasInlineStyles, getInlineStyle } from './InlinePropManager';
import type {
  AnimatedComponentProps,
  AnimatedProps,
  InitialComponentProps,
  IAnimatedComponentInternal,
  IPropsFilter,
} from './commonTypes';
import { flattenArray, has } from './utils';
import { StyleSheet } from 'react-native';

function dummyListener() {
  // empty listener we use to assign to listener properties for which animated
  // event is used.
}

export class PropsFilter implements IPropsFilter {
  private _initialStyle = {};
  private _previousProps: React.Component['props'] | null = null;
  private _requiresNewInitials = true;

  public filterNonAnimatedProps(
    component: React.Component<unknown, unknown> & IAnimatedComponentInternal
  ): Record<string, unknown> {
    const inputProps =
      component.props as AnimatedComponentProps<InitialComponentProps>;

    this._maybePrepareForNewInitials(inputProps);

    const props: Record<string, unknown> = {};
    for (const key in inputProps) {
      const value = inputProps[key];
      if (key === 'style') {
        const styleProp = inputProps.style;
        const styles = flattenArray<StyleProps>(styleProp ?? []);
        if (this._requiresNewInitials) {
          this._initialStyle = {};
        }
        const processedStyle: StyleProps = styles.map((style) => {
          if (style && style.viewDescriptors) {
            // this is how we recognize styles returned by useAnimatedStyle
            // TODO - refactor, since `viewsRef` is only present on Web
            style.viewsRef?.add(component);
            if (this._requiresNewInitials) {
              this._initialStyle = {
                ...style.initial.value,
                ...this._initialStyle,
                ...initialUpdaterRun<StyleProps>(style.initial.updater),
              };
            }
            return this._initialStyle;
          } else if (hasInlineStyles(style)) {
            return getInlineStyle(style, this._requiresNewInitials);
          } else {
            return style;
          }
        });
        props[key] = StyleSheet.flatten(processedStyle);
      } else if (key === 'animatedProps') {
        const animatedProp = inputProps.animatedProps as Partial<
          AnimatedComponentProps<AnimatedProps>
        >;
        if (animatedProp.initial !== undefined) {
          Object.keys(animatedProp.initial.value).forEach((initialValueKey) => {
            props[initialValueKey] =
              animatedProp.initial?.value[initialValueKey];
            // TODO - refacotr, since `viewsRef` is only present on Web
            animatedProp.viewsRef?.add(component);
          });
        }
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
        if (this._requiresNewInitials) {
          props[key] = value.value;
        }
      } else if (key !== 'onGestureHandlerStateChange' || !isChromeDebugger()) {
        props[key] = value;
      }
    }
    this._requiresNewInitials = false;
    return props;
  }

  private _maybePrepareForNewInitials(
    inputProps: AnimatedComponentProps<InitialComponentProps>
  ) {
    if (this._previousProps && inputProps.style) {
      this._requiresNewInitials = !shallowEqual(
        this._previousProps,
        inputProps
      );
    }
    this._previousProps = inputProps;
  }
}
