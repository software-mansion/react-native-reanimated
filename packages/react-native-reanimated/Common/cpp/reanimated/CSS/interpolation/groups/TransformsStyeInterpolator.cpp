#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>

namespace reanimated {

std::pair<std::string, jsi::Value> extractTransformPropertyAndValue(
    jsi::Runtime &rt,
    const jsi::Object &transformObject) {
  jsi::Array propertyNames = transformObject.getPropertyNames(rt);
  size_t propertiesCount = propertyNames.size(rt);

  if (propertiesCount != 1) {
    throw std::invalid_argument(
        "[Reanimated] Invalid transform object in CSS style.");
  }

  std::string propName =
      propertyNames.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
  jsi::Value propValue = transformObject.getProperty(rt, propName.c_str());

  return std::make_pair(propName, std::move(propValue));
}

std::unordered_map<std::string, jsi::Value> extractTransformMap(
    jsi::Runtime &rt,
    const jsi::Array &transformArray) {
  std::unordered_map<std::string, jsi::Value> transformMap;

  for (size_t i = 0; i < transformArray.size(rt); i++) {
    jsi::Value arrayElement = transformArray.getValueAtIndex(rt, i);
    if (arrayElement.isObject()) {
      jsi::Object transformObject = arrayElement.asObject(rt);

      auto [propertyName, propertyValue] =
          extractTransformPropertyAndValue(rt, transformObject);
      transformMap[propertyName] = std::move(propertyValue);
    }
  }

  return transformMap;
}

TransformsStyleInterpolator::TransformsStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Array &transformsArray,
    const TransformPropertyInterpolatorFactories &factories)
    : interpolators_(build(rt, transformsArray, factories)) {}

TransformPropertyInterpolators TransformsStyleInterpolator::build(
    jsi::Runtime &rt,
    const jsi::Array &transformsArray,
    const TransformPropertyInterpolatorFactories &factories) const {
  TransformPropertyInterpolators interpolators;

  std::unordered_map<std::string, jsi::Value> transformMap =
      extractTransformMap(rt, transformsArray);

  for (const auto &pair : transformMap) {
    const std::string &propName = pair.first;
    const jsi::Value &propValue = pair.second;

    auto factory = factories.find(propName);
    if (factory == factories.end()) {
      throw std::invalid_argument(
          "[Reanimated] No matching interpolator factory found for property: " +
          propName);
    }

    interpolators.push_back({propName, factory->second(rt, propValue)});
  }

  return interpolators;
}

void TransformsStyleInterpolator::setStyleValue(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  if (!value.isObject() || !value.asObject(rt).isArray(rt)) {
    jsi::Value undefinedValue = jsi::Value::undefined();
    for (const auto &transformInterpolator : interpolators_) {
      transformInterpolator.interpolator->setStyleValue(rt, undefinedValue);
    }
    return;
  }

  jsi::Array transformArray = value.asObject(rt).asArray(rt);

  std::unordered_map<std::string, jsi::Value> transformMap =
      extractTransformMap(rt, transformArray);

  for (const auto &transformInterpolator : interpolators_) {
    auto transform = transformMap.find(transformInterpolator.property);
    jsi::Value transformValue = (transform != transformMap.end())
        ? std::move(transform->second)
        : jsi::Value::undefined();

    transformInterpolator.interpolator->setStyleValue(rt, transformValue);
  }
}

jsi::Value TransformsStyleInterpolator::update(
    const InterpolationUpdateContext context) {
  jsi::Runtime &rt = context.rt;
  jsi::Array updateResult(rt, interpolators_.size());

  for (size_t i = 0; i < interpolators_.size(); ++i) {
    const TransformPropertyInterpolator &transformInterpolator =
        interpolators_[i];
    auto propName = transformInterpolator.property;
    jsi::Value updatedValue =
        transformInterpolator.interpolator->update(context);

    if (updatedValue.isUndefined()) {
      continue;
    }

    jsi::Object obj(rt);
    obj.setProperty(rt, jsi::PropNameID::forUtf8(rt, propName), updatedValue);
    updateResult.setValueAtIndex(rt, i, obj);
  }

  return updateResult;
}

} // namespace reanimated
