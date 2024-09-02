#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

namespace reanimated {

ObjectPropertiesInterpolator::ObjectPropertiesInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &object,
    const ObjectPropertiesInterpolatorFactories &factories)
    : interpolators_(build(rt, object, factories)) {}

ObjectPropertiesInterpolators ObjectPropertiesInterpolator::build(
    jsi::Runtime &rt,
    const jsi::Object &object,
    const ObjectPropertiesInterpolatorFactories &factories) {
  ObjectPropertiesInterpolators interpolators;

  jsi::Array propertyNames = object.getPropertyNames(rt);
  size_t propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    std::string propName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    jsi::Value propValue =
        object.getProperty(rt, jsi::PropNameID::forUtf8(rt, propName));

    auto factory = factories.find(propName);
    if (factory == factories.end()) {
      throw std::invalid_argument(
          "[Reanimated] No matching interpolator factory found for property: " +
          propName);
    }

    interpolators[propName] = factory->second(rt, propValue);
  }

  return interpolators;
}

jsi::Value ObjectPropertiesInterpolator::update(
    jsi::Runtime &rt,
    double progress) {
  jsi::Object result(rt);

  for (const auto &pair : interpolators_) {
    const std::string &propName = pair.first;
    const std::shared_ptr<Interpolator> &interpolator = pair.second;

    result.setProperty(
        rt, propName.c_str(), interpolator->update(rt, progress));
  }

  return result;
}

} // namespace reanimated
