#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <jsi/jsi.h>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;

std::vector<std::pair<double, jsi::Value>> parseJSIKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
