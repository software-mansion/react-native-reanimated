#ifdef RCT_NEW_ARCH_ENABLED
#pragma once

#include <reanimated/CSS/easing/CubicBezierEasing.h>
#include <reanimated/CSS/easing/LinearParametrizedEasing.h>
#include <reanimated/CSS/easing/StepsEasing.h>

#include <jsi/jsi.h>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated {

using namespace facebook;

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

#endif // RCT_NEW_ARCH_ENABLED
