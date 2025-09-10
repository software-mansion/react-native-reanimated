import type { ColorValue } from 'react-native';
import type { Maybe } from '../../../../common';
import type { ValueProcessor } from '../types';
export declare const ERROR_MESSAGES: {
    invalidColor: (color: Maybe<ColorValue | number>) => string;
};
export declare const processColor: ValueProcessor<ColorValue | number, number | string>;
//# sourceMappingURL=colors.d.ts.map