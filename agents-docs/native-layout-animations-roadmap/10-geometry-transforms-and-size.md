# Objective 10 — Implement Geometry, Transforms, and Size Changes

## Goal

Support layout geometry and React Native transforms. Do not allow stale host
state, lost transform order, or incorrect private sublayer geometry.

## Depends on

- Objective 09 interruption and ownership.

## Concurrency

**Sequential for geometry integration.** Objective 11 may draft lifecycle
tests, Objective 13 may run numerical spring experiments, and Objective 14 may
exercise the frozen matrix type in parallel. None may redefine matrix order,
transform origin, or the size policy while this objective's checkpoint is open.

## Separate three concepts

Do not treat all of these as one generic “transform”:

1. **Layout movement:** old rectangle to final rectangle.
2. **Layout resizing:** old width/height to final width/height.
3. **Style transform:** ordered React Native operations such as translate,
   rotate, scale, skew, perspective, matrix, and transform origin.

## Current PoC problem

```text
sample transform array
  -> flatten into translateX/scaleX/rotation/etc.
  -> lose operation order and duplicates
  -> iOS recomposes in one fixed order
```

These are not equivalent:

```ts
[{ translateX: 100 }, { rotate: '45deg' }]
[{ rotate: '45deg' }, { translateX: 100 }]
```

The current representation also emits `skewY` without playing it and ignores
matrix transforms and transform origin.

## Recommended transform representation

Correctness baseline: one complete 4×4 matrix value per relevant keyframe.

```cpp
NativeAnimationTrack {
  target: TransformMatrix,
  segments: [
    Keyframes {
      timesMs: [...],
      values: [Matrix4, Matrix4, ...]
    }
  ]
}
```

Generate matrices using the same operation pairing/order/origin logic as the
current Reanimated transform interpolator. Do not recreate
matrix order in Objective-C++.

### Alternative: ordered operation IR

Pros: can lower translate/scale/rotation to native value functions.  
Cons: more complex cross-platform executor and interruption logic.

Recommended: matrix keyframes first. Add ordered operation segments later only
as a measured fast path.

## Size-change strategies

### A. Animate `bounds.size` directly

Pros: geometrically intuitive.  
Cons: React Native private background/border/mask/content sublayers may not
resize with presentation bounds, and child layout is not recomputed per frame.

Use only for component types proven safe by tests or a component-specific
adapter.

### B. Final-state-first FLIP — recommended default

1. Record old frame.
2. Mount final frame and child layout.
3. Compute an inverse transform mapping the final rectangle to the old visual
   rectangle.
4. Animate that inverse transform to identity.

Conceptually:

```text
scaleX = oldWidth / finalWidth
scaleY = oldHeight / finalHeight
translate = oldAnchorPosition - finalAnchorPosition
```

The actual matrix must account for anchor point, existing style transform, and
transform origin.

Pros: private sublayers and child layout are already final and move together.  
Cons: text/images visually scale instead of reflowing during the transition.

### C. Snapshot animation

Animate a bitmap/snapshot while the real final view is hidden or already
mounted.

Pros: stable visuals for complex components.  
Cons: memory, snapshot latency, stale dynamic content, accessibility/interaction
policy, and platform-specific implementation.

Use this only for supported complex cases, not the basic MVP.

### D. Per-frame Fabric layout

This is the legacy fallback and remains the correct choice when exact reflow is
required.

## Composing layout and style matrices

Define and test the multiplication order once. Use the same convention as
React Native's transform matrix implementation.

Conceptual target:

```text
presentationMatrix(t) = layoutFLIPMatrix(t) * styleAnimationMatrix(t)
```

The exact order may differ based on RN's matrix convention. Prove it with
golden tests; do not infer it from visual intuition.

For interruption, read the complete presentation matrix. If preserving
multi-turn rotation semantics matters, retain structural progress in the owner
rather than decomposing the matrix back into one shortest-path rotation.

## Perspective

React Native perspective is an operation inside the view transform. Do not move
it to `sublayerTransform` merely because Core Animation exposes that property;
the semantics differ.

## Geometry target policy

Recommended:

- Position-only layout transition: native position track.
- Position + size: FLIP matrix track.
- Style transform only: full matrix track.
- Position + size + style transform: one composed matrix plan.
- Exact child reflow required: legacy fallback.

