#pragma once

namespace reanimated {

struct NativeLayoutPlatformRules {
  bool movesOnlyPlanarTransforms{false};
  /// The display refresh period in ms of `NativeAnimationPlatform::replacementLeadRefreshMs`.
  double replacementLeadRefreshMs{0};
};

} // namespace reanimated
