import type { BoxShadowValue, ViewStyle } from 'react-native';
import type { ValueProcessor } from '../types';
export declare const processBoxShadow: ValueProcessor<string | ReadonlyArray<BoxShadowValue>>;
type ShadowOffset = NonNullable<ViewStyle['shadowOffset']>;
export declare const processShadowOffset: ValueProcessor<ShadowOffset>;
export {};
//# sourceMappingURL=shadows.d.ts.map