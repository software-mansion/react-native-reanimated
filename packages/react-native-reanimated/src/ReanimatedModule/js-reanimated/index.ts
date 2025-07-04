'use strict';
import { logger, ReanimatedError } from '../../common';
import type { AnimatedStyle, StyleProps } from '../../commonTypes';
import type { PropUpdates } from '../../createAnimatedComponent/commonTypes';
import {
  createReactDOMStyle,
  createTextShadowValue,
  createTransformValue,
} from './webUtils';

export { createJSReanimatedModule } from './JSReanimated';

// TODO: Install these global functions in a more suitable location.
global._makeShareableClone = () => {
  throw new ReanimatedError(
    '`_makeShareableClone` should never be called from React runtime.'
  );
};

global._scheduleHostFunctionOnJS = () => {
  throw new ReanimatedError(
    '`_scheduleOnJS` should never be called from React runtime.'
  );
};

global._scheduleOnRuntime = () => {
  throw new ReanimatedError(
    '`_scheduleOnRuntime` should never be called from React runtime.'
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
      // We need to explicitly set the 'text' property on input component because React Native's
      // internal _valueTracker (https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/client/inputValueTracking.js)
      // prevents updates when only modifying attributes.
      if ((component as HTMLElement).nodeName === 'INPUT' && key === 'text') {
        (component as HTMLInputElement).value = domStyle[key] as string;
      } else {
        (component as HTMLElement).setAttribute(key, domStyle[key]);
      }
    } else {
      (component.style as StyleProps)[key] = domStyle[key];
    }
  }
};
