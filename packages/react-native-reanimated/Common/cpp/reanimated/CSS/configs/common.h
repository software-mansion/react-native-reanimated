#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <string>
#include <utility>

namespace reanimated::css {

double getDuration(jsi::Runtime &rt, const jsi::Object &config);
double getDuration(const folly::dynamic &config);

EasingFunction getTimingFunction(jsi::Runtime &rt, const jsi::Object &config);
EasingFunction getTimingFunction(const folly::dynamic &config);

double getDelay(jsi::Runtime &rt, const jsi::Object &config);
double getDelay(const folly::dynamic &config);

std::pair<std::string, std::string> splitCompoundComponentName(const std::string &compoundComponentName);

} // namespace reanimated::css
