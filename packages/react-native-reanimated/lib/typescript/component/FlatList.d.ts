import type { FlatListProps, StyleProp, ViewStyle } from 'react-native';
import { FlatList } from 'react-native';
import type { AnimatedStyle, ILayoutAnimationBuilder } from '../commonTypes';
import type { AnimatedProps } from '../helperTypes';
declare const AnimatedFlatList: import("react").ComponentClass<AnimatedProps<FlatListProps<unknown>>, any>;
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
    /**
     * Either animated view styles or a function that receives the item to be
     * rendered and its index and returns animated view styles.
     */
    CellRendererComponentStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>> | (({ item, index, }: {
        item: T;
        index: number;
    }) => StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>) | undefined;
}
export type FlatListPropsWithLayout<T> = ReanimatedFlatListPropsWithLayout<T>;
interface AnimatedFlatListComplement<T> extends FlatList<T> {
    getNode(): FlatList<T>;
}
export declare const ReanimatedFlatList: <ItemT = any>(props: ReanimatedFlatListPropsWithLayout<ItemT> & {
    ref?: React.Ref<FlatList>;
}) => React.ReactElement;
export type ReanimatedFlatList<T = any> = typeof AnimatedFlatList & AnimatedFlatListComplement<T>;
export {};
//# sourceMappingURL=FlatList.d.ts.map