#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

jsi::Value TransitionStyleInterpolator::getCurrentStyle(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const TransitionProperties &properties) const {
  return properties.has_value()
      ? getSpecificPropsStyle(rt, shadowNode, properties.value())
      : getAllPropsStyle(rt, shadowNode);
}

jsi::Value TransitionStyleInterpolator::getCurrentInterpolationStyle(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  jsi::Object result(rt);

  for (const auto &[propName, interpolator] : interpolators_) {
    jsi::Value value = interpolator->getCurrentValue(rt, shadowNode);
    result.setProperty(rt, propName.c_str(), value);
  }

  return result;
}

jsi::Value TransitionStyleInterpolator::update(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const std::unordered_map<std::string, TransitionPropertyProgressProvider>
        &progressProviders) {
  if (progressProviders.empty()) {
    interpolators_.clear();
    return jsi::Value::undefined();
  }

  jsi::Object result(rt);

  for (const auto &[propName, progressProvider] : progressProviders) {
    jsi::Value value = interpolators_.at(propName)->update(
        {.rt = rt,
         .node = shadowNode,
         .progress = progressProvider.getCurrent(),
         .previousProgress = progressProvider.getPrevious(),
         .directionChanged = progressProvider.hasDirectionChanged()});
    result.setProperty(rt, propName.c_str(), value);

    if (progressProvider.getState() == TransitionProgressState::FINISHED) {
      interpolators_.erase(propName);
    }
  }

  return result;
}

void TransitionStyleInterpolator::updateProperties(
    jsi::Runtime &rt,
    const ChangedProps &changedProps) {
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
          propertyName, {}, styleInterpolatorFactories, viewStylesRepository_);
      interpolatorIt =
          interpolators_.emplace(propertyName, newInterpolator).first;
    }

    interpolatorIt->second->updateKeyframesFromStyleChange(
        rt, oldValue, newValue);
  }
}

jsi::Value TransitionStyleInterpolator::getAllPropsStyle(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  const auto viewStyle =
      viewStylesRepository_->getViewStyle(rt, shadowNode->getTag());
  auto result =
      viewStyle.isUndefined() ? jsi::Object(rt) : viewStyle.asObject(rt);

  // Update result with current interpolators values
  for (auto it = interpolators_.begin(); it != interpolators_.end();) {
    auto interpolator = it->second;
    jsi::Value value = interpolator->getCurrentValue(rt, shadowNode);
    result.setProperty(rt, it->first.c_str(), value);
    it++;
  }

  return result;
}

jsi::Value TransitionStyleInterpolator::getSpecificPropsStyle(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const PropertyNames &propertyNames) const {
  jsi::Object result(rt);

  for (const auto &propertyName : propertyNames) {
    auto interpolatorIt = interpolators_.find(propertyName);

    if (interpolatorIt == interpolators_.end()) {
      // Get the view style value if there is no interpolator for the property
      jsi::Value value = viewStylesRepository_->getStyleProp(
          rt, shadowNode->getTag(), {propertyName});
      result.setProperty(rt, propertyName.c_str(), value);
    } else {
      // Otherwise, get the current value from the interpolator
      jsi::Value value =
          interpolatorIt->second->getCurrentValue(rt, shadowNode);
      result.setProperty(rt, propertyName.c_str(), value);
    }
  }

  return result;
}

} // namespace reanimated
