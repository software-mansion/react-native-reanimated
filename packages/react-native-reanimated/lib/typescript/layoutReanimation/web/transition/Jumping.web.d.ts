import type { TransitionData } from '../animationParser';
export declare function JumpingTransition(name: string, transitionData: TransitionData): {
    name: string;
    style: {
        0: {
            transform: {
                translateX: string;
                translateY: string;
                scale: string;
            }[];
            easing: (t: number) => number;
        };
        50: {
            transform: {
                translateX: string;
                translateY: string;
                scale: string;
            }[];
        };
        100: {
            transform: {
                translateX: string;
                translateY: string;
                scale: string;
            }[];
        };
    };
    duration: number;
};
//# sourceMappingURL=Jumping.web.d.ts.map