#pragma once

#include <reanimated/CSS/easing/cubicBezier.h>
#include <reanimated/CSS/easing/linear.h>
#include <reanimated/CSS/easing/steps.h>

#include <jsi/jsi.h>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated::css {

using namespace facebook;

extern const std::unordered_map<std::string, Easing> PREDEFINED_EASING_MAP;

Easing getPredefinedEasingFunction(const std::string &name);
Easing createParametrizedEasingFunction(
    jsi::Runtime &rt,
    const jsi::Object &easingConfig);

Easing createEasingFunction(jsi::Runtime &rt, const jsi::Value &easingConfig);

} // namespace reanimated::css
