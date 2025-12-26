'use strict';
import { logger } from '../../common';
import type { AnimatedStyle, StyleProps } from '../../commonTypes';
import type { PropUpdates } from '../../createAnimatedComponent/commonTypes';

export { createJSReanimatedModule } from './JSReanimated';

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
  isDummy?: boolean;
  dummyClone?: ReanimatedHTMLElement;
  removedAfterAnimation?: boolean;
}

// TODO: Move these functions outside of index file.
export const _updatePropsJS = (
  updates: PropUpdates,
  viewRef: (JSReanimatedComponent | ReanimatedHTMLElement) & {
    getAnimatableRef?: () => JSReanimatedComponent | ReanimatedHTMLElement;
  },
  isAnimatedProps?: boolean
): void => {
  if (viewRef) {
    const component = viewRef.getAnimatableRef
      ? viewRef.getAnimatableRef()
      : viewRef;
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
    } else if (isAnimatedProps) {
      updateAnimatedPropsDOM(component, rawStyles);
    } else if (component.style !== undefined) {
      // React Native Web 0.19+ no longer provides setNativeProps function,
      // so we need to update DOM nodes directly.
      updateStyleDOM(component, rawStyles);
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
      logger.warn(
        `It's not possible to manipulate the component ${componentName}`
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
    // Only update UI props directly on the component,
    // other props can be updated as standard style props.
    component.setNativeProps?.(newProps);
  }

  const mergedProps = mergeProps(component, newProps);

  component.setNativeProps?.({ style: mergedProps });
};

/**
 * Merges new props with previous props stored on the component. This mimics the
 * native implementation's limitation that uses props merging instead of
 * applying only new props and removing old ones.
 */
const mergeProps = (
  component: JSReanimatedComponent | HTMLElement,
  newProps: StyleProps
): StyleProps => {
  const previousStyle = (component as JSReanimatedComponent).previousStyle
    ? (component as JSReanimatedComponent).previousStyle
    : {};
  const currentStyle = { ...previousStyle, ...newProps };
  (component as JSReanimatedComponent).previousStyle = currentStyle;
  return currentStyle;
};

/**
 * Updates style properties on a DOM element. Uses props merging to match native
 * implementation behavior.
 */
const updateStyleDOM = (
  component: JSReanimatedComponent | HTMLElement,
  style: StyleProps
): void => {
  const mergedStyle = mergeProps(component, style);

  // Apply styles directly to component.style
  for (const key in mergedStyle) {
    (component.style as StyleProps)[key] = mergedStyle[key];
  }
};

/**
 * Updates animated props on a DOM element using setAttribute. Uses props
 * merging to match native implementation behavior.
 */
const updateAnimatedPropsDOM = (
  component: JSReanimatedComponent | HTMLElement,
  props: StyleProps
): void => {
  const mergedProps = mergeProps(component, props);

  // We need to explicitly set the 'text' property on input component because React Native's
  // internal _valueTracker (https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/client/inputValueTracking.js)
  // prevents updates when only modifying attributes.
  if (
    (component as HTMLElement).nodeName === 'INPUT' &&
    'text' in mergedProps
  ) {
    (component as HTMLInputElement).value = mergedProps.text as string;
    delete mergedProps.text;
  }

  // Apply props as DOM attributes
  for (const key in mergedProps) {
    (component as HTMLElement).setAttribute(key, mergedProps[key]);
  }
};
