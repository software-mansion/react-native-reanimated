#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

namespace reanimated {

RecordPropertiesInterpolator::RecordPropertiesInterpolator(
    const InterpolatorFactoriesRecord &factories,
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : GroupPropertiesInterpolator(propertyPath, viewStylesRepository),
      factories_(factories) {}

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
    const jsi::Value &newStyleValue,
    const jsi::Value &previousValue,
    const jsi::Value &reversingAdjustedStartValue) {
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
            rt,
            getValue(oldStyleObject),
            getValue(newStyleObject),
            previousValue,
            reversingAdjustedStartValue);
  }
}

jsi::Value RecordPropertiesInterpolator::mapInterpolators(
    jsi::Runtime &rt,
    const std::function<jsi::Value(PropertyInterpolator &)> &callback) const {
  jsi::Object result(rt);

  for (const auto &[propName, interpolator] : interpolators_) {
    jsi::Value value = callback(*interpolator);
    result.setProperty(rt, propName.c_str(), value);
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
