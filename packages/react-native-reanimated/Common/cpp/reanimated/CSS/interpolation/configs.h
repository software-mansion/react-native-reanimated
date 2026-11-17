#pragma once

#include <reanimated/CSS/common/values/CSSLength.h>

#include <string>
#include <utility>

namespace reanimated::css {

struct RelativeValueInterpolatorConfig {
  RelativeTo relativeTo;
  std::string relativeProperty;

  RelativeValueInterpolatorConfig(RelativeTo relativeTo, std::string relativeProperty)
      : relativeTo(relativeTo), relativeProperty(std::move(relativeProperty)) {}

  RelativeValueInterpolatorConfig() = default;
};

} // namespace reanimated::css
