#pragma once

#include <jsi/jsi.h>

namespace reanimated {

using namespace facebook;

std::vector<std::pair<double, jsi::Value>> parseJSIKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes);

} // namespace reanimated
