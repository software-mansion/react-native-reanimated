import type { TransitionData } from '../animationParser';
export declare function SequencedTransition(name: string, transitionData: TransitionData): {
    name: string;
    style: {
        0: {
            transform: {
                translateX: string;
                translateY: string;
                scale: string;
            }[];
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
//# sourceMappingURL=Sequenced.web.d.ts.map