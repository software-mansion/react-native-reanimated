#pragma once

#include <jsi/jsi.h>

#include <string>
#include <vector>

using namespace facebook;

namespace reanimated {

std::vector<std::string> getChangedProps(
    const jsi::Runtime &rt,
    const std::vector<std::string> propertyNames,
    const jsi::Value &oldProps,
    const jsi::Value &newProps);

}; // namespace reanimated
