#pragma once

#include <jsi/jsi.h>
#include <string>
#include <vector>

namespace reanimated {

using namespace facebook;

using PropertyNames = std::vector<std::string>;
using PropertyValues = std::unique_ptr<jsi::Value>;
using PropertyPath = std::vector<std::string>;
using EasingFunction = std::function<double(double)>;
using ColorArray = std::array<uint8_t, 4>;
using Vec16Array = std::array<double, 16>;
using Matrix4x4 = std::array<std::array<double, 4>, 4>;

} // namespace reanimated
