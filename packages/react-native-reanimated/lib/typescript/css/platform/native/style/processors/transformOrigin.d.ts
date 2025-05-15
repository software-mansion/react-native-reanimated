import type { ValueProcessor } from '../../../../../common';
import type { TransformOrigin } from '../../types';
export declare const ERROR_MESSAGES: {
    invalidTransformOrigin: (value: TransformOrigin) => string;
    invalidComponent: (component: string | number, origin: TransformOrigin) => string;
    invalidKeyword: (keyword: string, axis: 'x' | 'y', validKeywords: string[]) => string;
};
export declare const processTransformOrigin: ValueProcessor<TransformOrigin>;
//# sourceMappingURL=transformOrigin.d.ts.map