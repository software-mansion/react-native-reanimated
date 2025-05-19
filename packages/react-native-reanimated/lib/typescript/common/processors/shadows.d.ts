import type { BoxShadowValue } from 'react-native';
import type { ValueProcessor } from '../types';
export type ProcessedBoxShadowValue = {
    blurRadius?: number;
    color?: number;
    offsetX?: number;
    offsetY?: number;
    spreadDistance?: number;
    inset?: boolean;
};
export declare const processBoxShadow: ValueProcessor<ReadonlyArray<BoxShadowValue> | string, ProcessedBoxShadowValue[]>;
//# sourceMappingURL=shadows.d.ts.map