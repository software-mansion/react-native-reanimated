#pragma once

#include <jsi/jsi.h>
#include <cmath>
#include <functional>
#include <string>
#include <unordered_map>

#include <reanimated/CSS/easing/CubicBezierEasing.h>
#include <reanimated/CSS/easing/LinearParametrizedEasing.h>
#include <reanimated/CSS/easing/StepsEasing.h>

using namespace facebook;

namespace reanimated {

extern const std::unordered_map<std::string, EasingFunction>
    predefinedEasingMap;
EasingFunction getEasingFunction(
    const jsi::Value &easingConfig,
    jsi::Runtime &rt);
EasingFunction getPredefinedEasingFunction(const std::string &name);
EasingFunction getParametrizedEasingFunction(
    const jsi::Value &easingConfig,
    jsi::Runtime &rt);

} // namespace reanimated
