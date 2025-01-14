#ifdef RCT_NEW_ARCH_ENABLED
#pragma once

#include <reanimated/CSS/easing/cubicBezier.h>
#include <reanimated/CSS/easing/linear.h>
#include <reanimated/CSS/easing/steps.h>

#include <jsi/jsi.h>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated {

using namespace facebook;

extern const std::unordered_map<std::string, EasingFunction>
    PREDEFINED_EASING_MAP;

EasingFunction getPredefinedEasingFunction(const std::string &name);
EasingFunction createParametrizedEasingFunction(
    jsi::Runtime &rt,
    const jsi::Object &easingConfig);

EasingFunction createEasingFunction(
    jsi::Runtime &rt,
    const jsi::Value &easingConfig);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
