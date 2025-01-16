'use strict';
import { forwardRef } from 'react';
import type {
  FunctionComponent,
  ComponentClass,
  ComponentType,
  Component,
} from 'react';
import type { FlatList, FlatListProps } from 'react-native';
import invariant from 'invariant';
import type { CSSProps } from '../types';
import type { AnimatedComponentProps } from './AnimatedComponent';
import AnimatedComponentImpl from './AnimatedComponent';

// Don't change the order of overloads, since such a change breaks current behavior
export default function createAnimatedComponent<P extends object>(
  Component: FunctionComponent<P>
): FunctionComponent<CSSProps<P>>;

export default function createAnimatedComponent<P extends object>(
  Component: ComponentClass<P>
): ComponentClass<CSSProps<P>>;

export default function createAnimatedComponent<P extends object>(
  // Actually ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P> but we need this overload too
  // since some external components (like FastImage) are typed just as ComponentType
  Component: ComponentType<P>
): FunctionComponent<CSSProps<P>> | ComponentClass<CSSProps<P>>;

/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
// @ts-ignore This is required to create this overload, since type of createAnimatedComponent is incorrect and doesn't include typeof FlatList
export default function createAnimatedComponent(
  Component: typeof FlatList<unknown>
): ComponentClass<CSSProps<FlatListProps<unknown>>>;

export default function createAnimatedComponent<P extends object>(
  Component: ComponentType<P>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  invariant(
    typeof Component !== 'function' ||
      (Component.prototype && Component.prototype.isReactComponent),
    `Looks like you're passing a function component \`${Component.name}\` to \`createAnimatedComponent\` function which supports only class components. Please wrap your function component with \`React.forwardRef()\` or use a class component instead.`
  );

  class AnimatedComponent extends AnimatedComponentImpl {
    static displayName = `AnimatedComponent(${
      Component.displayName || Component.name || 'Component'
    })`;

    constructor(props: AnimatedComponentProps) {
      super(Component, props);
    }
  }

  return forwardRef<Component>((props, ref) => {
    return (
      <AnimatedComponent
        {...props}
        {...(ref === null ? null : { forwardedRef: ref })}
      />
    );
  });
}
