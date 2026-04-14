'use strict';

export type TranslateX = { translateX: number | `${number}%` };
export type TranslateY = { translateY: number | `${number}%` };
export type Scale = { scale: number };
export type ScaleX = { scaleX: number };
export type ScaleY = { scaleY: number };
export type Rotate = { rotate: string };
export type RotateX = { rotateX: string };
export type RotateY = { rotateY: string };
export type SkewX = { skewX: string };
export type Perspective = { perspective: number };

type SingleTransform =
  | TranslateX
  | TranslateY
  | Scale
  | ScaleX
  | ScaleY
  | Rotate
  | RotateX
  | RotateY
  | SkewX
  | Perspective;

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type TransformArray = readonly SingleTransform[];

/** Merged flat transform props from tuple `T`, plus deprecated `transform?: T`. */
export type TransformsConfig<T extends TransformArray> = UnionToIntersection<
  T[number]
> & {
  /** @deprecated Use flat top-level props instead. */
  transform?: T;
};
