# Shared Element Transitions — iOS Modal Support

## Problem

SET's snapshot container is mounted under the RN surface root, which lives inside the presenter VC. On iOS, a modal VC's view is a sibling under `UIWindow`, so it covers the snapshot.

Android works because modal screens don't cross a window boundary.

## Fix

On iOS, reparent the snapshot container `UIView` to the `UIWindow` for the duration of the transition, then put it back before RN removes it.

## Steps

1. **C++** ([SharedTransitions.cpp](packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/SharedTransitions.cpp)): after the container is mounted, call a new platform method `reparentSharedTransitionContainerToWindow(containerTag)`. At cleanup, call `restoreSharedTransitionContainer(containerTag)` before emitting Remove/Delete.

2. **iOS** ([REANodesManager.mm](packages/react-native-reanimated/apple/reanimated/apple/REANodesManager.mm)):
   - Look up the container `UIView` via `componentViewRegistry`.
   - Reparent to `surfaceRoot.window`, translating frame with `convertRect:toView:`.
   - Compensate for per-frame frame updates (which arrive in surface-root coords) using a constant `CATransform3D` translation = `surfaceRoot` origin in window coords.
   - On restore, reverse.

3. **Target frame across modal boundary**: get the modal's final frame via `modalVC.presentationController.frameOfPresentedViewInContainerView` (returns the destination even mid-animation). Add it to the target's in-surface position. Find `modalVC` by walking up `targetView`'s responder chain.

4. **Android**: no-op the new platform methods.

## How C++ and iOS talk

```
JS
 │
 ▼
ReanimatedModuleProxy (C++)
 │  owns
 ▼
LayoutAnimationsProxy_Experimental (C++)   ◄── SharedTransitions.cpp lives here
 │  - MountingOverrideDelegate on each surface
 │  - rewrites ShadowViewMutations (hide source/target, insert container)
 │
 │  calls platform methods via function pointers
 ▼
PlatformDepMethodsHolder (Obj-C glue)
 │
 ▼
REANodesManager.mm  ──►  surfacePresenter.mountingManager.componentViewRegistry
                                            │
                                            ▼
                                       real UIViews
```
