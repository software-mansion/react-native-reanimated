import type { ComponentClass, ComponentType, FunctionComponent } from 'react';
import type { FlatList, FlatListProps } from 'react-native';
import type { CSSProps } from '../types';
export default function createAnimatedComponent<P extends object>(Component: FunctionComponent<P>): FunctionComponent<CSSProps<P>>;
export default function createAnimatedComponent<P extends object>(Component: ComponentClass<P>): ComponentClass<CSSProps<P>>;
export default function createAnimatedComponent<P extends object>(Component: ComponentType<P>): FunctionComponent<CSSProps<P>> | ComponentClass<CSSProps<P>>;
/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
export default function createAnimatedComponent(Component: typeof FlatList<unknown>): ComponentClass<CSSProps<FlatListProps<unknown>>>;
//# sourceMappingURL=createAnimatedComponent.d.ts.map