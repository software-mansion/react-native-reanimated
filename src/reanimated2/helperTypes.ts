/*
This file is a legacy remainder of manual types from react-native-reanimated.d.ts file. 
I wasn't able to get rid of all of them from the code. 
They should be treated as a temporary solution
until time comes to refactor the code and get necessary types right. 
This will not be easy though! 
*/

import type {
  ColorValue,
  StyleProp,
  TransformsStyle as RNTransformsStyle,
} from 'react-native';
import type {
  AnimatableValue,
  BaseAnimationBuilder,
  EntryExitAnimationFunction,
  ILayoutAnimationBuilder,
  LayoutAnimationFunction,
  SharedValue,
} from '.';
import type { ReanimatedKeyframe } from './layoutReanimation/animationBuilder/Keyframe';
import type { DependencyList } from './hook/commonTypes';

type Adaptable<T> = T | ReadonlyArray<T | ReadonlyArray<T>> | SharedValue<T>;

type AdaptTransforms<T> = {
  [P in keyof T]: Adaptable<T[P]>;
};

type TransformsStyle = Pick<RNTransformsStyle, 'transform'>;

type TransformStyleTypes = TransformsStyle['transform'] extends
  | readonly (infer T)[]
  | undefined
  ? T
  : never;
type AnimatedTransform = AdaptTransforms<TransformStyleTypes>[];

export type AnimateStyle<S> = {
  [K in keyof S]: K extends 'transform'
    ? AnimatedTransform
    : S[K] extends ReadonlyArray<any>
    ? ReadonlyArray<AnimateStyle<S[K][0]>>
    : S[K] extends object
    ? AnimateStyle<S[K]>
    : S[K] extends ColorValue | undefined
    ? S[K] | number
    : S[K] | SharedValue<AnimatableValue>;
};

type StylesOrDefault<T> = 'style' extends keyof T
  ? T['style']
  : Record<string, unknown>;

type EntryOrExitLayoutType =
  | BaseAnimationBuilder
  | typeof BaseAnimationBuilder
  | EntryExitAnimationFunction
  | ReanimatedKeyframe;

export type AnimateProps<P extends object> = {
  [K in keyof Omit<P, 'style'>]: P[K] | SharedValue<P[K]>;
} & {
  style?: StyleProp<AnimateStyle<StylesOrDefault<P>>>;
} & {
  animatedProps?: Partial<AnimateProps<P>>;
  layout?:
    | BaseAnimationBuilder
    | LayoutAnimationFunction
    | typeof BaseAnimationBuilder;
  entering?: EntryOrExitLayoutType;
  exiting?: EntryOrExitLayoutType;
  sharedTransitionTag?: string;
  sharedTransitionStyle?: ILayoutAnimationBuilder;
};

export type PropsAdapterFunction = (props: Record<string, unknown>) => void;

export type useAnimatedPropsType = <T extends object>(
  updater: () => Partial<T>,
  deps?: DependencyList | null,
  adapters?: PropsAdapterFunction | PropsAdapterFunction[] | null
) => Partial<T>;
