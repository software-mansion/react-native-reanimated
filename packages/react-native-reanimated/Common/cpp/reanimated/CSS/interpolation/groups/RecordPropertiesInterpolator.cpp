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

bool RecordPropertiesInterpolator::isDiscrete() const {
  for (const auto &[propertyName, interpolator] : interpolators_) {
    if (!interpolator->isDiscrete()) {
      return false;
    }
  }
  return true;
}

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

bool RecordPropertiesInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue) {
  // TODO - maybe add a possibility to remove interpolators that are no longer
  // used  (for now, for simplicity, we only add new ones)
  const auto oldStyleObject = oldStyleValue.isUndefined() ? jsi::Object(rt) : oldStyleValue.asObject(rt);
  const auto newStyleObject = newStyleValue.isUndefined() ? jsi::Object(rt) : newStyleValue.asObject(rt);

  const auto oldPropertyNames = oldStyleObject.getPropertyNames(rt);
  const auto newPropertyNames = newStyleObject.getPropertyNames(rt);
  const auto oldSize = oldPropertyNames.size(rt);
  const auto newSize = newPropertyNames.size(rt);

  std::unordered_set<std::string> propertyNamesSet;
  for (size_t i = 0; i < oldSize; ++i) {
    propertyNamesSet.insert(oldPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt));
  }
  for (size_t i = 0; i < newSize; ++i) {
    propertyNamesSet.insert(newPropertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt));
  }

  bool areAllPropsReversed = true;

  for (const auto &propertyName : propertyNamesSet) {
    maybeCreateInterpolator(propertyName);
    const auto propNameID = jsi::PropNameID::forUtf8(rt, propertyName);
    areAllPropsReversed &= interpolators_[propertyName]->updateKeyframesFromStyleChange(
        rt,
        oldStyleObject.hasProperty(rt, propNameID) ? oldStyleObject.getProperty(rt, propNameID)
                                                   : jsi::Value::undefined(),
        newStyleObject.hasProperty(rt, propNameID) ? newStyleObject.getProperty(rt, propNameID)
                                                   : jsi::Value::undefined());
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
