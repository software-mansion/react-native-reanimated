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

bool RecordPropertiesInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &fromValue,
    const jsi::Value &toValue) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used (for now, for simplicity, we only add new ones)
  const auto fromObject = fromValue.isUndefined() ? jsi::Object(rt) : fromValue.asObject(rt);
  const auto toObject = toValue.isUndefined() ? jsi::Object(rt) : toValue.asObject(rt);

  const auto fromPropertyNames = fromObject.getPropertyNames(rt);
  const auto toPropertyNames = toObject.getPropertyNames(rt);
  const auto fromSize = fromPropertyNames.size(rt);
  const auto toSize = toPropertyNames.size(rt);

  std::unordered_set<std::string> propertyNamesSet;
  for (size_t i = 0; i < fromSize; ++i) {
    propertyNamesSet.insert(fromPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt));
  }
  for (size_t i = 0; i < toSize; ++i) {
    propertyNamesSet.insert(toPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt));
  }

  bool areAllPropsReversed = true;

  for (const auto &propertyName : propertyNamesSet) {
    maybeCreateInterpolator(propertyName);
    const auto propNameID = jsi::PropNameID::forUtf8(rt, propertyName);
    areAllPropsReversed &= interpolators_[propertyName]->updateKeyframes(
        rt,
        fromObject.hasProperty(rt, propNameID) ? fromObject.getProperty(rt, propNameID) : jsi::Value::undefined(),
        toObject.hasProperty(rt, propNameID) ? toObject.getProperty(rt, propNameID) : jsi::Value::undefined());
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
