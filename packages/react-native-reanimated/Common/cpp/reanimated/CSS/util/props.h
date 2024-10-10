#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <jsi/jsi.h>
#include <unordered_map>
#include <unordered_set>

using namespace facebook;

namespace reanimated {

using TransformsMap = std::unordered_map<std::string, jsi::Value>;

struct ChangedProps {
  PropertyValues oldProps;
  PropertyValues newProps;
  PropertyNames changedPropertyNames;
};

std::pair<TransformsMap, PropertyNames>
extractTransformsMapAndOrderedProperties(
    jsi::Runtime &rt,
    const jsi::Array &transformsArray);

ChangedProps getChangedProps(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps,
    const std::optional<PropertyNames> &propertyNames);
ChangedProps getChangedProps(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps);

}; // namespace reanimated
