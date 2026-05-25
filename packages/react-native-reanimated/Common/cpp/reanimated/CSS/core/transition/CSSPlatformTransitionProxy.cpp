#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <utility>

namespace reanimated::css {

CSSPlatformTransitionProxy::CSSPlatformTransitionProxy(
    CSSCanRoutePropertyFunction canRoute,
    CSSApplyTransitionFunction applyTransition,
    CSSRemoveTransitionFunction removeTransition)
    : canRoute_(std::move(canRoute)),
      applyTransition_(std::move(applyTransition)),
      removeTransition_(std::move(removeTransition)) {}

bool CSSPlatformTransitionProxy::canRoute(const std::string &propertyName, const EasingConfig &easing) const {
  if constexpr (!StaticFeatureFlags::getFlag("IOS_CSS_CORE_ANIMATION")) {
    return false;
  }
  return canRoute_ && canRoute_(propertyName, easing);
}

void CSSPlatformTransitionProxy::run(const CSSPlatformTransitionPropertyConfig &config) const {
  if (applyTransition_) {
    applyTransition_(config);
  }
}

void CSSPlatformTransitionProxy::remove(const Tag viewTag, const std::string &propertyName) const {
  if (removeTransition_) {
    removeTransition_(viewTag, propertyName);
  }
}

// Splits the new split-shape config into loop / platform buckets. result.routing
// starts as a copy of the previous call's routing and is updated as we route
// each prop; erasing from the *other* side's set returns nonzero exactly when
// the prop is migrating sides - that's how we emit cancels.
CSSPlatformTransitionProxy::ProcessedConfig CSSPlatformTransitionProxy::processConfig(
    CSSTransitionConfig &&config,
    const CSSTransitionRouting &previousRouting) const {
  ProcessedConfig result;
  result.routing = previousRouting;

  // Drain changedPropertiesSettings; for each, decide routing and bucket.
  // extract() preserves move-only PropertyValueDiff (jsi::Value pair).
  while (!config.changedPropertiesSettings.empty()) {
    auto settingsNode = config.changedPropertiesSettings.extract(config.changedPropertiesSettings.begin());
    const auto &propertyName = settingsNode.key();
    const auto &settings = settingsNode.mapped();
    const auto valueIt = config.changedProperties.find(propertyName);

    if (canRoute(propertyName, settings.easingConfig)) {
      // loop -> platform migration: cancel on loop.
      if (result.routing.loop.erase(propertyName) > 0) {
        result.loop.removedProperties.push_back(propertyName);
      }
      result.routing.platform.insert(propertyName);

      if (valueIt != config.changedProperties.end()) {
        auto valueNode = config.changedProperties.extract(valueIt);
        result.platform.changedProperties.push_back(
            CSSPlatformTransitionRawEntry{propertyName, std::move(valueNode.mapped()), settingsNode.mapped()});
      }
    } else {
      // platform -> loop migration: cancel on platform.
      if (result.routing.platform.erase(propertyName) > 0) {
        result.platform.removedProperties.push_back(propertyName);
      }
      result.routing.loop.insert(propertyName);

      if (valueIt != config.changedProperties.end()) {
        auto valueNode = config.changedProperties.extract(valueIt);
        result.loop.changedProperties.insert(std::move(valueNode));
      }
      result.loop.changedPropertiesSettings.insert(std::move(settingsNode));
    }
  }

  // Any value diffs without matching settings - forward to whichever side they
  // were last on. (Practically rare: parser emits settings + values together.)
  while (!config.changedProperties.empty()) {
    auto valueNode = config.changedProperties.extract(config.changedProperties.begin());
    if (!result.routing.platform.contains(valueNode.key())) {
      result.routing.loop.insert(valueNode.key());
      result.loop.changedProperties.insert(std::move(valueNode));
    }
  }

  // Props JS asked to stop transitioning: look up the owning side in routing
  // and forward the cancel there.
  for (auto &propertyName : config.removedProperties) {
    if (result.routing.platform.erase(propertyName) > 0) {
      result.platform.removedProperties.push_back(std::move(propertyName));
    } else if (result.routing.loop.erase(propertyName) > 0) {
      result.loop.removedProperties.push_back(std::move(propertyName));
    }
  }

  return result;
}

} // namespace reanimated::css
