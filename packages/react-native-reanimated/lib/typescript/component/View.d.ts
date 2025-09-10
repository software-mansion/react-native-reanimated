import { View } from 'react-native';
interface AnimatedViewComplement extends View {
    getNode(): View;
}
export declare const AnimatedView: import("react").ComponentClass<import("..").AnimatedProps<import("react-native").ViewProps>, any>;
export type AnimatedView = typeof AnimatedView & AnimatedViewComplement;
export {};
//# sourceMappingURL=View.d.ts.map