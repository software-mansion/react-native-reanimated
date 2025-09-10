interface HSV {
    h: number;
    s: number;
    v: number;
}
export declare function clampRGBA(RGBA: ParsedColorArray): void;
export declare const ColorProperties: string[];
export declare function normalizeColor(color: unknown): number | null;
export declare const opacity: (c: number) => number;
export declare const red: (c: number) => number;
export declare const green: (c: number) => number;
export declare const blue: (c: number) => number;
export declare const rgbaColor: (r: number, g: number, b: number, alpha?: number) => number | string;
/**
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns `{h: hue (0-1), s: saturation (0-1), v: value (0-1)}`
 */
export declare function RGBtoHSV(r: number, g: number, b: number): HSV;
export declare const hsvToColor: (h: number, s: number, v: number, a: number) => number | string;
export declare function processColorInitially(color: unknown): number | null | undefined;
export declare function isColor(value: unknown): boolean;
export type ParsedColorArray = [number, number, number, number];
export declare function convertToRGBA(color: unknown): ParsedColorArray;
export declare function rgbaArrayToRGBAColor(RGBA: ParsedColorArray): string;
export declare function toLinearSpace(RGBA: ParsedColorArray, gamma?: number): ParsedColorArray;
export declare function toGammaSpace(RGBA: ParsedColorArray, gamma?: number): ParsedColorArray;
export {};
//# sourceMappingURL=Colors.d.ts.map