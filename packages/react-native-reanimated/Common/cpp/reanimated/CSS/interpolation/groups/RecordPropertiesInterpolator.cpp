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

bool RecordPropertiesInterpolator::equalsReversingAdjustedStartValue(const folly::dynamic &propertyValue) const {
  return std::ranges::all_of(propertyValue.items(), [this](const auto &item) {
    const auto &[propName, propValue] = item;
    const auto it = interpolators_.find(propName.getString());
    return it != interpolators_.end() && it->second->equalsReversingAdjustedStartValue(propValue);
  });
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

void RecordPropertiesInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue,
    const jsi::Value &lastUpdateValue) {
  const auto getObject = [&rt](const jsi::Value &value) -> std::optional<jsi::Object> {
    if (!value.isObject()) {
      return std::nullopt;
    }

    const auto object = value.asObject(rt);
    if (!object.isObject()) {
      return std::nullopt;
    }

    return object;
  };

  const auto oldObject = getObject(oldStyleValue);
  const auto newObject = getObject(newStyleValue);
  const auto lastObject = getObject(lastUpdateValue);

  std::unordered_set<std::string> propertyNamesSet;
  if (oldObject.has_value()) {
    jsi::Array names = oldObject->getPropertyNames(rt);
    const size_t count = names.size(rt);
    for (size_t i = 0; i < count; ++i) {
      propertyNamesSet.insert(names.getValueAtIndex(rt, i).asString(rt).utf8(rt));
    }
  }
  if (newObject.has_value()) {
    jsi::Array names = newObject->getPropertyNames(rt);
    const size_t count = names.size(rt);
    for (size_t i = 0; i < count; ++i) {
      propertyNamesSet.insert(names.getValueAtIndex(rt, i).asString(rt).utf8(rt));
    }
  }

  for (const auto &propertyName : propertyNamesSet) {
    maybeCreateInterpolator(propertyName);

    const auto propId = jsi::PropNameID::forUtf8(rt, propertyName);
    const auto oldValue = oldObject.has_value() ? oldObject->getProperty(rt, propId) : jsi::Value::undefined();
    const auto newValue = newObject.has_value() ? newObject->getProperty(rt, propId) : jsi::Value::undefined();
    const auto lastValue = lastObject.has_value() ? lastObject->getProperty(rt, propId) : jsi::Value::undefined();

    interpolators_[propertyName]->updateKeyframesFromStyleChange(rt, oldValue, newValue, lastValue);
  }
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
