import type { ReactTestInstance } from 'react-test-renderer';
import type { DefaultStyle } from './hook/commonTypes';
declare global {
    namespace jest {
        interface Matchers<R> {
            toHaveAnimatedStyle(style: Record<string, unknown>[] | Record<string, unknown>, config?: {
                shouldMatchAllProps?: boolean;
            }): R;
            toHaveAnimatedProps(props: Record<string, unknown>): R;
        }
    }
}
export declare const withReanimatedTimer: (animationTest: () => void) => void;
export declare const advanceAnimationByTime: (time?: number) => void;
export declare const advanceAnimationByFrame: (count: number) => void;
export declare const setUpTests: (userFramerateConfig?: {}) => void;
export declare const getAnimatedStyle: (component: ReactTestInstance) => DefaultStyle;
//# sourceMappingURL=jestUtils.d.ts.map