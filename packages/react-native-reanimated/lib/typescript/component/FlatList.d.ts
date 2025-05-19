import React from 'react';
import type { FlatListProps } from 'react-native';
import { FlatList } from 'react-native';
import type { ILayoutAnimationBuilder } from '../commonTypes';
import type { AnimatedProps } from '../helperTypes';
declare const AnimatedFlatList: React.ComponentClass<import("../helperTypes").AnimateProps<FlatListProps<unknown>>, any>;
interface ReanimatedFlatListPropsWithLayout<T> extends AnimatedProps<FlatListProps<T>> {
    /**
     * Lets you pass layout animation directly to the FlatList item. Works only
     * with a single-column `Animated.FlatList`, `numColumns` property cannot be
     * greater than 1.
     */
    itemLayoutAnimation?: ILayoutAnimationBuilder;
    /**
     * Lets you skip entering and exiting animations of FlatList items when on
     * FlatList mount or unmount.
     */
    skipEnteringExitingAnimations?: boolean;
    /** Property `CellRendererComponent` is not supported in `Animated.FlatList`. */
    CellRendererComponent?: never;
}
export type FlatListPropsWithLayout<T> = ReanimatedFlatListPropsWithLayout<T>;
interface AnimatedFlatListComplement<T> extends FlatList<T> {
    getNode(): FlatList<T>;
}
export declare const ReanimatedFlatList: <ItemT = any>(props: ReanimatedFlatListPropsWithLayout<ItemT> & {
    ref?: React.Ref<FlatList<any>> | undefined;
}) => React.ReactElement;
export type ReanimatedFlatList<T> = typeof AnimatedFlatList & AnimatedFlatListComplement<T>;
export {};
//# sourceMappingURL=FlatList.d.ts.map