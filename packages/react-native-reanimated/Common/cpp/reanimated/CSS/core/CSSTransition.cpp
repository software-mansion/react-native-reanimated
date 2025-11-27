#include <reanimated/CSS/core/CSSTransition.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>

namespace reanimated::css {

CSSTransition::CSSTransition(
    std::shared_ptr<const ShadowNode> shadowNode,
    const CSSTransitionConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : shadowNode_(std::move(shadowNode)),
      viewStylesRepository_(viewStylesRepository),
      properties_(config.properties),
      settings_(config.settings),
      styleInterpolator_(TransitionStyleInterpolator(shadowNode_->getComponentName(), viewStylesRepository)),
      progressProvider_(TransitionProgressProvider()) {
  updateAllowedDiscreteProperties();
}

Tag CSSTransition::getViewTag() const {
  return shadowNode_->getTag();
}

std::shared_ptr<const ShadowNode> CSSTransition::getShadowNode() const {
  return shadowNode_;
}

double CSSTransition::getMinDelay(double timestamp) const {
  return progressProvider_.getMinDelay(timestamp);
}

TransitionProgressState CSSTransition::getState() const {
  return progressProvider_.getState();
}

folly::dynamic CSSTransition::run(
    jsi::Runtime &rt,
    const ChangedProps &changedProps,
    const CSSTransitionUpdates &updates,
    const folly::dynamic &lastUpdateValue,
    const double timestamp) {
  if (updates.settings.has_value()) {
    for (const auto &[property, partialSettings] : *updates.settings) {
      auto &existingSettings = settings_[property];

      if (partialSettings.duration.has_value()) {
        existingSettings.duration = partialSettings.duration.value();
      }
      if (partialSettings.easingFunction.has_value()) {
        existingSettings.easingFunction = partialSettings.easingFunction.value();
      }
      if (partialSettings.delay.has_value()) {
        existingSettings.delay = partialSettings.delay.value();
      }
      if (partialSettings.allowDiscrete.has_value()) {
        existingSettings.allowDiscrete = partialSettings.allowDiscrete.value();
      }
    }

    updateAllowedDiscreteProperties();
  }

  if (!updates.properties.empty()) {
    ChangedProps transitionChangedProps;
    transitionChangedProps.changedPropertyNames.reserve(updates.properties.size());
    transitionChangedProps.oldProps = folly::dynamic::object;
    transitionChangedProps.newProps = folly::dynamic::object;

    for (const auto &[property, diffPair] : updates.properties) {
      transitionChangedProps.changedPropertyNames.push_back(property);
      transitionChangedProps.oldProps[property] = jsiValueToDynamic(rt, diffPair.first);
      transitionChangedProps.newProps[property] = jsiValueToDynamic(rt, diffPair.second);
    }

    updateTransitionProperties(properties_);
    styleInterpolator_.updateInterpolatedProperties(transitionChangedProps, {});
  }

  progressProvider_.runProgressProviders(
      timestamp,
      settings_,
      changedProps.changedPropertyNames,
      styleInterpolator_.getReversedPropertyNames(changedProps.newProps));
  styleInterpolator_.updateInterpolatedProperties(changedProps, lastUpdateValue);
  return update(timestamp);
}

folly::dynamic CSSTransition::update(const double timestamp) {
  progressProvider_.update(timestamp);
  auto result = styleInterpolator_.interpolate(shadowNode_, progressProvider_, allowDiscreteProperties_);
  // Remove interpolators for which interpolation has finished
  // (we won't need them anymore in the current transition)
  styleInterpolator_.discardFinishedInterpolators(progressProvider_);
  // And remove finished progress providers after they were used to calculate
  // the last frame of the transition
  progressProvider_.discardFinishedProgressProviders();
  return result;
}

void CSSTransition::updateTransitionProperties(const TransitionProperties &properties) {
  properties_ = properties;

  const auto isAllPropertiesTransition = !properties_.has_value();
  if (isAllPropertiesTransition) {
    return;
  }

  const std::unordered_set<std::string> transitionPropertyNames(properties_->begin(), properties_->end());

  styleInterpolator_.discardIrrelevantInterpolators(transitionPropertyNames);
  progressProvider_.discardIrrelevantProgressProviders(transitionPropertyNames);
}

void CSSTransition::updateAllowedDiscreteProperties() {
  allowDiscreteProperties_.clear();
  for (const auto &[propertyName, propertySettings] : settings_) {
    if (propertySettings.allowDiscrete) {
      allowDiscreteProperties_.insert(propertyName);
    }
  }
}

void CSSTransition::applyPropertyDiffs(jsi::Runtime &rt, const CSSTransitionPropertyDiffs &diffs) {
  ChangedProps changedProps;
  changedProps.changedPropertyNames.reserve(diffs.size());
  changedProps.oldProps = folly::dynamic::object;
  changedProps.newProps = folly::dynamic::object;

  for (const auto &[property, diffPair] : diffs) {
    changedProps.changedPropertyNames.push_back(property);
    changedProps.oldProps[property] = jsiValueToDynamic(rt, diffPair.first);
    changedProps.newProps[property] = jsiValueToDynamic(rt, diffPair.second);
  }

  const folly::dynamic lastUpdateValue; // empty since updates come from JS
  styleInterpolator_.updateInterpolatedProperties(changedProps, lastUpdateValue);
}

bool CSSTransition::isAllowedProperty(const std::string &propertyName) const {
  if (!isDiscreteProperty(propertyName, shadowNode_->getComponentName())) {
    return true;
  }

  return allowDiscreteProperties_.contains(propertyName) || allowDiscreteProperties_.contains("all");
}

} // namespace reanimated::css
