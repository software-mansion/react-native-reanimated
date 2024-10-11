#pragma once

#include <jsi/jsi.h>

#include <functional>
#include <optional>
#include <string>
#include <vector>

using namespace facebook;

namespace reanimated {

using PropertyNames = std::vector<std::string>;
using PropertyValues = std::unique_ptr<jsi::Value>;
using PropertyPath = std::vector<std::string>;

using EasingFunction = std::function<double(double)>;
using ColorArray = std::array<uint8_t, 4>;

struct RelativeOrNumericInterpolatorValue {
  double value;
  bool isRelative;
};

} // namespace reanimated
