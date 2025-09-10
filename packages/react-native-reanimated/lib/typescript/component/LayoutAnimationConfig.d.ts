import type { ReactNode } from 'react';
import { Component } from 'react';
export declare const SkipEnteringContext: import("react").Context<import("react").RefObject<boolean> | null>;
interface LayoutAnimationConfigProps {
    skipEntering?: boolean;
    skipExiting?: boolean;
    children: ReactNode;
}
/**
 * A component that lets you skip entering and exiting animations.
 *
 * @param skipEntering - A boolean indicating whether children's entering
 *   animations should be skipped when `LayoutAnimationConfig` is mounted.
 * @param skipExiting - A boolean indicating whether children's exiting
 *   animations should be skipped when LayoutAnimationConfig is unmounted.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-animation-config/
 */
export declare class LayoutAnimationConfig extends Component<LayoutAnimationConfigProps> {
    getMaybeWrappedChildren(): string | number | bigint | boolean | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | import("react").JSX.Element[] | null | undefined;
    setShouldAnimateExiting(): void;
    componentWillUnmount(): void;
    render(): ReactNode;
}
export {};
//# sourceMappingURL=LayoutAnimationConfig.d.ts.map