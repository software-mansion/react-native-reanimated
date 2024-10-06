#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

namespace reanimated {

ObjectPropertiesInterpolator::ObjectPropertiesInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &object,
    const ObjectPropertiesInterpolatorFactories &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::vector<std::string> &propertyPath)
    : GroupInterpolator(propertyPath),
      interpolators_(build(rt, object, viewStylesRepository, factories)) {}

ObjectPropertiesInterpolators ObjectPropertiesInterpolator::build(
    jsi::Runtime &rt,
    const jsi::Object &object,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
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
    if (factory == factories.cend()) {
      throw std::invalid_argument(
          "[Reanimated] No matching interpolator factory found for property: " +
          propName);
    }

    std::vector<std::string> newPath = propertyPath_;
    newPath.emplace_back(propName);
    interpolators[propName] =
        factory->second(rt, propValue, viewStylesRepository, newPath);
  }

  return interpolators;
}

jsi::Value ObjectPropertiesInterpolator::mapInterpolators(
    jsi::Runtime &rt,
    std::function<jsi::Value(Interpolator &)> callback) const {
  jsi::Object result(rt);
  bool allUndefined = true;

  for (const auto &[propName, interpolator] : interpolators_) {
    jsi::Value value = callback(*interpolator);

    if (!value.isUndefined()) {
      allUndefined = false;
    }

    result.setProperty(rt, propName.c_str(), value);
  }

  if (allUndefined) {
    return jsi::Value::undefined();
  }

  return result;
}

} // namespace reanimated
