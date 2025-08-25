export type AnimatedRefOnJS = AnimatedRef<WrapperRef>;

/**
 * `AnimatedRef` is mapped to this type on the UI thread via a serializable
 * handle.
 */
export type AnimatedRefOnUI = {
  (): number | ShadowNodeWrapper | null;
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type EasingFunction = (t: number) => number;

export type TransformArrayItem = Extract<
  TransformsStyle['transform'],
  Array<unknown>
>[number];

// Ideally we want AnimatedStyle to not be generic, but there are
// so many dependencies on it being generic that it's not feasible at the moment.
export type AnimatedStyle<Style = DefaultStyle> =
  | (Style & Partial<CSSAnimationProperties> & Partial<CSSTransitionProperties>) // TODO - maybe add css animation config somewhere else
  | MaybeSharedValueRecursive<Style>;

export type AnimatedTransform = MaybeSharedValueRecursive<
  TransformsStyle['transform']
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = React.ComponentType<any>;

export interface InitialComponentProps extends Record<string, unknown> {
  ref?: Ref<Component>;
  collapsable?: boolean;
}

export type ManagedAnimatedComponent = React.Component<
  AnimatedComponentProps<InitialComponentProps>
> &
  IAnimatedComponentInternal;

// TODO - can this be used as a ref?
export interface AnimatedComponentRef extends Component {
  setNativeProps?: (props: Record<string, unknown>) => void;
  getScrollableNode?: () => AnimatedComponentRef;
  getAnimatableRef?: () => AnimatedComponentRef;
  // Case for SVG components on Web
  elementRef?: React.RefObject<HTMLElement>;
}

export type PropUpdates = StyleProps | AnimatedStyle<any>;

export type JSPropsOperation = {
  tag: number;
  updates: StyleProps;
};

export type NestedArray<T> = T | NestedArray<T>[];

type AnimatedPropsProp<Props extends object> = RestProps<Props> &
  AnimatedStyleProps<Props> &
  LayoutProps;

export type AnimatedProps<Props extends object> = RestProps<Props> &
  AnimatedStyleProps<Props> &
  LayoutProps & {
    /**
     * Lets you animate component props.
     *
     * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps
     */
    animatedProps?: AddArrayPropertyType<
      Partial<AnimatedPropsProp<Props>> | CSSStyle<Props>
    >;
  };
