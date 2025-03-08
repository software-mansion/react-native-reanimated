#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/config/PropertyInterpolatorsConfig.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>

namespace reanimated::css {

struct ChangedProps {
  const folly::dynamic oldProps;
  const folly::dynamic newProps;
  const PropertyNames changedPropertyNames;
};

bool isDiscreteProperty(const std::string &propName);

// We need to specify it here because there are 2 methods referencing
// each other in the recursion and areArraysDifferentRecursive must be
// aware that getChangedPropsRecursive exists
std::pair<folly::dynamic, folly::dynamic> getChangedPropsRecursive(
    const folly::dynamic &oldProp,
    const folly::dynamic &newProp);

ChangedProps getChangedProps(
    const folly::dynamic &oldProps,
    const folly::dynamic &newProps,
    const PropertyNames &allowedProperties);

} // namespace reanimated::css
