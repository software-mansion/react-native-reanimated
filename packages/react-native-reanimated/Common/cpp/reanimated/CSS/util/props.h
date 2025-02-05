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

bool isDiscreteProperty(const std::string &propName);

// We need to specify it here because there are 2 methods referencing
// each other in the recursion and areArraysDifferentRecursive must be
// aware that getChangedPropsRecursive exists
std::pair<jsi::Value, jsi::Value> getChangedPropsRecursive(
    jsi::Runtime &rt,
    const jsi::Value &oldProp,
    const jsi::Value &newProp);

ChangedProps getChangedProps(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps,
    const PropertyNames &allowedProperties);

void updateJSIObject(
    jsi::Runtime &rt,
    const jsi::Object &target,
    const jsi::Object &source);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
