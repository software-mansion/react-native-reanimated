#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository) {}

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

} // namespace reanimated
