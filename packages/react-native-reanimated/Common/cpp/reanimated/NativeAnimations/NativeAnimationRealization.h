#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>

#include <react/renderer/components/view/ViewProps.h>

namespace reanimated::native_animation {

/// False when React Native puts more than the prop of the target into the model value of the host view. A
/// value that comes from the prop is then not the value on screen. The opacity filter multiplies the layer
/// opacity.
bool modelHoldsOnlyProp(const facebook::react::ViewProps &viewProps, AnimationTarget target);

} // namespace reanimated::native_animation
