import type { Ref } from 'react';
import React from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native';
import type { SharedValue } from '../commonTypes';
import type { AnimatedProps } from '../helperTypes';
export interface AnimatedScrollViewProps extends AnimatedProps<ScrollViewProps> {
    scrollViewOffset?: SharedValue<number>;
    ref?: Ref<AnimatedScrollView> | null;
}
interface AnimatedScrollViewComplement extends ScrollView {
    getNode(): ScrollView;
}
declare const AnimatedScrollViewComponent: React.ComponentClass<AnimatedProps<ScrollViewProps>, any>;
export declare function AnimatedScrollView({ scrollViewOffset, ref, ...restProps }: AnimatedScrollViewProps): React.JSX.Element;
export type AnimatedScrollView = AnimatedScrollViewComplement & typeof AnimatedScrollViewComponent;
export {};
//# sourceMappingURL=ScrollView.d.ts.map