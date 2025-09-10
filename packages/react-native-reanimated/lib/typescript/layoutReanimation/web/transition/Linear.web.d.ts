import type { TransitionData } from '../animationParser';
export declare function LinearTransition(name: string, transitionData: TransitionData): {
    name: string;
    style: {
        0: {
            transform: {
                translateX: string;
                translateY: string;
                scale: string;
            }[];
        };
    };
    duration: number;
};
//# sourceMappingURL=Linear.web.d.ts.map