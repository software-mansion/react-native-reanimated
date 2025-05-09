import type { TransitionData } from '../animationParser';
export declare function FadingTransition(name: string, transitionData: TransitionData): {
    name: string;
    style: {
        0: {
            opacity: number;
            transform: {
                translateX: string;
                translateY: string;
                scale: string;
            }[];
        };
        20: {
            opacity: number;
            transform: {
                translateX: string;
                translateY: string;
                scale: string;
            }[];
        };
        60: {
            opacity: number;
            transform: {
                translateX: string;
                translateY: string;
                scale: string;
            }[];
        };
        100: {
            opacity: number;
            transform: {
                translateX: string;
                translateY: string;
                scale: string;
            }[];
        };
    };
    duration: number;
};
//# sourceMappingURL=Fading.web.d.ts.map