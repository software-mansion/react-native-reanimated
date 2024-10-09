#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <jsi/jsi.h>
#include <unordered_map>

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
