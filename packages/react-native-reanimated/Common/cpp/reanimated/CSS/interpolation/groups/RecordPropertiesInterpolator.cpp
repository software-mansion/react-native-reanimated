#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

namespace reanimated {

RecordPropertiesInterpolator::RecordPropertiesInterpolator(
    const InterpolatorFactoriesRecord &factories,
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : GroupPropertiesInterpolator(propertyPath, viewStylesRepository),
      factories_(factories) {}

bool RecordPropertiesInterpolator::equalsFirstKeyframeValue(
    jsi::Runtime &rt,
    const jsi::Value &propertyValue) const {
  const auto propertyValuesObject = propertyValue.asObject(rt);
  const auto propertyNames = propertyValuesObject.getPropertyNames(rt);
  const auto propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto propValue = propertyValuesObject.getProperty(
        rt, jsi::PropNameID::forUtf8(rt, propName));

    const auto interpolatorIt = interpolators_.find(propName);
    if (interpolatorIt == interpolators_.end() ||
        !interpolatorIt->second->equalsFirstKeyframeValue(rt, propValue)) {
      return false;
    }
  }

  return true;
}

void RecordPropertiesInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used  (for now, for simplicity, we only add new ones)
  const jsi::Object keyframesObject = keyframes.asObject(rt);

  jsi::Array propertyNames = keyframesObject.getPropertyNames(rt);
  size_t propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const std::string propertyName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const jsi::Value &propertyKeyframes = keyframesObject.getProperty(
        rt, jsi::PropNameID::forUtf8(rt, propertyName));

    maybeCreateInterpolator(propertyName);
    interpolators_.at(propertyName)->updateKeyframes(rt, propertyKeyframes);
  }
}

void RecordPropertiesInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used  (for now, for simplicity, we only add new ones)

  const auto oldStyleObject =
      oldStyleValue.isObject() ? oldStyleValue.asObject(rt) : jsi::Object(rt);
  const auto newStyleObject =
      newStyleValue.isObject() ? newStyleValue.asObject(rt) : jsi::Object(rt);

  std::unordered_set<std::string> propertyNamesSet;
  const jsi::Object *objects[] = {&oldStyleObject, &newStyleObject};
  for (const auto *styleObject : objects) {
    const auto propertyNames = styleObject->getPropertyNames(rt);
    for (size_t i = 0; i < propertyNames.size(rt); ++i) {
      propertyNamesSet.insert(
          propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt));
    }
  }

  for (const auto &propertyName : propertyNamesSet) {
    maybeCreateInterpolator(propertyName);

    auto getValue = [&](const jsi::Object &obj) {
      return obj.hasProperty(rt, propertyName.c_str())
          ? obj.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName))
          : jsi::Value::undefined();
    };

    interpolators_.at(propertyName)
        ->updateKeyframesFromStyleChange(
            rt, getValue(oldStyleObject), getValue(newStyleObject));
  }
}

folly::dynamic RecordPropertiesInterpolator::mapInterpolators(
    const std::function<folly::dynamic(PropertyInterpolator &)> &callback)
    const {
  folly::dynamic result = folly::dynamic::object;

  for (const auto &[propName, interpolator] : interpolators_) {
    result[propName] = callback(*interpolator);
  }

  return result;
}

void RecordPropertiesInterpolator::maybeCreateInterpolator(
    const std::string &propertyName) {
  if (interpolators_.find(propertyName) == interpolators_.end()) {
    const auto newInterpolator = createPropertyInterpolator(
        propertyName, propertyPath_, factories_, viewStylesRepository_);
    interpolators_.emplace(propertyName, newInterpolator);
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
