#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/config/PropertyInterpolatorsConfig.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>

namespace reanimated {

using TransformsMap = std::unordered_map<std::string, jsi::Value>;

struct ChangedProps {
  const PropertyValues oldProps;
  const PropertyValues newProps;
  const PropertyNames changedPropertyNames;
};

std::pair<TransformsMap, PropertyNames>
extractTransformsMapAndOrderedProperties(
    jsi::Runtime &rt,
    const jsi::Array &transformsArray);

ChangedProps getChangedProps(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps,
    bool allowDiscrete,
    const std::optional<PropertyNames> &propertyNames);
ChangedProps getChangedProps(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps,
    bool allowDiscrete);

}; // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
