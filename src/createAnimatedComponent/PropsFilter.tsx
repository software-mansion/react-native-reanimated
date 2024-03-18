'use strict';
import type { StyleProps } from '../reanimated2';
import { isSharedValue } from '../reanimated2';
import { isChromeDebugger } from '../reanimated2/PlatformChecker';
import WorkletEventHandler from '../reanimated2/WorkletEventHandler';
import { initialUpdaterRun } from '../reanimated2/animation';
import { hasInlineStyles, getInlineStyle } from './InlinePropManager';
import type {
  AnimatedComponentProps,
  AnimatedProps,
  InitialComponentProps,
  IPropsFilter,
  AnimatedComponent,
} from './commonTypes';
import { flattenArray, has } from './utils';
import { StyleSheet } from 'react-native';

function dummyListener() {
  // empty listener we use to assign to listener properties for which animated
  // event is used.
}

export class PropsFilter implements IPropsFilter {
  private _initialStyle = {};
  private _component: AnimatedComponent;

  constructor(component: AnimatedComponent) {
    this._component = component;
  }

  public filterNonAnimatedProps(): Record<string, unknown> {
    const inputProps = this._component
      .props as AnimatedComponentProps<InitialComponentProps>;
    const props: Record<string, unknown> = {};
    for (const key in inputProps) {
      const value = inputProps[key];
      if (key === 'style') {
        const styleProp = inputProps.style;
        const styles = flattenArray<StyleProps>(styleProp ?? []);
        const processedStyle: StyleProps = styles.map((style) => {
          if (style && style.viewDescriptors) {
            // this is how we recognize styles returned by useAnimatedStyle
            style.viewsRef?.add(this._component);
            if (this._component._isFirstRender) {
              this._initialStyle = {
                ...style.initial.value,
                ...this._initialStyle,
                ...initialUpdaterRun<StyleProps>(style.initial.updater),
              };
            }
            return this._initialStyle;
          } else if (hasInlineStyles(style)) {
            return getInlineStyle(style, this._component._isFirstRender);
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
            animatedProp.viewsRef?.add(this._component);
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
        if (this._component._isFirstRender) {
          props[key] = value.value;
        }
      } else if (key !== 'onGestureHandlerStateChange' || !isChromeDebugger()) {
        props[key] = value;
      }
    }
    return props;
  }
}
