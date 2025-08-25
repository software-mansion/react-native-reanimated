#pragma once

#include <jsi/jsi.h>
#include <utility>
#include <vector>

namespace reanimated::css {

using namespace facebook;

std::vector<std::pair<double, jsi::Value>> parseJSIKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes);

} // namespace reanimated::css
