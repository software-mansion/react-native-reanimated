#include <reanimated/CSS/core/CSSTransition.h>

#include <memory>
#include <optional>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSTransition::CSSTransition(
    std::shared_ptr<const ShadowNode> shadowNode,
    const CSSTransitionConfig &config,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : shadowNode_(std::move(shadowNode)),
      viewStylesRepository_(viewStylesRepository),
      settings_(config.settings),
      styleInterpolator_(TransitionStyleInterpolator(shadowNode_->getComponentName(), viewStylesRepository)),
      progressProvider_(TransitionProgressProvider()) {}

std::shared_ptr<const ShadowNode> CSSTransition::getShadowNode() const {
  return shadowNode_;
}

double CSSTransition::getMinDelay(double timestamp) const {
  return progressProvider_.getMinDelay(timestamp);
}

TransitionProgressState CSSTransition::getState() const {
  return progressProvider_.getState();
}

void CSSTransition::updateSettings(const CSSTransitionPropertySettingsUpdates &settingsUpdates) {
  for (const auto &[property, partialSettings] : settingsUpdates) {
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
}

std::optional<std::unordered_set<std::string>> CSSTransition::getProperties() const {
  const auto allIt = settings_.find("all");
  if (allIt != settings_.end()) {
    return std::nullopt; // "all" means no specific properties
  }

  std::unordered_set<std::string> properties;
  for (const auto &[property, _] : settings_) {
    properties.insert(property);
  }
  return properties;
}

folly::dynamic CSSTransition::run(
    jsi::Runtime &rt,
    const CSSTransitionPropertyUpdates &propertyUpdates,
    const jsi::Value &lastUpdates,
    const double timestamp) {
  const auto updatedProperties =
      styleInterpolator_.updateInterpolatedProperties(rt, propertyUpdates, lastUpdates, settings_);
  progressProvider_.runProgressProviders(timestamp, updatedProperties, settings_);
  return update(timestamp);
}

folly::dynamic CSSTransition::update(const double timestamp) {
  progressProvider_.update(timestamp);
  auto result = styleInterpolator_.interpolate(shadowNode_, progressProvider_);
  // Remove interpolators for which interpolation has finished
  // (we won't need them anymore in the current transition)
  styleInterpolator_.discardFinishedInterpolators(progressProvider_);
  // And remove finished progress providers after they were used to calculate
  // the last frame of the transition
  progressProvider_.discardFinishedProgressProviders();
  return result;
}

} // namespace reanimated::css
