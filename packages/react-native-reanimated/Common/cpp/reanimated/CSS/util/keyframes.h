#pragma once

#include <jsi/jsi.h>

using namespace facebook;

namespace reanimated {

std::vector<std::pair<double, jsi::Value>> parseJSIKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes);

} // namespace reanimated
