#pragma once

#include <cmath>
#include <functional>
#include <string>
#include <unordered_map>

using EasingFunction = std::function<double(double)>;

namespace reanimated {

double easeInOutBack(double t);
double linear(double t);

extern const std::unordered_map<std::string, std::function<double(double)>>
    easingMap;

EasingFunction getEasingFunction(const std::string &name);

} // namespace reanimated
