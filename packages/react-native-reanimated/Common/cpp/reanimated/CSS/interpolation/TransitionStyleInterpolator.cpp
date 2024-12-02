#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

jsi::Value TransitionStyleInterpolator::getCurrentInterpolationStyle(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  jsi::Object result(rt);

  for (const auto &[propertyName, interpolator] : interpolators_) {
    jsi::Value value = interpolator->getCurrentValue(rt, shadowNode);
    result.setProperty(rt, propertyName.c_str(), value);
  }

  return result;
}

jsi::Value TransitionStyleInterpolator::update(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const std::unordered_set<std::string> &propertiesToRemove) {
  if (interpolators_.empty()) {
    return jsi::Value::undefined();
  }

  jsi::Object result(rt);

  for (auto it = interpolators_.begin(); it != interpolators_.end();) {
    const auto &[propertyName, interpolator] = *it;

    jsi::Value value = interpolator->update(rt, shadowNode);
    result.setProperty(rt, propertyName.c_str(), value);

    if (propertiesToRemove.find(propertyName) != propertiesToRemove.cend()) {
      it = interpolators_.erase(it);
    } else {
      ++it;
    }
  }

  return result;
}

void TransitionStyleInterpolator::discardIrrelevantInterpolators(
    const std::unordered_set<std::string> &transitionPropertyNames) {
  for (auto it = interpolators_.begin(); it != interpolators_.end();) {
    // Remove property interpolators for properties not specified in the
    // transition property names
    if (transitionPropertyNames.find(it->first) ==
        transitionPropertyNames.end()) {
      it = interpolators_.erase(it);
    } else {
      ++it;
    }
  }
}

void TransitionStyleInterpolator::updateInterpolatedProperties(
    jsi::Runtime &rt,
    const ChangedProps &changedProps,
    const TransitionPropertyProgressProviders &progressProviders) {
  const bool hasOldProps = changedProps.oldProps->isObject();
  const bool hasNewProps = changedProps.newProps->isObject();

  const auto oldPropsObj =
      hasOldProps ? changedProps.oldProps->asObject(rt) : jsi::Object(rt);
  const auto newPropsObj =
      hasNewProps ? changedProps.newProps->asObject(rt) : jsi::Object(rt);

  for (const auto &propertyName : changedProps.changedPropertyNames) {
    auto interpolatorIt = interpolators_.find(propertyName);

    const auto oldValue = hasOldProps
        ? oldPropsObj.getProperty(rt, propertyName.c_str())
        : jsi::Value::undefined();
    const auto newValue = hasNewProps
        ? newPropsObj.getProperty(rt, propertyName.c_str())
        : jsi::Value::undefined();

    if (interpolatorIt == interpolators_.end()) {
      const auto newInterpolator = createPropertyInterpolator(
          propertyName,
          {},
          PROPERTY_INTERPOLATOR_FACTORIES,
          progressProviders.at(propertyName),
          viewStylesRepository_);
      interpolatorIt =
          interpolators_.emplace(propertyName, newInterpolator).first;
    } else {
      interpolatorIt->second->setProgressProvider(
          progressProviders.at(propertyName));
    }

    interpolatorIt->second->updateKeyframesFromStyleChange(
        rt, oldValue, newValue);
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
