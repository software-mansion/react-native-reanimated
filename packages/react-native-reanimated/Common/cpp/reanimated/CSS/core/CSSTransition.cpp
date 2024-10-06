#include <reanimated/CSS/core/CSSTransition.h>

namespace reanimated {

CSSTransition::CSSTransition(
    const unsigned id,
    const ShadowNode::Shared shadowNode,
    const CSSTransitionConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : id_(id),
      shadowNode_(shadowNode),
      propertyNames_(config.properties),
      styleInterpolator_(
          TransitionStyleInterpolator(config.properties, viewStylesRepository)),
      progressProvider_(TransitionProgressProvider(
          config.duration,
          config.delay,
          config.easingFunction)) {
  progressProvider_.addProperties(config.properties);
}

void CSSTransition::updateSettings(
    jsi::Runtime &rt,
    const PartialCSSTransitionSettings &settings) {
  if (settings.properties.has_value()) {
    const auto [addedProperties, removedProperties] =
        updatePropertyNames(settings.properties.value());
    if (!addedProperties.empty()) {
      styleInterpolator_.addProperties(addedProperties);
      progressProvider_.addProperties(addedProperties);
    }
    if (!removedProperties.empty()) {
      styleInterpolator_.removeProperties(removedProperties);
      progressProvider_.removeProperties(removedProperties);
    }
  }
  // TODO update other settings
}

void CSSTransition::run(
    jsi::Runtime &rt,
    const jsi::Value &updatedProperties,
    const time_t timestamp) {
  const auto updatedPropertyNames =
      updatedProperties.asObject(rt).getPropertyNames(rt);

  std::vector<std::string> propertyNames;
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

std::pair<std::vector<std::string>, std::vector<std::string>>
CSSTransition::updatePropertyNames(
    const std::vector<std::string> &propertyNames) {
  std::unordered_set<std::string> newPropertyNameSet;
  newPropertyNameSet.reserve(propertyNames.size());
  for (const auto &propertyName : propertyNames) {
    newPropertyNameSet.insert(propertyName);
  }

  std::vector<std::string> addedProperties;
  for (const auto &propertyName : propertyNames) {
    if (!propertyNameSet_.contains(propertyName)) {
      addedProperties.push_back(propertyName);
    }
  }

  std::vector<std::string> removedProperties;
  for (const auto &propertyName : propertyNames_) {
    if (!newPropertyNameSet.contains(propertyName)) {
      removedProperties.push_back(propertyName);
    }
  }

  propertyNames_ = propertyNames;
  propertyNameSet_ = newPropertyNameSet;
  return {addedProperties, removedProperties};
}

} // namespace reanimated
