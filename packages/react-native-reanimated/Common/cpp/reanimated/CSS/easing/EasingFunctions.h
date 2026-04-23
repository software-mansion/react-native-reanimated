#pragma once

#include <reanimated/CSS/easing/cubicBezier.h>
#include <reanimated/CSS/easing/linear.h>
#include <reanimated/CSS/easing/steps.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using namespace facebook;

extern const std::unordered_map<std::string, EasingFunction> PREDEFINED_EASING_MAP;

EasingFunction getPredefinedEasingFunction(const std::string &name);
EasingFunction createParametrizedEasingFunction(jsi::Runtime &rt, const jsi::Object &easingConfig);
EasingFunction createParametrizedEasingFunction(const folly::dynamic &easingConfig);

EasingFunction createEasingFunction(jsi::Runtime &rt, const jsi::Value &easingConfig);
EasingFunction createEasingFunction(const folly::dynamic &easingConfig);

} // namespace reanimated::css
