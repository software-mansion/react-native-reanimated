'use strict';
import JSReanimated from './JSReanimated';
import type { StyleProps } from '../commonTypes';
import type { AnimatedStyle } from '../helperTypes';
import { isWeb } from '../PlatformChecker';
import { PropsAllowlists } from '../../propsAllowlists';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createReactDOMStyle: (style: any) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createTransformValue: (transform: any) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createTextShadowValue: (style: any) => void | string;

if (isWeb()) {
  try {
    createReactDOMStyle =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('react-native-web/dist/exports/StyleSheet/compiler/createReactDOMStyle').default;
  } catch (e) {}

  try {
    // React Native Web 0.19+
    createTransformValue =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('react-native-web/dist/exports/StyleSheet/preprocess').createTransformValue;
  } catch (e) {}

  try {
    createTextShadowValue =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('react-native-web/dist/exports/StyleSheet/preprocess').createTextShadowValue;
  } catch (e) {}
}

const reanimatedJS = new JSReanimated();

global._makeShareableClone = () => {
  throw new Error(
    '[Reanimated] _makeShareableClone should never be called in JSReanimated.'
  );
};

global._scheduleOnJS = () => {
  throw new Error(
    '[Reanimated] _scheduleOnJS should never be called in JSReanimated.'
  );
};

global._scheduleOnRuntime = () => {
  throw new Error(
    '[Reanimated] _scheduleOnRuntime should never be called in JSReanimated.'
  );
};

interface JSReanimatedComponent {
  previousStyle: StyleProps;
  setNativeProps?: (style: StyleProps) => void;
  style?: StyleProps;
  props: Record<string, string | number>;
  _touchableNode: {
    setAttribute: (key: string, props: unknown) => void;
  };
}

export interface ReanimatedHTMLElement extends HTMLElement {
  previousStyle: StyleProps;
  setNativeProps?: (style: StyleProps) => void;
  props: Record<string, string | number>;
  _touchableNode: {
    setAttribute: (key: string, props: unknown) => void;
  };
  reanimatedDummy?: boolean;
  removedAfterAnimation?: boolean;
}

export const _updatePropsJS = (
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  updates: StyleProps | AnimatedStyle<any>,
  viewRef: { _component?: JSReanimatedComponent | ReanimatedHTMLElement },
  isAnimatedProps?: boolean
): void => {
  if (viewRef._component) {
    const component = viewRef._component;
    const [rawStyles] = Object.keys(updates).reduce(
      (acc: [StyleProps, AnimatedStyle<any>], key) => {
        const value = updates[key];
        const index = typeof value === 'function' ? 1 : 0;
        acc[index][key] = value;
        return acc;
      },
      [{}, {}]
    );

    if (typeof component.setNativeProps === 'function') {
      // This is the legacy way to update props on React Native Web <= 0.18.
      // Also, some components (e.g. from react-native-svg) don't have styles
      // and always provide setNativeProps function instead (even on React Native Web 0.19+).
      setNativeProps(component, rawStyles, isAnimatedProps);
    } else if (
      createReactDOMStyle !== undefined &&
      component.style !== undefined
    ) {
      // React Native Web 0.19+ no longer provides setNativeProps function,
      // so we need to update DOM nodes directly.
      updatePropsDOM(component, rawStyles, isAnimatedProps);
    } else if (Object.keys(component.props).length > 0) {
      Object.keys(component.props).forEach((key) => {
        if (!rawStyles[key]) {
          return;
        }
        const dashedKey = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
        component._touchableNode.setAttribute(dashedKey, rawStyles[key]);
      });
    } else {
      const componentName =
        'className' in component ? component?.className : '';
      console.warn(
        `[Reanimated] It's not possible to manipulate the component ${componentName}`
      );
    }
  }
};

const setNativeProps = (
  component: JSReanimatedComponent | ReanimatedHTMLElement,
  newProps: StyleProps,
  isAnimatedProps?: boolean
): void => {
  if (isAnimatedProps) {
    const uiProps: Record<string, unknown> = {};
    for (const key in newProps) {
      if (isNativeProp(key)) {
        uiProps[key] = newProps[key];
      }
    }
    // Only update UI props directly on the component,
    // other props can be updated as standard style props.
    component.setNativeProps?.(uiProps);
  }

  const previousStyle = component.previousStyle ? component.previousStyle : {};
  const currentStyle = { ...previousStyle, ...newProps };
  component.previousStyle = currentStyle;

  component.setNativeProps?.({ style: currentStyle });
};

const updatePropsDOM = (
  component: JSReanimatedComponent | HTMLElement,
  style: StyleProps,
  isAnimatedProps?: boolean
): void => {
  const previousStyle = (component as JSReanimatedComponent).previousStyle
    ? (component as JSReanimatedComponent).previousStyle
    : {};
  const currentStyle = { ...previousStyle, ...style };
  (component as JSReanimatedComponent).previousStyle = currentStyle;

  const domStyle = createReactDOMStyle(currentStyle);
  if (Array.isArray(domStyle.transform) && createTransformValue !== undefined) {
    domStyle.transform = createTransformValue(domStyle.transform);
  }

  if (
    createTextShadowValue !== undefined &&
    (domStyle.textShadowColor ||
      domStyle.textShadowRadius ||
      domStyle.textShadowOffset)
  ) {
    domStyle.textShadow = createTextShadowValue({
      textShadowColor: domStyle.textShadowColor,
      textShadowOffset: domStyle.textShadowOffset,
      textShadowRadius: domStyle.textShadowRadius,
    });
  }

  for (const key in domStyle) {
    if (isAnimatedProps) {
      (component as HTMLElement).setAttribute(key, domStyle[key]);
    } else {
      (component.style as StyleProps)[key] = domStyle[key];
    }
  }
};

function isNativeProp(propName: string): boolean {
  return !!PropsAllowlists.NATIVE_THREAD_PROPS_WHITELIST[propName];
}

export default reanimatedJS;
