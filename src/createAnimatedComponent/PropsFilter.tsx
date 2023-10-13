'use strict';

import { shallowEqual } from '../reanimated2/hook/utils';
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
import type { AnimatedStylesManager } from './createAnimatedComponent';

function dummyListener() {
  // empty listener we use to assign to listener properties for which animated
  // event is used.
}

export class PropsFilter {
  private _initialStyle = {};
  private _isFirstRender = true;
  private _previousStyle: any = null;
  private _requiresStyleReinitialization = false;

  public filterNonAnimatedProps(
    component: React.Component<unknown, unknown> & {
      _animatedStylesManager: AnimatedStylesManager;
    }
  ): Record<string, unknown> {
    const inputProps =
      component.props as AnimatedComponentProps<InitialComponentProps>;
    if (this._previousStyle && inputProps.style) {
      this._requiresStyleReinitialization = !shallowEqual(
        this._previousStyle,
        inputProps.style
      );
      component._animatedStylesManager.purgeCounters();
    }
    this._previousStyle = inputProps;
    const props: Record<string, unknown> = {};
    for (const key in inputProps) {
      const value = inputProps[key];
      if (key === 'style') {
        const styleProp = inputProps.style;
        const styles = flattenArray<StyleProps>(styleProp ?? []);
        if (this._requiresStyleReinitialization) {
          this._initialStyle = {};
        }
        const processedStyle: StyleProps = styles.map((style) => {
          if (style && style.viewDescriptors) {
            // this is how we recognize styles returned by useAnimatedStyle
            // Probably should be moved below as well.
            style.viewsRef.add(component);
            if (this._isFirstRender || this._requiresStyleReinitialization) {
              component._animatedStylesManager.add(style.viewsRef.id);
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
        // this._requiresStyleReinitialization = false;
        if (this._requiresStyleReinitialization) {
          this._requiresStyleReinitialization = false;
          component._animatedStylesManager.removeUnused();
        }
        props[key] = StyleSheet.flatten(processedStyle);
      } else if (key === 'animatedProps') {
        const animatedProp = inputProps.animatedProps as Partial<
          AnimatedComponentProps<AnimatedProps>
        >;
        if (animatedProp.initial !== undefined) {
          Object.keys(animatedProp.initial.value).forEach((key) => {
            props[key] = animatedProp.initial?.value[key];
            animatedProp.viewsRef?.add(component);
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
          props[key] = (value as SharedValue<unknown>).value;
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
