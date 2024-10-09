#include <reanimated/CSS/core/CSSTransition.h>

namespace reanimated {

CSSTransition::CSSTransition(
    const unsigned id,
    const ShadowNode::Shared shadowNode,
    const CSSTransitionConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : id_(id),
      shadowNode_(shadowNode),
      properties_(config.properties),
      styleInterpolator_(TransitionStyleInterpolator(viewStylesRepository)),
      progressProvider_(TransitionProgressProvider(
          config.duration,
          config.delay,
          config.easingFunction)) {}

void CSSTransition::updateSettings(
    jsi::Runtime &rt,
    const PartialCSSTransitionSettings &settings) {
  if (settings.properties.has_value()) {
    // TODO - handle property updates
  }
  // TODO update other settings
}

void CSSTransition::run(
    jsi::Runtime &rt,
    const jsi::Value &updatedProperties,
    const time_t timestamp) {
  const auto updatedPropertyNames =
      updatedProperties.asObject(rt).getPropertyNames(rt);

  PropertyNames propertyNames;
  const auto changedPropertiesCount = updatedPropertyNames.size(rt);
  propertyNames.reserve(changedPropertiesCount);

  for (size_t i = 0; i < changedPropertiesCount; i++) {
    propertyNames.push_back(
        updatedPropertyNames.getValueAtIndex(rt, i).getString(rt).utf8(rt));
  }

  styleInterpolator_.updateProperties(rt, shadowNode_, updatedProperties);
  progressProvider_.runProgressProviders(propertyNames, timestamp);
}

jsi::Value CSSTransition::update(jsi::Runtime &rt, time_t timestamp) {
  progressProvider_.update(timestamp);

  const auto &runningProperties = progressProvider_.getRunningProperties();
  if (runningProperties.empty()) {
    return jsi::Value::undefined();
  }

  std::unordered_map<std::string, InterpolationUpdateContext> contexts;
  for (const auto &propertyName : runningProperties) {
    const auto propertyProgressProvider =
        progressProvider_.getPropertyProgressProvider(propertyName);
    if (!propertyProgressProvider.has_value()) {
      continue;
    }

    const auto &propertyProgress = propertyProgressProvider.value();
    const InterpolationUpdateContext context{
        .rt = rt,
        .node = shadowNode_,
        .progress = propertyProgress.getCurrent(),
        .previousProgress = propertyProgress.getPrevious(),
        .directionChanged = propertyProgress.hasDirectionChanged()};
    contexts.emplace(propertyName, context);
  }

  return styleInterpolator_.update(contexts);
}

} // namespace reanimated
