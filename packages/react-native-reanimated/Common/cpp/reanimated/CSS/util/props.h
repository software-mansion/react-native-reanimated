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
  const jsi::Value oldProps;
  const jsi::Value newProps;
  const PropertyNames changedPropertyNames;
};

namespace {
// Private methods
bool areArraysDifferentRecursive(
    jsi::Runtime &rt,
    const jsi::Array &oldArray,
    const jsi::Array &newArray);

std::pair<jsi::Value, jsi::Value> getChangedPropsRecursive(
    jsi::Runtime &rt,
    const jsi::Value &oldProp,
    const jsi::Value &newProp);
} // anonymous namespace

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

void updateJSIObject(
    jsi::Runtime &rt,
    const jsi::Object &target,
    const jsi::Object &source);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
