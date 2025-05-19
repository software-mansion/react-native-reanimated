/// <reference types="react" />
import { Image } from 'react-native';
interface AnimatedImageComplement extends Image {
    getNode(): Image;
}
export declare const AnimatedImage: import("react").ComponentClass<import("..").AnimateProps<import("react-native").ImageProps>, any>;
export type AnimatedImage = typeof AnimatedImage & AnimatedImageComplement;
export {};
//# sourceMappingURL=Image.d.ts.map