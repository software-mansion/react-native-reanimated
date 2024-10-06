#include <reanimated/CSS/CSSTransition.h>

namespace reanimated {

CSSTransition::CSSTransition(
    const unsigned id,
    const ShadowNode::Shared shadowNode,
    const CSSTransitionConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : id_(id),
      shadowNode_(shadowNode),
      propertyNames_(config.properties),
      styleInterpolator_(TransitionStyleInterpolator(
          config.properties,
          viewStylesRepository)) {}

void CSSTransition::updateSettings(
    jsi::Runtime &rt,
    const PartialCSSTransitionSettings &settings,
    const time_t timestamp) {
  if (settings.properties.has_value()) {
    const auto [addedProperties, removedProperties] =
        updatePropertyNames(settings.properties.value());
    if (!addedProperties.empty()) {
      styleInterpolator_.addProperties(addedProperties);
    }
    if (!removedProperties.empty()) {
      styleInterpolator_.removeProperties(removedProperties);
    }
  }
  // TODO update other settings
}

void CSSTransition::run(jsi::Runtime &rt, const jsi::Value &changedPropValues) {
  // TODO
}

jsi::Value CSSTransition::update(jsi::Runtime &rt, time_t timestamp) {
  // TODO
  return jsi::Value::undefined();
}

std::pair<PropertyNames, PropertyNames> CSSTransition::updatePropertyNames(
    const PropertyNames &propertyNames) {
  std::unordered_set<std::string> newPropertyNameSet;
  newPropertyNameSet.reserve(propertyNames.size());
  for (const auto &propertyName : propertyNames) {
    newPropertyNameSet.insert(propertyName);
  }

  PropertyNames addedProperties;
  for (const auto &propertyName : propertyNames) {
    if (!propertyNameSet_.contains(propertyName)) {
      addedProperties.push_back(propertyName);
    }
  }

  PropertyNames removedProperties;
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
