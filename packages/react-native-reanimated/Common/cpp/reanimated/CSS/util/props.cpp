#include <reanimated/CSS/util/props.h>

namespace reanimated {

std::pair<TransformsMap, std::vector<std::string>>
extractTransformsMapAndOrderedProperties(
    jsi::Runtime &rt,
    const jsi::Array &transformArray) {
  TransformsMap transformMap;
  std::vector<std::string> orderedPropertyNames;

  for (size_t i = 0; i < transformArray.size(rt); ++i) {
    jsi::Value arrayElement = transformArray.getValueAtIndex(rt, i);
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

jsi::Value getChangedPropsRecursive(
    jsi::Runtime &rt,
    const jsi::Value &oldProp,
    jsi::Value newProp) {
  // If either value is not an object, directly compare them
  if (!oldProp.isObject() || !newProp.isObject()) {
    if (!jsi::Value::strictEquals(rt, oldProp, newProp)) {
      return newProp;
    }
    return jsi::Value::undefined();
  }

  // Recursively compare nested objects
  const auto oldObj = oldProp.asObject(rt);
  const auto newObj = newProp.asObject(rt);

  auto result = jsi::Object(rt);
  bool allUndefined = true;

  const auto newPropertyNames = newObj.getPropertyNames(rt);
  const auto oldPropertyNames = oldObj.getPropertyNames(rt);

  // Mark all props removed in the new object as undefined
  const auto oldPropertyCount = oldPropertyNames.size(rt);
  for (size_t i = 0; i < oldPropertyCount; i++) {
    const auto propName =
        oldPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    if (!newObj.hasProperty(rt, propName.c_str())) {
      result.setProperty(rt, propName.c_str(), jsi::Value::undefined());
      allUndefined = false;
    }
  }

  // Iterate over all properties in the new object
  const auto newPropertyCount = newPropertyNames.size(rt);
  for (size_t i = 0; i < newPropertyCount; i++) {
    const auto propName =
        newPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto oldHasProperty = oldObj.hasProperty(rt, propName.c_str());
    const auto newHasProperty = newObj.hasProperty(rt, propName.c_str());

    if (oldHasProperty && newHasProperty) {
      const auto changedProps = getChangedPropsRecursive(
          rt,
          oldObj.getProperty(rt, propName.c_str()),
          newObj.getProperty(rt, propName.c_str()));
      if (!changedProps.isUndefined()) {
        result.setProperty(rt, propName.c_str(), changedProps);
        allUndefined = false;
      }
    } else if (oldHasProperty != newHasProperty) {
      result.setProperty(
          rt, propName.c_str(), newObj.getProperty(rt, propName.c_str()));
      allUndefined = false;
    }
  }

  if (allUndefined) {
    return jsi::Value::undefined();
  }
  return result;
}

jsi::Value getChangedTransforms(
    jsi::Runtime &rt,
    const jsi::Value &oldTransform,
    const jsi::Value &newTransform) {
  auto oldArray = oldTransform.asObject(rt).asArray(rt);
  auto newArray = newTransform.asObject(rt).asArray(rt);

  auto [oldTransformMap, oldOrder] =
      extractTransformsMapAndOrderedProperties(rt, oldArray);
  auto [newTransformMap, newOrder] =
      extractTransformsMapAndOrderedProperties(rt, newArray);

  std::vector<std::pair<std::string, jsi::Value>> changedTransforms;

  const auto oldSize = oldOrder.size();
  const auto newSize = newOrder.size();
  size_t i = 0, j = 0;

  while (i < oldSize && j < newSize) {
    if (newTransformMap.find(oldOrder[i]) == newTransformMap.end()) {
      changedTransforms.emplace_back(oldOrder[i], jsi::Value::undefined());
      i++;
      continue;
    }
    if (oldTransformMap.find(newOrder[j]) == oldTransformMap.end()) {
      changedTransforms.emplace_back(
          newOrder[j], std::move(newTransformMap[newOrder[j]]));
      j++;
      continue;
    }
    if (!jsi::Value::strictEquals(
            rt, oldTransformMap[oldOrder[i]], newTransformMap[newOrder[j]])) {
      changedTransforms.emplace_back(
          newOrder[j], std::move(newTransformMap[newOrder[j]]));
    }
    i++;
    j++;
  }

  for (; i < oldSize; i++) {
    changedTransforms.emplace_back(oldOrder[i], jsi::Value::undefined());
  }
  for (; j < newSize; j++) {
    changedTransforms.emplace_back(
        newOrder[j], std::move(newTransformMap[newOrder[j]]));
  }

  if (changedTransforms.size() == 0) {
    return jsi::Value::undefined();
  }

  auto result = jsi::Array(rt, changedTransforms.size());
  for (size_t i = 0; i < changedTransforms.size(); i++) {
    auto &[propName, propValue] = changedTransforms[i];
    auto obj = jsi::Object(rt);
    obj.setProperty(rt, propName.c_str(), propValue);
    result.setValueAtIndex(rt, i, obj);
  }

  return result;
}

jsi::Value getChangedProps(
    jsi::Runtime &rt,
    const std::vector<std::string> &propertyNames,
    const jsi::Value &oldProps,
    const jsi::Value &newProps) {
  const auto oldObject = oldProps.asObject(rt);
  const auto newObject = newProps.asObject(rt);

  auto result = jsi::Object(rt);
  bool allUndefined = true;

  // Iterate over all property names that need to be checked
  for (const auto &propertyName : propertyNames) {
    const auto propStr = propertyName.c_str();
    const bool oldHasProperty = oldObject.hasProperty(rt, propStr);
    const bool newHasProperty = newObject.hasProperty(rt, propStr);

    if (oldHasProperty && newHasProperty) {
      jsi::Value changedProps;

      if (propertyName == "transform") {
        changedProps = getChangedTransforms(
            rt,
            oldObject.getProperty(rt, propStr),
            newObject.getProperty(rt, propStr));
      } else {
        changedProps = getChangedPropsRecursive(
            rt,
            oldObject.getProperty(rt, propStr),
            newObject.getProperty(rt, propStr));
      }

      if (!changedProps.isUndefined()) {
        allUndefined = false;
        result.setProperty(rt, propStr, changedProps);
      }
    } else if (oldHasProperty != newHasProperty) {
      allUndefined = false;
      result.setProperty(rt, propStr, newObject.getProperty(rt, propStr));
    }
  }

  if (allUndefined) {
    return jsi::Value::undefined();
  }
  return result;
}

} // namespace reanimated
