#pragma once

#include <reanimated/CSS/easing/CubicBezierEasing.h>
#include <reanimated/CSS/easing/LinearParametrizedEasing.h>
#include <reanimated/CSS/easing/StepsEasing.h>

#include <jsi/jsi.h>
#include <cmath>
#include <functional>
#include <string>
#include <unordered_map>

using namespace facebook;

namespace reanimated {

extern const std::unordered_map<std::string, EasingFunction>
    predefinedEasingMap;

EasingFunction getEasingFunction(
    jsi::Runtime &rt,
    const jsi::Value &easingConfig);

EasingFunction getPredefinedEasingFunction(const std::string &name);

EasingFunction getParametrizedEasingFunction(
    jsi::Runtime &rt,
    const jsi::Value &easingConfig);

} // namespace reanimated
