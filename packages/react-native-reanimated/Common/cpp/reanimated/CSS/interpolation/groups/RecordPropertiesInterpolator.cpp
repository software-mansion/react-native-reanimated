#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

namespace reanimated::css {

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
    const folly::dynamic &keyframes) {
  // TODO - maybe add a possibility to remove interpolators that are no
  // longer used  (for now, for simplicity, we only add new ones)
  for (const auto &item : keyframes.items()) {
    const auto &propName = item.first.getString();
    const auto &propValue = item.second;

    maybeCreateInterpolator(propName);
    interpolators_[propName]->updateKeyframes(propValue);
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
    interpolators_[propertyName]->updateKeyframesFromStyleChange(
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
    const auto value = callback(*interpolator);
    if (!value.isNull()) {
      result[propertyName] = value;
    }
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

} // namespace reanimated::css
