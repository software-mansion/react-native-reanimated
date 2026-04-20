#pragma once

#include <jsi/jsi.h>
#include <reanimated/CSS/easing/EasingConfigs.h>

#include <string>
#include <utility>

namespace reanimated::css {

double getDuration(jsi::Runtime &rt, const jsi::Object &config);

EasingConfig getEasingConfig(jsi::Runtime &rt, const jsi::Object &config);

double getDelay(jsi::Runtime &rt, const jsi::Object &config);

std::pair<std::string, std::string> splitCompoundComponentName(const std::string &compoundComponentName);

} // namespace reanimated::css
