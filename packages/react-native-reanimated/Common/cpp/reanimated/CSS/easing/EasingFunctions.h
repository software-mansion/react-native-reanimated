#pragma once

#include <reanimated/CSS/easing/cubicBezier.h>
#include <reanimated/CSS/easing/linear.h>
#include <reanimated/CSS/easing/steps.h>

#include <folly/dynamic.h>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated::css {

using namespace facebook;

extern const std::unordered_map<std::string, EasingFunction>
    PREDEFINED_EASING_MAP;

EasingFunction getPredefinedEasingFunction(const std::string &name);
EasingFunction createParametrizedEasingFunction(
    const folly::dynamic &easingConfig);

EasingFunction createEasingFunction(const folly::dynamic &easingConfig);

} // namespace reanimated::css
