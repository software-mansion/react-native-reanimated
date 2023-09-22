'use strict';

import type { StyleProps, SharedValue } from '../reanimated2';
import { isSharedValue } from '../reanimated2';
import { isChromeDebugger } from '../reanimated2/PlatformChecker';
import WorkletEventHandler from '../reanimated2/WorkletEventHandler';
import { initialUpdaterRun } from '../reanimated2/animation';
import { hasInlineStyles, getInlineStyle } from './InlinePropManager';
import type {
  AnimatedComponentProps,
  AnimatedProps,
  InitialComponentProps,
} from './utils';
import { flattenArray, has } from './utils';
import { StyleSheet } from 'react-native';

function dummyListener() {
  // empty listener we use to assign to listener properties for which animated
  // event is used.
}

export class PropsFilter {
  private _initialStyle = {};
  private _isFirstRender = true;

  public filterNonAnimatedProps(
    inputProps: AnimatedComponentProps<InitialComponentProps>
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    for (const key in inputProps) {
      const value = inputProps[key];
      if (key === 'style') {
        const styleProp = inputProps.style;
        const styles = flattenArray<StyleProps>(styleProp ?? []);
        const processedStyle: StyleProps = styles.map((style) => {
          if (style && style.viewDescriptors) {
            // this is how we recognize styles returned by useAnimatedStyle
            style.viewsRef.add(this);
            if (this._isFirstRender) {
              this._initialStyle = {
                ...style.initial.value,
                ...this._initialStyle,
                ...initialUpdaterRun<StyleProps>(style.initial.updater),
              };
            }
            return this._initialStyle;
          } else if (hasInlineStyles(style)) {
            return getInlineStyle(style, this._isFirstRender);
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
          Object.keys(animatedProp.initial.value).forEach((key) => {
            props[key] = animatedProp.initial?.value[key];
            animatedProp.viewsRef?.add(this);
          });
        }
      } else if (
        has('current', value) &&
        value.current instanceof WorkletEventHandler
      ) {
        if (value.current.eventNames.length > 0) {
          value.current.eventNames.forEach((eventName) => {
            props[eventName] = has('listeners', value.current)
              ? (value.current.listeners as Record<string, unknown>)[eventName]
              : dummyListener;
          });
        } else {
          props[key] = dummyListener;
        }
      } else if (isSharedValue(value)) {
        if (this._isFirstRender) {
          props[key] = (value as SharedValue<any>).value;
        }
      } else if (key !== 'onGestureHandlerStateChange' || !isChromeDebugger()) {
        props[key] = value;
      }
    }
    return props;
  }

  public onRender() {
    if (this._isFirstRender) {
      this._isFirstRender = false;
    }
  }
}
