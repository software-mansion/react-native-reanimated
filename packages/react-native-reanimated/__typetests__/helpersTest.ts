/* eslint-disable @typescript-eslint/no-unused-vars */
import type { MutuallyExclusiveUnion } from '../src/common/types/helpers';

type XOrY = MutuallyExclusiveUnion<[{ x: number }, { y: string }]>;

type XYOrPosition = MutuallyExclusiveUnion<
  [{ x: number; y: number }, { position?: { x: number; y: number } }]
>;

type AOrBOrC = MutuallyExclusiveUnion<
  [{ a: number }, { b: number }, { c: number }]
>;

function MutuallyExclusiveUnionTest() {
  // Two branches, each with a single required key: either alone is allowed.
  function singleKeyBranches() {
    const onlyX: XOrY = { x: 1 };
    const onlyY: XOrY = { y: 'a' };
    // @ts-expect-error keys from different branches cannot be combined
    const both: XOrY = { x: 1, y: 'a' };
    // @ts-expect-error neither branch's required key is provided
    const none: XOrY = {};
  }

  // A fully optional branch makes the empty object a valid member.
  function optionalBranch() {
    const empty: XYOrPosition = {};
    const xy: XYOrPosition = { x: 1, y: 2 };
    const position: XYOrPosition = { position: { x: 1, y: 2 } };
    // @ts-expect-error `position` excludes `x` / `y`
    const mixed: XYOrPosition = { x: 1, y: 2, position: { x: 1, y: 2 } };
  }

  // Three branches: picking one key excludes the keys from the other two.
  function threeBranches() {
    const a: AOrBOrC = { a: 1 };
    const c: AOrBOrC = { c: 1 };
    // @ts-expect-error `a` and `c` belong to different branches
    const ac: AOrBOrC = { a: 1, c: 1 };
  }
}
