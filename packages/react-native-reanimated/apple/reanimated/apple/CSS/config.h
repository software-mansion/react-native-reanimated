#pragma once

#include <reanimated/apple/CSS/keyframes.h>

#include <react/renderer/core/ReactPrimitives.h>

#include <array>
#include <functional>
#include <optional>
#include <string>
#include <vector>

namespace reanimated::css {

struct PlatformAnimationPropertyConfig {
  std::string keyPath;
  std::vector<CAKeyframe> keyframes;
  // Per-segment easing: cubic-bezier control points, or nullopt for linear
  std::vector<std::optional<std::array<double, 4>>> easings;
};

struct PlatformAnimationConfig {
  std::string name;
  double duration;
  double startTimestamp;
  double iterationCount;
  int direction;
  std::vector<PlatformAnimationPropertyConfig> properties;
};

using facebook::react::Tag;

using ApplyPlatformAnimationFunction = std::function<void(Tag, const PlatformAnimationConfig &)>;
using RemovePlatformAnimationFunction = std::function<void(Tag, const std::string &name)>;

} // namespace reanimated::css
