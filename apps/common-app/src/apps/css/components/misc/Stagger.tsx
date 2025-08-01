import type { PropsWithChildren, ReactNode } from 'react';
import { Children } from 'react';
import type { ViewStyle } from 'react-native';
import type {
  BaseAnimationBuilder,
  LayoutAnimationFunction,
} from 'react-native-reanimated';
import Animated, {
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';

type StaggerProps = PropsWithChildren<{
  interval?: number;
  delay?: number;
  enabled?: boolean;
  ParentComponent?: React.ComponentType<{
    children: ReactNode;
    style?: ViewStyle;
  }>;
  wrapperStye?: ((index: number) => ViewStyle) | ViewStyle;
  itemLayout?:
    | BaseAnimationBuilder
    | LayoutAnimationFunction
    | typeof BaseAnimationBuilder;
}>;

export default function Stagger({
  ParentComponent,
  children,
  delay = 0,
  interval = 100,
  enabled = true,
  itemLayout = LinearTransition,
  wrapperStye,
}: StaggerProps) {
  const childrenArray = Children.toArray(children);

  return childrenArray.map((child, index) => {
    const style =
      wrapperStye instanceof Function ? wrapperStye(index) : wrapperStye;

    const wrappedChild = (
      <Animated.View
        key={index}
        layout={itemLayout}
        style={style}
        entering={
          enabled && interval >= 0
            ? FadeInDown.delay(delay + index * interval)
            : undefined
        }>
        {child}
      </Animated.View>
    );

    return ParentComponent ? (
      <ParentComponent key={index} style={style}>
        {wrappedChild}
      </ParentComponent>
    ) : (
      wrappedChild
    );
  });
}
