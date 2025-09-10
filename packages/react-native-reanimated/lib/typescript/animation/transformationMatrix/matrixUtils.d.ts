type FixedLengthArray<T, L extends number, PassedObject = [T, ...Array<T>]> = PassedObject & {
    readonly length: L;
    [I: number]: T;
};
export type AffineMatrix = FixedLengthArray<FixedLengthArray<number, 4>, 4>;
export type AffineMatrixFlat = FixedLengthArray<number, 16>;
type TransformMatrixDecomposition = Record<'translationMatrix' | 'scaleMatrix' | 'rotationMatrix' | 'skewMatrix', AffineMatrix>;
type Axis = 'x' | 'y' | 'z';
interface TansformMatrixDecompositionWithAngles extends TransformMatrixDecomposition {
    rx: number;
    ry: number;
    rz: number;
}
export declare function isAffineMatrixFlat(x: unknown): x is AffineMatrixFlat;
export declare function isAffineMatrix(x: unknown): x is AffineMatrix;
export declare function flatten(matrix: AffineMatrix): AffineMatrixFlat;
export declare function unflatten(m: AffineMatrixFlat): AffineMatrix;
export declare function multiplyMatrices(a: AffineMatrix, b: AffineMatrix): AffineMatrix;
export declare function subtractMatrices<T extends AffineMatrixFlat | AffineMatrix>(maybeFlatA: T, maybeFlatB: T): T;
export declare function addMatrices<T extends AffineMatrixFlat | AffineMatrix>(maybeFlatA: T, maybeFlatB: T): T;
export declare function scaleMatrix<T extends AffineMatrixFlat | AffineMatrix>(maybeFlatA: T, scalar: number): T;
export declare function getRotationMatrix(angle: number, axis?: Axis): AffineMatrix;
export declare function decomposeMatrix(unknownTypeMatrix: AffineMatrixFlat | AffineMatrix): TransformMatrixDecomposition;
export declare function decomposeMatrixIntoMatricesAndAngles(matrix: AffineMatrixFlat | AffineMatrix): TansformMatrixDecompositionWithAngles;
export {};
//# sourceMappingURL=matrixUtils.d.ts.map