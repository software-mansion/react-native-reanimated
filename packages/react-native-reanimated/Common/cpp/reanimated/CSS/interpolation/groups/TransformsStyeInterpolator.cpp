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

std::pair<std::unordered_map<std::string, jsi::Value>, std::vector<std::string>>
extractTransformMapAndOrderedProperties(
    jsi::Runtime &rt,
    const jsi::Array &transformArray) {
  std::unordered_map<std::string, jsi::Value> transformMap;
  std::vector<std::string> orderedPropertyNames;

  for (size_t i = 0; i < transformArray.size(rt); i++) {
    jsi::Value arrayElement = transformArray.getValueAtIndex(rt, i);
    if (arrayElement.isObject()) {
      jsi::Object transformObject = arrayElement.asObject(rt);

      auto [propertyName, propertyValue] =
          extractTransformPropertyAndValue(rt, transformObject);
      transformMap[propertyName] = std::move(propertyValue);
      orderedPropertyNames.push_back(propertyName);
    }
  }

  return {std::move(transformMap), std::move(orderedPropertyNames)};
}

TransformsStyleInterpolator::TransformsStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Array &transformsArray,
    const TransformPropertyInterpolatorFactories &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::vector<std::string> &propertyPath)
    : Interpolator(propertyPath),
      interpolators_(
          build(rt, transformsArray, viewStylesRepository, factories)) {}

TransformPropertyInterpolators TransformsStyleInterpolator::build(
    jsi::Runtime &rt,
    const jsi::Array &transformsArray,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const TransformPropertyInterpolatorFactories &factories) const {
  TransformPropertyInterpolators interpolators;

  auto [transformMap, orderedPropertyNames] =
      extractTransformMapAndOrderedProperties(rt, transformsArray);

  for (const auto &propName : orderedPropertyNames) {
    const jsi::Value &propValue = transformMap[propName];

    auto factory = factories.find(propName);
    if (factory == factories.end()) {
      throw std::invalid_argument(
          "[Reanimated] No matching interpolator factory found for property: " +
          propName);
    }

    std::vector<std::string> newPath = this->propertyPath_;
    newPath.emplace_back(propName);
    interpolators.emplace_back(
        propName,
        factory->second(rt, propValue, viewStylesRepository, newPath));
  }

  return interpolators;
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

jsi::Value TransformsStyleInterpolator::reset(
    const InterpolationUpdateContext context) {
  jsi::Runtime &rt = context.rt;
  jsi::Array resetResult(rt, interpolators_.size());

  for (size_t i = 0; i < interpolators_.size(); ++i) {
    const TransformPropertyInterpolator &transformInterpolator =
        interpolators_[i];
    jsi::Value resetValue = transformInterpolator.interpolator->reset(context);

    if (resetValue.isUndefined()) {
      continue;
    }

    jsi::Object obj(rt);
    obj.setProperty(
        rt,
        jsi::PropNameID::forUtf8(rt, transformInterpolator.property),
        resetValue);
    resetResult.setValueAtIndex(rt, i, obj);
  }

  return resetResult;
}

} // namespace reanimated
