#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::vector<std::string> &propertyNames,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository),
      interpolators_(build(propertyNames, viewStylesRepository)) {}

void TransitionStyleInterpolator::addProperties(
    const std::vector<std::string> &propertyNames) {
  for (const auto &propertyName : propertyNames) {
    auto interpolator = interpolators_.find(propertyName);
    if (interpolator != interpolators_.cend()) {
      continue;
    }
    interpolators_.emplace(
        propertyName, createInterpolator(propertyName, viewStylesRepository_));
  }
}

void TransitionStyleInterpolator::removeProperties(
    const std::vector<std::string> &propertyNames) {
  for (const auto &propertyName : propertyNames) {
    interpolators_.erase(propertyName);
  }
}

void TransitionStyleInterpolator::updateProperties(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const jsi::Value &changedPropValues) {
  const auto changedPropValuesObj = changedPropValues.asObject(rt);
  const auto changedPropertyNames = changedPropValuesObj.getPropertyNames(rt);
  const auto changedPropertiesCount = changedPropertyNames.size(rt);

  for (size_t i = 0; i < changedPropertiesCount; i++) {
    const auto propName =
        changedPropertyNames.getValueAtIndex(rt, i).getString(rt).utf8(rt);
    const auto propValue =
        changedPropValuesObj.getProperty(rt, propName.c_str());
    auto interpolator = interpolators_.find(propName);

    if (interpolator == interpolators_.cend()) {
      throw std::invalid_argument(
          "[Reanimated] No interpolator found for property: " + propName);
    }

    interpolator->second->updateKeyframes(rt, shadowNode, propValue);
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
      result.setProperty(context.rt, propName.c_str(), value);
    }
  }

  if (allUndefined) {
    return jsi::Value::undefined();
  }

  return result;
}

PropertiesInterpolators TransitionStyleInterpolator::build(
    const std::vector<std::string> &propertyNames,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  PropertiesInterpolators interpolators;

  for (const auto &propertyName : propertyNames) {
    interpolators.emplace(
        propertyName, createInterpolator(propertyName, viewStylesRepository));
  }

  return interpolators;
}

std::shared_ptr<Interpolator> TransitionStyleInterpolator::createInterpolator(
    const std::string &propertyName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  const auto factory = styleInterpolatorFactories.find(propertyName);

  if (factory == styleInterpolatorFactories.cend()) {
    throw std::invalid_argument(
        "[Reanimated] No matching interpolator factory found for property: " +
        propertyName);
  }

  return factory->second(viewStylesRepository, {propertyName});
}

} // namespace reanimated
