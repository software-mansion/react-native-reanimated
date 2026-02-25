#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <jsi/jsi.h>
#include <string>

namespace reanimated::css {

double getDuration(jsi::Runtime &rt, const jsi::Object &config);

EasingFunction getTimingFunction(jsi::Runtime &rt, const jsi::Object &config);

double getDelay(jsi::Runtime &rt, const jsi::Object &config);

std::string
getCompoundComponentName(jsi::Runtime &rt, const jsi::Value &reactViewName, const jsi::Value &jsComponentName);
std::string
getCompoundComponentName(jsi::Runtime &rt, const std::string &nativeComponentName, const jsi::Value &jsComponentName);

} // namespace reanimated::css
