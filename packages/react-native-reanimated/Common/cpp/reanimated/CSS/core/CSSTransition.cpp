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
      settings_(config.settings),
      styleInterpolator_(TransitionStyleInterpolator(shadowNode_->getComponentName(), viewStylesRepository)),
      progressProvider_(TransitionProgressProvider()) {
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

folly::dynamic CSSTransition::run(jsi::Runtime &rt, const CSSTransitionUpdates &updates, const double timestamp) {
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
  }

  if (!updates.properties.empty()) {
    styleInterpolator_.updateInterpolatedProperties(rt, updates.properties);
  }

  progressProvider_.runProgressProviders(timestamp, settings_, updates.properties);
  return update(rt, timestamp);
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

} // namespace reanimated::css