### Scalar geometry ownership for partial interruption

The Objective 02 player emits compound `position` (`CGPoint`) and `bounds.size`
(`CGSize`) tracks. This permits position plus opacity coexistence but cannot
preserve X when a new animation replaces only Y. The production lowering must
make the physical scalar tracks explicit:

```text
PositionX = originX + anchorPoint.x * width
PositionY = originY + anchorPoint.y * height
BoundsWidth = width
BoundsHeight = height
```

Ownership follows these lowered targets. If an old layout plan owns PositionX
and PositionY and an exit replaces only PositionY, PositionX must continue
without a jump. Per D002, the old logical callback still completes with
`finished=false`; the surviving PositionX trajectory is transferred or
recompiled under the new logical generation. Width/anchor dependencies must be
resolved during lowering rather than treating `originX` as raw `position.x`.

## Tests

- Translate then rotate differs correctly from rotate then translate.
- Duplicate rotations/translations are preserved.
- Multi-turn rotations do not collapse unexpectedly in supported cases.
- `skewX`, `skewY`, perspective, matrix, and transform origin either work or
  fall back.
- Position+size FLIP reaches the exact final frame.
- Text, Image, ScrollView, border, nonuniform radius, mask, shadow, and clipped
  children have documented behavior.
- Retargeting a composed matrix has no visible jump.
- Zero width/height avoids division by zero and follows an explicit policy.
- Replacing PositionY alone does not change the PositionX presentation path,
  including while width/anchor-derived position values are in use.

## How to test at this stage

Combine pure matrix goldens with a visual component grid. Follow
[TESTING-GUIDE.md](TESTING-GUIDE.md) for backend comparison and video capture.

1. In pure tests, compute full 4×4 matrices for translate→rotate versus
   rotate→translate, duplicate transforms, skewX/Y, perspective, transform
   origin, a supplied matrix, and layout-FLIP composed with a style transform.
   Assert all 16 values against React Native/Reanimated's established matrix
   implementation—not a new Objective-C++ calculation.
2. Add a **Geometry and transforms** test-bench grid containing View, Text,
   Image, ScrollView, uniform and nonuniform borders/radii, shadow, clipping,
   and nested children. Each tile runs the same position-plus-size FLIP from a
   fixed old frame to fixed final frame.
3. At 0%, 25%, 50%, 75%, and 100%, record model frame, presentation matrix,
   projected four-corner positions, and child/private-layer frames where
   inspectable. Assert exact final host geometry and the accepted projected
   error; document each component as supported or an explicit legacy fallback.
4. Run transform-order pairs side by side on legacy and native. Their outputs
   must differ from one another in the same way on both backends. Also run two
   full rotations and confirm the supported policy does not collapse them to a
   shortest path.
5. Retarget the composed size-plus-style matrix at 40% and assert projected
   corner continuity. Run zero-width, zero-height, and zero→nonzero cases and
   assert the declared fallback/handling path with no NaN or infinity.
6. Capture native and legacy screenshots at the programmed 50% pause and a
   video for Text and clipped nested children. Run tests, Apple lint, Android
   lint for common matrix changes, and common-app type checking.

Simulator is required for correctness. Run at least one representative grid on
a physical iPhone to catch device-only layer composition differences, but defer
frame-rate judgments to Objective 15.

## Acceptance criteria

- No fixed canonical transform-channel recomposition remains in the supported
  path.
- Full transform order is preserved or routing rejects the case.
- Size policy is documented per supported component/case.
- Fabric host metrics remain final during every native size transition.
- Android can consume the chosen matrix/FLIP representation.

## References

- [Core Animation geometry and transforms](../core-animation/02-core-animation-basics.md)
- [Animatable properties](../core-animation/10-animatable-properties.md)
- [KVC transform fields](../core-animation/11-key-value-coding-extensions.md)
- [React Native component layout internals](../../node_modules/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm)
- [Reanimated transform interpolation](../../packages/react-native-reanimated/Common/cpp/reanimated/CSS/interpolation/transforms)

## Next objective

[Objective 11 — Complete Entering/Exiting and Public Semantics](11-entering-exiting-and-public-semantics.md).
