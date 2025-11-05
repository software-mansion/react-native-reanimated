#include <reanimated/CSS/utils/props.h>

#include <string>
#include <utility>

namespace reanimated::css {

bool isDiscreteProperty(const std::string &propName, const std::string &componentName) {
  const auto &interpolators = getComponentInterpolators(componentName);
  const auto it = interpolators.find(propName);
  if (it == interpolators.end()) {
    return false;
  }
  return it->second->isDiscreteProperty();
}

bool areArraysDifferentRecursive(const folly::dynamic &oldArray, const folly::dynamic &newArray) {
  if (oldArray.size() != newArray.size()) {
    return true;
  }

  for (size_t i = 0; i < oldArray.size(); i++) {
    const auto [oldChangedProp, newChangedProp] = getChangedPropsRecursive(oldArray[i], newArray[i]);

    // If any of the values is present, that means that the new value must be different from the old one.
    // In such a case, we return true as arrays aren't the same.
    if (oldChangedProp.has_value() || newChangedProp.has_value()) {
      return true;
    }
  }

  return false;
}

std::pair<std::optional<folly::dynamic>, std::optional<folly::dynamic>> getChangedPropsRecursive(
    const folly::dynamic &oldProp,
    const folly::dynamic &newProp) {
  if (!oldProp.isObject() || !newProp.isObject()) {
    // Primitive values comparison
    if (oldProp != newProp) {
      return {oldProp, newProp};
    }
    return {std::nullopt, std::nullopt};
  }

  if (oldProp.isArray() && newProp.isArray()) {
    // Arrays comparison
    if (areArraysDifferentRecursive(oldProp, newProp)) {
      return {oldProp, newProp};
    }
    return {std::nullopt, std::nullopt};
  }

  folly::dynamic oldResult = folly::dynamic::object;
  folly::dynamic newResult = folly::dynamic::object;

  // Check for removed properties
  for (const auto &item : oldProp.items()) {
    const auto &propName = item.first.asString();
    if (!newProp.count(propName)) {
      oldResult[propName] = item.second;
    }
  }

  // Check for new and changed properties
  for (const auto &item : newProp.items()) {
    const auto &propName = item.first.asString();
    const auto &newValue = item.second;

    if (oldProp.count(propName)) {
      auto [oldChangedProp, newChangedProp] = getChangedPropsRecursive(oldProp[propName], newValue);

      if (oldChangedProp.has_value()) {
        oldResult[propName] = std::move(oldChangedProp.value());
      }
      if (newChangedProp.has_value()) {
        newResult[propName] = std::move(newChangedProp.value());
      }
    } else {
      newResult[propName] = newValue;
    }
  }

  return {
      oldResult.empty() ? std::nullopt : std::make_optional(std::move(oldResult)),
      newResult.empty() ? std::nullopt : std::make_optional(std::move(newResult))};
}

std::pair<std::optional<folly::dynamic>, std::optional<folly::dynamic>>
getChangedValueForProp(const folly::dynamic &oldObject, const folly::dynamic &newObject, const std::string &propName) {
  const bool oldHasProperty = oldObject.count(propName);
  const bool newHasProperty = newObject.count(propName);

  if (oldHasProperty && newHasProperty) {
    const auto &oldVal = oldObject[propName];
    const auto &newVal = newObject[propName];

    if (oldVal.isObject() && newVal.isObject()) {
      return getChangedPropsRecursive(oldVal, newVal);
    }
    if (oldVal != newVal) {
      return {oldVal, newVal};
    }

    return {std::nullopt, std::nullopt};
  }

  if (oldHasProperty) {
    return {oldObject[propName], std::nullopt};
  }
  if (newHasProperty) {
    return {std::nullopt, newObject[propName]};
  }

  return {std::nullopt, std::nullopt};
}

ChangedProps getChangedProps(
    const folly::dynamic &oldProps,
    const folly::dynamic &newProps,
    const PropertyNames &allowedProperties) {
  folly::dynamic oldResult = folly::dynamic::object;
  folly::dynamic newResult = folly::dynamic::object;
  PropertyNames changedPropertyNames;

  for (const auto &propName : allowedProperties) {
    auto [oldChangedProp, newChangedProp] = getChangedValueForProp(oldProps, newProps, propName);

    if (oldChangedProp.has_value()) {
      oldResult[propName] = std::move(oldChangedProp.value());
    }
    if (newChangedProp.has_value()) {
      newResult[propName] = std::move(newChangedProp.value());
    }
    if (oldChangedProp.has_value() || newChangedProp.has_value()) {
      changedPropertyNames.push_back(propName);
    }
  }

  return {std::move(oldResult), std::move(newResult), std::move(changedPropertyNames)};
}

} // namespace reanimated::css
