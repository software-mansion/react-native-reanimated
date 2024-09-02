#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>

namespace reanimated {

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

  for (size_t i = 0; i < transformsArray.size(rt); ++i) {
    jsi::Value transformValue = transformsArray.getValueAtIndex(rt, i);
    jsi::Object transformObject = transformValue.asObject(rt);
    jsi::Array propertyNames = transformObject.getPropertyNames(rt);
    size_t propertiesCount = propertyNames.size(rt);

    if (propertiesCount != 1) {
      throw std::invalid_argument(
          "[Reanimated] Invalid transform object in CSS style: " +
          stringifyJSIValue(rt, transformValue));
    }

    std::string propName =
        propertyNames.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
    jsi::Value propValue =
        transformObject.getProperty(rt, jsi::PropNameID::forUtf8(rt, propName));

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

    jsi::Object obj(rt);
    obj.setProperty(rt, jsi::PropNameID::forUtf8(rt, propName), updatedValue);
    updateResult.setValueAtIndex(rt, i, obj);
  }

  return updateResult;
}

} // namespace reanimated
