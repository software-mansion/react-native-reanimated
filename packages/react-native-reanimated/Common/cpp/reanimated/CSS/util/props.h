#pragma once

#include <jsi/jsi.h>

#include <string>
#include <unordered_map>
#include <vector>

using namespace facebook;

namespace reanimated {

using TransformsMap = std::unordered_map<std::string, jsi::Value>;

std::pair<TransformsMap, std::vector<std::string>>
extractTransformsMapAndOrderedProperties(
    jsi::Runtime &rt,
    const jsi::Array &transformArray);

jsi::Value getChangedProps(
    jsi::Runtime &rt,
    const std::vector<std::string> &propertyNames,
    const jsi::Value &oldProps,
    const jsi::Value &newProps);

}; // namespace reanimated
