import type { ColorValue, DimensionValue } from 'react-native';
import type { ParametrizedTimingFunction } from '../easing';
import type { AddArrayPropertyType, ConvertValuesToArrays } from '../types';
export declare function maybeAddSuffixes<T, K extends keyof T>(object: ConvertValuesToArrays<T>, key: K, suffix: string): string[];
export declare function parseTimingFunction(timingFunction: AddArrayPropertyType<ParametrizedTimingFunction | string>): string;
export declare function parseDimensionValue(value: DimensionValue): string | undefined;
export declare function opacifyColor(color: ColorValue, opacity: number): string | null;
//# sourceMappingURL=utils.d.ts.map