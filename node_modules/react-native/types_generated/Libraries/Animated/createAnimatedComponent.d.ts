/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<81dec344556801ade5b7f17492032e3e>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Animated/createAnimatedComponent.js
 */

import type AnimatedAddition from "./nodes/AnimatedAddition";
import type AnimatedDiffClamp from "./nodes/AnimatedDiffClamp";
import type AnimatedDivision from "./nodes/AnimatedDivision";
import type AnimatedInterpolation from "./nodes/AnimatedInterpolation";
import type AnimatedModulo from "./nodes/AnimatedModulo";
import type AnimatedMultiplication from "./nodes/AnimatedMultiplication";
import type AnimatedNode from "./nodes/AnimatedNode";
import type { AnimatedPropsAllowlist } from "./nodes/AnimatedProps";
import type AnimatedSubtraction from "./nodes/AnimatedSubtraction";
import type AnimatedValue from "./nodes/AnimatedValue";
import View from "../Components/View/View";
import * as React from "react";
type Nullable = void | null;
type Primitive = string | number | boolean | symbol | void;
type Builtin = (...$$REST$$: ReadonlyArray<never>) => unknown | Date | Error | RegExp;
export type WithAnimatedValue<T> = T extends Builtin | Nullable ? T : T extends Primitive ? T | AnimatedNode | AnimatedAddition | AnimatedSubtraction | AnimatedDivision | AnimatedMultiplication | AnimatedModulo | AnimatedDiffClamp | AnimatedValue | AnimatedInterpolation<number | string> | AnimatedInterpolation<number> | AnimatedInterpolation<string> : T extends ReadonlyArray<infer P> ? ReadonlyArray<WithAnimatedValue<P>> : T extends {} ? { readonly [K in keyof T]: WithAnimatedValue<T[K]> } : T;
type NonAnimatedProps = "ref" | "innerViewRef" | "scrollViewRef" | "testID" | "disabled" | "accessibilityLabel";
type PassThroughProps = Readonly<{
  passthroughAnimatedPropExplicitValues?: React.JSX.LibraryManagedAttributes<typeof View, React.ComponentProps<typeof View>> | null;
}>;
export type AnimatedProps<Props extends {}> = { [K in keyof Props]: K extends NonAnimatedProps ? Props[K] : WithAnimatedValue<Props[K]> } & PassThroughProps;
export type AnimatedBaseProps<Props extends {}> = { [K in keyof Props]: K extends NonAnimatedProps ? Props[K] : WithAnimatedValue<Props[K]> };
export type AnimatedComponentType<Props extends {}, Instance = unknown> = (props: Omit<AnimatedProps<Props>, keyof {
  ref?: React.Ref<Instance>;
}> & {
  ref?: React.Ref<Instance>;
}) => React.ReactNode;
declare function createAnimatedComponent<TInstance extends React.ComponentType<any>>(Component: TInstance): AnimatedComponentType<Readonly<React.ComponentProps<TInstance>>, React.ComponentRef<TInstance>>;
export default createAnimatedComponent;
export declare function unstable_createAnimatedComponentWithAllowlist<TProps extends {}, TInstance extends React.ComponentType<TProps>>(Component: TInstance, allowlist: null | undefined | AnimatedPropsAllowlist): AnimatedComponentType<TProps, React.ComponentRef<TInstance>>;
