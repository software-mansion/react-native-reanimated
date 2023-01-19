import React, { Component, ComponentType } from 'react';
import { useAnimatedStyle } from './reanimated2/hook/useAnimatedStyle';
import * as animationModule from './reanimated2/animation';
import { flattenArray } from './reanimated2/utils';
import {
  AnimatableValue,
  AnimatedStyle,
  AnimationFunctionCall,
  SharedValue,
  StyleProps,
  Animation,
  AnimationObject,
} from './reanimated2/commonTypes';
import {
  AnimatedComponentProps,
  InitialComponentProps,
} from './AnimatedComponent';

export const withInlineStyles = (
  Component: ComponentType<AnimatedComponentProps<InitialComponentProps>>
): ComponentType<AnimatedComponentProps<InitialComponentProps>> => {
  const ComponentWithInlineStyles = (
    props: AnimatedComponentProps<InitialComponentProps>
  ) => {
    const styles: StyleProps[] = [];
    const sharedValuesStyles: StyleProps = {};
    const functionsStyles: StyleProps = {};

    flattenArray(props.style).forEach((style) => {
      const newStyle: StyleProps = {};
      // style returned from useAnimatedStyle
      if (style?.viewDescriptors) {
        styles.push(style);
        return;
      }
      for (const key in style) {
        // case {width: sharedValue}
        if (typeof style[key] === 'object' && 'value' in style[key]) {
          sharedValuesStyles[key] = style[key];
          // cases like  {width: withTiming(sharedValue)}
        } else if (typeof style[key] === 'function') {
          functionsStyles[key] = style[key];
        } else {
          newStyle[key] = style[key];
        }
      }
      styles.push(newStyle);
    });

    const updater = () => {
      'worklet';
      const style: AnimatedStyle = {};

      for (const key in sharedValuesStyles) {
        style[key] = sharedValuesStyles[key].value;
      }

      const parseTree = <T extends AnimatableValue, S extends AnimationObject>(
        val: (() => Animation<S>) | SharedValue<T> | AnimatableValue
      ): AnimatableValue | Animation<S> => {
        'worklet';

        if (typeof val === 'object' && 'value' in val) {
          return val.value;
        } else if (typeof val === 'function') {
          const animationObject = val();
          const {
            functionName = '',
            functionArguments = [],
            animatedArgumentsIndices = [],
          } = animationObject.animationFunctionCall ?? {};
          const parsedFunctionArguments = functionArguments.map((arg, i) =>
            animatedArgumentsIndices.includes(i) ? parseTree(arg) : arg
          );

          const fun = (animationModule as any)[functionName];
          return fun(...parsedFunctionArguments);
        } else {
          return val;
        }
      };

      // functions withTiming etc. must be called in updater function
      // also functions can be nested (for example withDelay(100, withTiming(...)))
      // so they create a tree of calls and we need to traverse the tree to call them all
      for (const key in functionsStyles) {
        style[key] = parseTree(functionsStyles[key]);
      }

      return style;
    };

    let sharedValueId = 0;

    // add shared values to function closure to run updater on value change
    // normally in useAnimatedStyle it's done by babel plugin
    const parseTree = <T extends AnimatableValue, S extends AnimationObject>(
      val: (() => Animation<S>) | SharedValue<T> | AnimatableValue
    ): void => {
      if (typeof val === 'object' && 'value' in val) {
        // @ts-ignore disable-next-line
        updater._closure['_shared_value#' + sharedValueId] = val;
        sharedValueId += 1;
      } else if (typeof val === 'function') {
        const animationObject = val();
        const { functionArguments, animatedArgumentsIndices = [] } =
          animationObject.animationFunctionCall as AnimationFunctionCall;
        functionArguments.forEach((arg, i) =>
          animatedArgumentsIndices.includes(i) ? parseTree(arg) : arg
        );
      }
    };

    for (const key in functionsStyles) {
      parseTree(functionsStyles[key]);
    }

    const animatedStyle = useAnimatedStyle(updater);

    return <Component {...props} style={[...styles, animatedStyle]} />;
  };

  ComponentWithInlineStyles.displayName = `ComponentWithInlineStyles(${
    Component.displayName || Component.name || 'Component'
  })`;

  return React.forwardRef<Component>((props, ref) => {
    return (
      <ComponentWithInlineStyles
        {...props}
        {...(ref === null ? null : { forwardedRef: ref })}
      />
    );
  });
};
