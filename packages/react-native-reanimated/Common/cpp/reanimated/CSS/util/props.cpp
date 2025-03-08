#include <reanimated/CSS/util/props.h>

namespace reanimated::css {

bool isDiscreteProperty(const std::string &propName) {
  const auto it = PROPERTY_INTERPOLATORS_CONFIG.find(propName);
  if (it == PROPERTY_INTERPOLATORS_CONFIG.end()) {
    return false;
  }
  return it->second->isDiscreteProperty();
}

bool areArraysDifferentRecursive(
    const folly::dynamic &oldArray,
    const folly::dynamic &newArray) {
  if (oldArray.size() != newArray.size()) {
    return true;
  }

  for (size_t i = 0; i < oldArray.size(); i++) {
    const auto [oldChangedProp, newChangedProp] =
        getChangedPropsRecursive(oldArray[i], newArray[i]);

    if (!oldChangedProp.isNull() || !newChangedProp.isNull()) {
      return true;
    }
  }

  return false;
}

std::pair<folly::dynamic, folly::dynamic> getChangedPropsRecursive(
    const folly::dynamic &oldProp,
    const folly::dynamic &newProp) {
  if (!oldProp.isObject() || !newProp.isObject()) {
    // Primitive values comparison
    if (oldProp != newProp) {
      return {oldProp, newProp};
    }
    return {folly::dynamic(), folly::dynamic()};
  }

  if (oldProp.isArray() && newProp.isArray()) {
    // Arrays comparison
    if (areArraysDifferentRecursive(oldProp, newProp)) {
      return {oldProp, newProp};
    }
    return {folly::dynamic(), folly::dynamic()};
  }

  folly::dynamic oldResult = folly::dynamic::object;
  folly::dynamic newResult = folly::dynamic::object;
  bool oldHasChanges = false;
  bool newHasChanges = false;

  // Check for removed properties
  for (const auto &item : oldProp.items()) {
    const auto &propName = item.first.asString();
    if (!newProp.count(propName)) {
      const auto &oldValue = item.second;
      oldResult[propName] = oldValue;
      oldHasChanges = true;
    }
  }

  // Check for new and changed properties
  for (const auto &item : newProp.items()) {
    const auto &propName = item.first.asString();
    const auto &newValue = item.second;

    if (oldProp.count(propName)) {
      const auto &oldValue = oldProp[propName];
      auto [oldChangedProp, newChangedProp] =
          getChangedPropsRecursive(oldValue, newValue);

      if (!oldChangedProp.isNull() && !newChangedProp.isNull()) {
        oldResult[propName] = std::move(oldChangedProp);
        newResult[propName] = std::move(newChangedProp);
        oldHasChanges = true;
        newHasChanges = true;
      }
    } else {
      newResult[propName] = newValue;
      newHasChanges = true;
    }
  }

  return {
      oldHasChanges ? std::move(oldResult) : folly::dynamic(),
      newHasChanges ? std::move(newResult) : folly::dynamic()};
}

std::pair<folly::dynamic, folly::dynamic> getChangedValueForProp(
    const folly::dynamic &oldObject,
    const folly::dynamic &newObject,
    const std::string &propName) {
  const bool oldHasProperty = oldObject.count(propName);
  const bool newHasProperty = newObject.count(propName);

  if (oldHasProperty && newHasProperty) {
    const auto &oldVal = oldObject[propName];
    const auto &newVal = newObject[propName];

    if (oldVal.isObject() && newVal.isObject()) {
      return getChangedPropsRecursive(oldVal, newVal);
    } else if (oldVal != newVal) {
      return {oldVal, newVal};
    }

    return {folly::dynamic(), folly::dynamic()};
  }

  if (oldHasProperty) {
    const auto &oldVal = oldObject[propName];
    return {oldVal, folly::dynamic()};
  } else if (newHasProperty) {
    const auto &newVal = newObject[propName];
    return {folly::dynamic(), newVal};
  }

  return {folly::dynamic(), folly::dynamic()};
}

ChangedProps getChangedProps(
    const folly::dynamic &oldProps,
    const folly::dynamic &newProps,
    const PropertyNames &allowedProperties) {
  folly::dynamic oldResult = folly::dynamic::object;
  folly::dynamic newResult = folly::dynamic::object;
  PropertyNames changedPropertyNames;

  for (const auto &propName : allowedProperties) {
    auto [oldChangedProp, newChangedProp] =
        getChangedValueForProp(oldProps, newProps, propName);

    const auto hasOldChangedProp = !oldChangedProp.isNull();
    const auto hasNewChangedProp = !newChangedProp.isNull();

    if (hasOldChangedProp) {
      oldResult[propName] = std::move(oldChangedProp);
    }
    if (hasNewChangedProp) {
      newResult[propName] = std::move(newChangedProp);
    }
    if (hasOldChangedProp || hasNewChangedProp) {
      changedPropertyNames.push_back(propName);
    }
  }

  return {
      std::move(oldResult),
      std::move(newResult),
      std::move(changedPropertyNames)};
}

} // namespace reanimated::css
