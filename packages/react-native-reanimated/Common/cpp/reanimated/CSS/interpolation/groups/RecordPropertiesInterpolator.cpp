#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

namespace reanimated {

RecordPropertiesInterpolator::RecordPropertiesInterpolator(
    const InterpolatorFactoriesRecord &factories,
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : GroupPropertiesInterpolator(propertyPath, viewStylesRepository),
      factories_(factories) {}

bool RecordPropertiesInterpolator::equalsReversingAdjustedStartValue(
    const folly::dynamic &propertyValue) const {
  return std::ranges::all_of(propertyValue.items(), [this](const auto &item) {
    const auto &[propName, propValue] = item;
    const auto it = interpolators_.find(propName.getString());
    return it != interpolators_.end() &&
        it->second->equalsReversingAdjustedStartValue(propValue);
  });
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
    const folly::dynamic &oldStyleValue,
    const folly::dynamic &newStyleValue,
    const folly::dynamic &lastUpdateValue) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used  (for now, for simplicity, we only add new ones)
  const folly::dynamic empty = folly::dynamic::object();
  const folly::dynamic &oldStyleObject =
      !oldStyleValue.empty() ? oldStyleValue : empty;
  const folly::dynamic &newStyleObject =
      !newStyleValue.empty() ? newStyleValue : empty;
  const folly::dynamic &lastUpdateObject =
      !lastUpdateValue.empty() ? lastUpdateValue : empty;

  std::unordered_set<std::string> propertyNamesSet;
  for (const auto &key : oldStyleObject.keys()) {
    propertyNamesSet.insert(key.asString());
  }
  for (const auto &key : newStyleObject.keys()) {
    propertyNamesSet.insert(key.asString());
  }

  for (const auto &propertyName : propertyNamesSet) {
    maybeCreateInterpolator(propertyName);
    interpolators_.at(propertyName)
        ->updateKeyframesFromStyleChange(
            oldStyleObject.getDefault(propertyName, empty),
            newStyleObject.getDefault(propertyName, empty),
            lastUpdateObject.getDefault(propertyName, empty));
  }
}

folly::dynamic RecordPropertiesInterpolator::mapInterpolators(
    const std::function<folly::dynamic(PropertyInterpolator &)> &callback)
    const {
  folly::dynamic result = folly::dynamic::object;

  for (const auto &[propertyName, interpolator] : interpolators_) {
    result[propertyName] = callback(*interpolator);
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
