#pragma once

#include <reanimated/CSS/common/values/CSSLength.h>

#include <string>
#include <utility>

namespace reanimated::css {

struct ResolvableValueInterpolatorConfig {
  RelativeTo relativeTo;
  std::string relativeProperty;

  ResolvableValueInterpolatorConfig(RelativeTo relativeTo, std::string relativeProperty)
      : relativeTo(relativeTo), relativeProperty(std::move(relativeProperty)) {}

  ResolvableValueInterpolatorConfig() = default;
};

} // namespace reanimated::css
