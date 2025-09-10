import type { BoxShadowValue } from 'react-native';
import type { ValueProcessor } from '../types';
export type ProcessedBoxShadowValue = {
    offsetX: number;
    offsetY: number;
    blurRadius?: number;
    color?: number;
    spreadDistance?: number;
    inset?: boolean;
};
export declare const processBoxShadowNative: ValueProcessor<ReadonlyArray<BoxShadowValue> | string, ProcessedBoxShadowValue[]>;
export declare const processBoxShadowWeb: ValueProcessor<string | ReadonlyArray<BoxShadowValue>, string>;
//# sourceMappingURL=shadows.d.ts.map