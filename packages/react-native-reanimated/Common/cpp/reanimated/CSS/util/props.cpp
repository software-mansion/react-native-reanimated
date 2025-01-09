#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/util/props.h>

namespace reanimated {

std::pair<TransformsMap, PropertyNames>
extractTransformsMapAndOrderedProperties(
    jsi::Runtime &rt,
    const jsi::Array &transformsArray) {
  TransformsMap transformMap;
  PropertyNames orderedPropertyNames;

  for (size_t i = 0; i < transformsArray.size(rt); ++i) {
    jsi::Value arrayElement = transformsArray.getValueAtIndex(rt, i);
    if (arrayElement.isObject()) {
      jsi::Object transformObject = arrayElement.asObject(rt);

      // Each transformObject has a single property
      auto propertyNames = transformObject.getPropertyNames(rt);
      if (propertyNames.size(rt) == 1) {
        auto propName =
            propertyNames.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
        transformMap[propName] =
            transformObject.getProperty(rt, propName.c_str());
        orderedPropertyNames.push_back(propName);
      }
    }
  }

  return {std::move(transformMap), std::move(orderedPropertyNames)};
}

std::pair<std::unique_ptr<jsi::Array>, std::unique_ptr<jsi::Array>>
getChangedTransforms(
    jsi::Runtime &rt,
    const jsi::Value &oldTransforms,
    const jsi::Value &newTransforms) {
  if (oldTransforms.isUndefined() && newTransforms.isUndefined()) {
    return std::make_pair(nullptr, nullptr);
  }

  if (oldTransforms.isUndefined()) {
    return std::make_pair(
        nullptr,
        std::make_unique<jsi::Array>(newTransforms.asObject(rt).asArray(rt)));
  }
  if (newTransforms.isUndefined()) {
    return std::make_pair(
        std::make_unique<jsi::Array>(oldTransforms.asObject(rt).asArray(rt)),
        nullptr);
  }

  auto oldArray = oldTransforms.asObject(rt).asArray(rt);
  auto newArray = newTransforms.asObject(rt).asArray(rt);

  if (oldArray.size(rt) != newArray.size(rt)) {
    return std::make_pair(
        std::make_unique<jsi::Array>(std::move(oldArray)),
        std::make_unique<jsi::Array>(std::move(newArray)));
  }

  for (size_t i = 0; i < oldArray.size(rt); i++) {
    const auto oldElement = oldArray.getValueAtIndex(rt, i);
    const auto newElement = newArray.getValueAtIndex(rt, i);

    if (oldElement.isObject() && newElement.isObject()) {
      const auto oldObj = oldElement.asObject(rt);
      const auto newObj = newElement.asObject(rt);

      auto oldPropNames = oldObj.getPropertyNames(rt);
      auto newPropNames = newObj.getPropertyNames(rt);

      const auto oldKey =
          oldPropNames.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
      const auto newKey =
          newPropNames.getValueAtIndex(rt, 0).asString(rt).utf8(rt);

      if (oldKey != newKey) {
        return std::make_pair(
            std::make_unique<jsi::Array>(std::move(oldArray)),
            std::make_unique<jsi::Array>(std::move(newArray)));
      }

      const auto &oldVal = oldObj.getProperty(rt, oldKey.c_str());
      const auto &newVal = newObj.getProperty(rt, newKey.c_str());

      if (!jsi::Value::strictEquals(rt, oldVal, newVal)) {
        return std::make_pair(
            std::make_unique<jsi::Array>(std::move(oldArray)),
            std::make_unique<jsi::Array>(std::move(newArray)));
      }
    } else {
      return std::make_pair(
          std::make_unique<jsi::Array>(std::move(oldArray)),
          std::make_unique<jsi::Array>(std::move(newArray)));
    }
  }

  return std::make_pair(nullptr, nullptr);
}

std::pair<PropertyValues, PropertyValues> getChangedPropsRecursive(
    jsi::Runtime &rt,
    jsi::Value &&oldProp,
    jsi::Value &&newProp) {
  if (!oldProp.isObject() || !newProp.isObject()) {
    if (!jsi::Value::strictEquals(rt, oldProp, newProp)) {
      return std::make_pair(
          std::make_unique<jsi::Value>(std::move(oldProp)),
          std::make_unique<jsi::Value>(std::move(newProp)));
    }
    return std::make_pair(nullptr, nullptr);
  }

  const auto oldObj = oldProp.asObject(rt);
  const auto newObj = newProp.asObject(rt);

  auto oldResult = std::make_unique<jsi::Object>(rt);
  auto newResult = std::make_unique<jsi::Object>(rt);
  bool oldHasChanges = false;
  bool newHasChanges = false;

  const auto newPropertyNames = newObj.getPropertyNames(rt);
  const auto oldPropertyNames = oldObj.getPropertyNames(rt);

  for (size_t i = 0; i < oldPropertyNames.size(rt); i++) {
    const auto propName =
        oldPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    if (!newObj.hasProperty(rt, propName.c_str())) {
      jsi::Value oldValue = oldObj.getProperty(rt, propName.c_str());
      if (!oldValue.isUndefined()) {
        oldResult->setProperty(rt, propName.c_str(), std::move(oldValue));
        oldHasChanges = true;
      }
    }
  }

  for (size_t i = 0; i < newPropertyNames.size(rt); i++) {
    const auto propName =
        newPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    jsi::Value newValue = newObj.getProperty(rt, propName.c_str());

    if (oldObj.hasProperty(rt, propName.c_str())) {
      jsi::Value oldValue = oldObj.getProperty(rt, propName.c_str());
      if (!oldValue.isUndefined() && !newValue.isUndefined()) {
        auto [oldChangedProp, newChangedProp] = getChangedPropsRecursive(
            rt, std::move(oldValue), std::move(newValue));
        if (oldChangedProp && newChangedProp) {
          oldResult->setProperty(rt, propName.c_str(), *oldChangedProp);
          newResult->setProperty(rt, propName.c_str(), *newChangedProp);
          oldHasChanges = true;
          newHasChanges = true;
        }
      }
    } else if (!newValue.isUndefined()) {
      newResult->setProperty(rt, propName.c_str(), std::move(newValue));
      newHasChanges = true;
    }
  }

  return std::make_pair(
      oldHasChanges ? std::make_unique<jsi::Value>(std::move(*oldResult))
                    : nullptr,
      newHasChanges ? std::make_unique<jsi::Value>(std::move(*newResult))
                    : nullptr);
}

std::pair<PropertyValues, PropertyValues> getChangedValueForProp(
    jsi::Runtime &rt,
    const jsi::Object &oldObject,
    const jsi::Object &newObject,
    const std::string &propName) {
  const bool oldHasProperty = oldObject.hasProperty(rt, propName.c_str());
  const bool newHasProperty = newObject.hasProperty(rt, propName.c_str());

  if (oldHasProperty && newHasProperty) {
    if (propName == "transform") {
      // Special case for transforms
      auto [oldResult, newResult] = getChangedTransforms(
          rt,
          oldObject.getProperty(rt, propName.c_str()),
          newObject.getProperty(rt, propName.c_str()));
      if (oldResult && newResult) {
        return std::make_pair(
            std::make_unique<jsi::Value>(std::move(*oldResult)),
            std::make_unique<jsi::Value>(std::move(*newResult)));
      }
      return std::make_pair(nullptr, nullptr);
    } else {
      auto oldVal = oldObject.getProperty(rt, propName.c_str());
      auto newVal = newObject.getProperty(rt, propName.c_str());

      if (oldVal.isObject() && newVal.isObject()) {
        return getChangedPropsRecursive(
            rt, std::move(oldVal), std::move(newVal));
      } else if (!jsi::Value::strictEquals(rt, oldVal, newVal)) {
        return std::make_pair(
            std::make_unique<jsi::Value>(std::move(oldVal)),
            std::make_unique<jsi::Value>(std::move(newVal)));
      }

      return std::make_pair(nullptr, nullptr);
    }
  }

  // Check for property existing in only one of the objects
  if (oldHasProperty) {
    jsi::Value oldVal = oldObject.getProperty(rt, propName.c_str());
    if (!oldVal.isUndefined()) {
      return std::make_pair(
          std::make_unique<jsi::Value>(std::move(oldVal)), nullptr);
    }
  } else if (newHasProperty) {
    jsi::Value newVal = newObject.getProperty(rt, propName.c_str());
    if (!newVal.isUndefined()) {
      return std::make_pair(
          nullptr, std::make_unique<jsi::Value>(std::move(newVal)));
    }
  }

  return std::make_pair(nullptr, nullptr);
}

ChangedProps processPropertyChanges(
    jsi::Runtime &rt,
    const jsi::Object &oldObject,
    const jsi::Object &newObject,
    const PropertyNames &propertyNames) {
  auto oldResult = std::make_unique<jsi::Object>(rt);
  auto newResult = std::make_unique<jsi::Object>(rt);
  PropertyNames changedPropertyNames;

  for (const auto &propName : propertyNames) {
    const auto [oldChangedProp, newChangedProp] =
        getChangedValueForProp(rt, oldObject, newObject, propName);

    if (oldChangedProp) {
      oldResult->setProperty(rt, propName.c_str(), *oldChangedProp);
    }
    if (newChangedProp) {
      newResult->setProperty(rt, propName.c_str(), *newChangedProp);
    }
    if (oldChangedProp || newChangedProp) {
      changedPropertyNames.push_back(propName);
    }
  }

  return {
      std::make_unique<jsi::Value>(std::move(*oldResult)),
      std::make_unique<jsi::Value>(std::move(*newResult)),
      std::move(changedPropertyNames)};
}

bool isDiscreteProperty(const std::string &propName) {
  const auto it = PROPERTY_INTERPOLATORS_CONFIG.find(propName);
  if (it == PROPERTY_INTERPOLATORS_CONFIG.end()) {
    return false;
  }
  return it->second->isDiscreteProperty();
}

ChangedProps getChangedProps(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps,
    const bool allowDiscrete) {
  const auto oldObject = oldProps.asObject(rt);
  const auto newObject = newProps.asObject(rt);

  const auto oldPropertyNames = oldObject.getPropertyNames(rt);
  const auto newPropertyNames = newObject.getPropertyNames(rt);

  std::unordered_set<std::string> allPropNames;

  for (size_t i = 0; i < oldPropertyNames.size(rt); i++) {
    const auto propName =
        oldPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    if (allowDiscrete || !isDiscreteProperty(propName)) {
      allPropNames.insert(propName);
    }
  }
  for (size_t i = 0; i < newPropertyNames.size(rt); i++) {
    const auto propName =
        newPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    if (allowDiscrete || !isDiscreteProperty(propName)) {
      allPropNames.insert(propName);
    }
  }

  PropertyNames propNamesVec(allPropNames.begin(), allPropNames.end());

  return processPropertyChanges(rt, oldObject, newObject, propNamesVec);
}

ChangedProps getChangedProps(
    jsi::Runtime &rt,
    const jsi::Value &oldProps,
    const jsi::Value &newProps,
    const bool allowDiscrete,
    const std::optional<PropertyNames> &propertyNames) {
  if (!propertyNames.has_value()) {
    return getChangedProps(rt, oldProps, newProps, allowDiscrete);
  }

  const auto &transitionProperties = propertyNames.value();
  PropertyNames propNamesVec;
  propNamesVec.reserve(transitionProperties.size());
  for (const auto &propName : transitionProperties) {
    if (allowDiscrete || !isDiscreteProperty(propName)) {
      propNamesVec.emplace_back(propName);
    }
  }

  return processPropertyChanges(
      rt,
      oldProps.asObject(rt),
      newProps.asObject(rt),
      std::move(propNamesVec));
}

void updateJSIObject(
    jsi::Runtime &rt,
    const jsi::Object &target,
    const jsi::Object &source) {
  const auto propertyNames = source.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt);
    const auto propertyValue = source.getProperty(rt, propertyName);
    target.setProperty(rt, propertyName, propertyValue);
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
