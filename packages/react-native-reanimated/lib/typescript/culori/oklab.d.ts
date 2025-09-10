import type { LabColor, RgbColor } from './Colors';
declare function convertRgbToOklab(rgb: RgbColor): LabColor;
declare function convertOklabToRgb(labColor: LabColor): RgbColor;
declare const _default: {
    convert: {
        fromRgb: typeof convertRgbToOklab;
        toRgb: typeof convertOklabToRgb;
    };
};
export default _default;
//# sourceMappingURL=oklab.d.ts.map