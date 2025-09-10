import { Text } from 'react-native';
interface AnimatedTextComplement extends Text {
    getNode(): Text;
}
export declare const AnimatedText: import("react").ComponentClass<import("..").AnimatedProps<import("react-native").TextProps>, any>;
export type AnimatedText = typeof AnimatedText & AnimatedTextComplement;
export {};
//# sourceMappingURL=Text.d.ts.map