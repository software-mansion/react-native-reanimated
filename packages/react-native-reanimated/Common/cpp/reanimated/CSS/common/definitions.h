#pragma once

#include <functional>
#include <optional>
#include <string>
#include <vector>

namespace reanimated {

using EasingFunction = std::function<double(double)>;

using PropertyNames = std::vector<std::string>;
using PropertyPath = std::vector<std::string>;

} // namespace reanimated
