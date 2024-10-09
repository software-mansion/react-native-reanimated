#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

void TransitionStyleInterpolator::addProperties(
    const PropertyNames &propertyNames) {
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
    const PropertyNames &propertyNames) {
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

std::shared_ptr<Interpolator> TransitionStyleInterpolator::createInterpolator(
    const std::string &propertyName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  const auto factoryIt = styleInterpolatorFactories.find(propertyName);

  if (factoryIt == styleInterpolatorFactories.cend()) {
    throw std::invalid_argument(
        "[Reanimated] No matching interpolator factory found for property: " +
        propertyName);
  }

  return factoryIt->second->create(viewStylesRepository, {propertyName});
}

} // namespace reanimated
