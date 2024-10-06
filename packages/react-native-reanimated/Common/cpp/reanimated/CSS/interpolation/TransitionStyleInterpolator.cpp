#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const PropertyNames &propertyNames,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository),
      interpolators_(build(propertyNames, viewStylesRepository)) {}

void TransitionStyleInterpolator::addProperties(
    const PropertyNames &propertyNames) {
  for (const auto &propertyName : propertyNames) {
    auto interpolator = interpolators_.find(propertyName);
    if (interpolator != interpolators_.cend()) {
      continue;
    }
    interpolators_.emplace(propertyName, createInterpolator(propertyName));
  }
}

void TransitionStyleInterpolator::removeProperties(
    const PropertyNames &propertyNames) {
  for (const auto &propertyName : propertyNames) {
    interpolators_.erase(propertyName);
  }
}

jsi::Value TransitionStyleInterpolator::update(
    const std::unordered_map<std::string, InterpolationUpdateContext>
        &contexts) {
  if (contexts.empty()) {
    return jsi::Value::undefined();
  }
  jsi::Runtime &rt = contexts.cbegin()->second.rt;
  jsi::Object result(rt);
  bool allUndefined = true;

  for (const auto &[propName, context] : contexts) {
    auto interpolator = interpolators_.find(propName);

    // This should never happen, as we should create respective interpolators
    // before calling the update method
    if (interpolator == interpolators_.cend()) {
      throw std::invalid_argument(
          "[Reanimated] No interpolator found for property: " + propName);
    }

    jsi::Value value = interpolator->second->update(context);

    if (!value.isUndefined()) {
      allUndefined = false;
    }

    result.setProperty(context.rt, propName.c_str(), value);
  }

  if (allUndefined) {
    return jsi::Value::undefined();
  }

  return result;
}

PropertiesInterpolators TransitionStyleInterpolator::build(
    const PropertyNames &propertyNames,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  PropertiesInterpolators interpolators;

  for (const auto &propertyName : propertyNames) {
    interpolators.emplace(propertyName, createInterpolator(propertyName));
  }

  return interpolators;
}

std::shared_ptr<Interpolator> TransitionStyleInterpolator::createInterpolator(
    const std::string &propertyName) {
  const auto factory = styleInterpolatorFactories.find(propertyName);

  if (factory == styleInterpolatorFactories.cend()) {
    throw std::invalid_argument(
        "[Reanimated] No matching interpolator factory found for property: " +
        propertyName);
  }

  return factory->second(viewStylesRepository_, {propertyName});
}

} // namespace reanimated
