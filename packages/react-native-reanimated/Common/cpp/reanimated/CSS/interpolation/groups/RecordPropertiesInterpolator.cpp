#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

RecordPropertiesInterpolator::RecordPropertiesInterpolator(
    const InterpolatorFactoriesRecord &factories,
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : GroupPropertiesInterpolator(propertyPath, viewStylesRepository), factories_(factories) {}

void RecordPropertiesInterpolator::updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used (for now, for simplicity, we only add new ones)
  const jsi::Object keyframesObject = keyframes.asObject(rt);

  jsi::Array propertyNames = keyframesObject.getPropertyNames(rt);
  size_t propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const std::string propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const jsi::Value &propertyKeyframes = keyframesObject.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));

    maybeCreateInterpolator(propertyName);
    interpolators_[propertyName]->updateKeyframes(rt, propertyKeyframes);
  }
}

bool RecordPropertiesInterpolator::updateKeyframes(const folly::dynamic &fromValue, const folly::dynamic &toValue) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used (for now, for simplicity, we only add new ones)
  const folly::dynamic emptyObject = folly::dynamic::object();
  const auto null = folly::dynamic();

  const auto &fromObj = fromValue.empty() ? emptyObject : fromValue;
  const auto &toObj = toValue.empty() ? emptyObject : toValue;

  std::unordered_set<std::string> propertyNamesSet;
  for (const auto &key : fromObj.keys()) {
    propertyNamesSet.insert(key.asString());
  }
  for (const auto &key : toObj.keys()) {
    propertyNamesSet.insert(key.asString());
  }

  bool areAllPropsReversed = true;

  for (const auto &propertyName : propertyNamesSet) {
    maybeCreateInterpolator(propertyName);
    areAllPropsReversed &= interpolators_[propertyName]->updateKeyframes(
        fromObj.getDefault(propertyName, null), toObj.getDefault(propertyName, null));
  }

  return areAllPropsReversed;
}

folly::dynamic RecordPropertiesInterpolator::mapInterpolators(
    const std::function<folly::dynamic(PropertyInterpolator &)> &callback) const {
  folly::dynamic result = folly::dynamic::object;

  for (const auto &[propertyName, interpolator] : interpolators_) {
    const auto value = callback(*interpolator);
    if (!value.isNull()) {
      result[propertyName] = value;
    }
  }

  return result;
}

void RecordPropertiesInterpolator::maybeCreateInterpolator(const std::string &propertyName) {
  if (interpolators_.find(propertyName) == interpolators_.end()) {
    const auto newInterpolator =
        createPropertyInterpolator(propertyName, propertyPath_, factories_, viewStylesRepository_);
    interpolators_.emplace(propertyName, newInterpolator);
  }
}

} // namespace reanimated::css
