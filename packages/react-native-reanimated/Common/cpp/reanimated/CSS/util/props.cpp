#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/util/props.h>

namespace reanimated {

bool isDiscreteProperty(const std::string &propName) {
  const auto it = PROPERTY_INTERPOLATORS_CONFIG.find(propName);
  if (it == PROPERTY_INTERPOLATORS_CONFIG.end()) {
    return false;
  }
  return it->second->isDiscreteProperty();
}

bool areArraysDifferentRecursive(
    jsi::Runtime &rt,
    const jsi::Array &oldArray,
    const jsi::Array &newArray) {
  const auto oldArraySize = oldArray.size(rt);
  const auto newArraySize = newArray.size(rt);

  if (oldArraySize != newArraySize) {
    return true;
  }

  for (size_t i = 0; i < oldArraySize; i++) {
    const auto oldValue = oldArray.getValueAtIndex(rt, i);
    const auto newValue = newArray.getValueAtIndex(rt, i);

    const auto [oldChangedProp, newChangedProp] =
        getChangedPropsRecursive(rt, oldValue, newValue);

    if (!oldChangedProp.isUndefined() || !newChangedProp.isUndefined()) {
      return true;
    }
  }

  return false;
}

std::pair<jsi::Value, jsi::Value> getChangedPropsRecursive(
    jsi::Runtime &rt,
    const jsi::Value &oldProp,
    const jsi::Value &newProp) {
  if (!oldProp.isObject() || !newProp.isObject()) {
    // Primitive values comparison
    if (!jsi::Value::strictEquals(rt, oldProp, newProp)) {
      return {jsi::Value(rt, oldProp), jsi::Value(rt, newProp)};
    }
    return {jsi::Value::undefined(), jsi::Value::undefined()};
  }

  const auto oldObj = oldProp.asObject(rt);
  const auto newObj = newProp.asObject(rt);

  if (oldObj.isArray(rt) && newObj.isArray(rt)) {
    // Arrays comparison
    if (areArraysDifferentRecursive(
            rt, oldObj.asArray(rt), newObj.asArray(rt))) {
      return {jsi::Value(rt, oldObj), jsi::Value(rt, newObj)};
    }
    return {jsi::Value::undefined(), jsi::Value::undefined()};
  }

  auto oldResult = jsi::Object(rt);
  auto newResult = jsi::Object(rt);
  bool oldHasChanges = false;
  bool newHasChanges = false;

  const auto newPropertyNames = newObj.getPropertyNames(rt);
  const auto oldPropertyNames = oldObj.getPropertyNames(rt);

  // Diff on objects
  for (size_t i = 0; i < oldPropertyNames.size(rt); i++) {
    const auto propName =
        oldPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);

    if (!newObj.hasProperty(rt, propName.c_str())) {
      const auto oldValue = oldObj.getProperty(rt, propName.c_str());
      if (!oldValue.isUndefined()) {
        oldResult.setProperty(rt, propName.c_str(), oldValue);
        oldHasChanges = true;
      }
    }
  }

  for (size_t i = 0; i < newPropertyNames.size(rt); i++) {
    const auto propName =
        newPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto newValue = newObj.getProperty(rt, propName.c_str());

    if (oldObj.hasProperty(rt, propName.c_str())) {
      const auto oldValue = oldObj.getProperty(rt, propName.c_str());

      if (!oldValue.isUndefined() && !newValue.isUndefined()) {
        auto [oldChangedProp, newChangedProp] =
            getChangedPropsRecursive(rt, oldValue, newValue);

        if (!oldChangedProp.isUndefined() && !newChangedProp.isUndefined()) {
          oldResult.setProperty(rt, propName.c_str(), oldChangedProp);
          newResult.setProperty(rt, propName.c_str(), newChangedProp);
          oldHasChanges = true;
          newHasChanges = true;
        }
      }
    } else if (!newValue.isUndefined()) {
      newResult.setProperty(rt, propName.c_str(), newValue);
      newHasChanges = true;
    }
  }

  return std::make_pair(
      oldHasChanges ? jsi::Value(rt, oldResult) : jsi::Value::undefined(),
      newHasChanges ? jsi::Value(rt, newResult) : jsi::Value::undefined());
}

std::pair<jsi::Value, jsi::Value> getChangedValueForProp(
    jsi::Runtime &rt,
    const jsi::Object &oldObject,
    const jsi::Object &newObject,
    const std::string &propName) {
  const bool oldHasProperty = oldObject.hasProperty(rt, propName.c_str());
  const bool newHasProperty = newObject.hasProperty(rt, propName.c_str());

  if (oldHasProperty && newHasProperty) {
    const auto oldVal = oldObject.getProperty(rt, propName.c_str());
    const auto newVal = newObject.getProperty(rt, propName.c_str());

    if (oldVal.isObject() && newVal.isObject()) {
      return getChangedPropsRecursive(rt, oldVal, newVal);
    } else if (!jsi::Value::strictEquals(rt, oldVal, newVal)) {
      return std::make_pair(jsi::Value(rt, oldVal), jsi::Value(rt, newVal));
    }

    return std::make_pair(jsi::Value::undefined(), jsi::Value::undefined());
  }

  // Check if property exists in only one of the objects
  if (oldHasProperty) {
    jsi::Value oldVal = oldObject.getProperty(rt, propName.c_str());
    if (!oldVal.isUndefined()) {
      return std::make_pair(jsi::Value(rt, oldVal), jsi::Value::undefined());
    }
  } else if (newHasProperty) {
    jsi::Value newVal = newObject.getProperty(rt, propName.c_str());
    if (!newVal.isUndefined()) {
      return std::make_pair(jsi::Value::undefined(), jsi::Value(rt, newVal));
    }
  }

  return std::make_pair(jsi::Value::undefined(), jsi::Value::undefined());
}

ChangedProps getChangedProps(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps,
    const PropertyNames &allowedProperties) {
  const auto oldObject = oldProps.asObject(rt);
  const auto newObject = newProps.asObject(rt);

  auto oldResult = jsi::Object(rt);
  auto newResult = jsi::Object(rt);
  PropertyNames changedPropertyNames;

  for (const auto &propName : allowedProperties) {
    const auto [oldChangedProp, newChangedProp] =
        getChangedValueForProp(rt, oldObject, newObject, propName);

    const auto hasOldChangedProp = !oldChangedProp.isUndefined();
    const auto hasNewChangedProp = !newChangedProp.isUndefined();

    if (hasOldChangedProp) {
      oldResult.setProperty(rt, propName.c_str(), oldChangedProp);
    }
    if (hasNewChangedProp) {
      newResult.setProperty(rt, propName.c_str(), newChangedProp);
    }
    if (hasOldChangedProp || hasNewChangedProp) {
      changedPropertyNames.push_back(propName);
    }
  }

  return {
      jsi::Value(rt, oldResult),
      jsi::Value(rt, newResult),
      std::move(changedPropertyNames)};
}

void updateJSIObject(
    jsi::Runtime &rt,
    const jsi::Object &target,
    const jsi::Object &source) {
  const auto propertyNames = source.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt);
    target.setProperty(rt, propertyName, source.getProperty(rt, propertyName));
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
