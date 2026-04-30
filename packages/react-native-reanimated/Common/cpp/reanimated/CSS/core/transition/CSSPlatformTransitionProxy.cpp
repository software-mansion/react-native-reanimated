#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

#include <jsi/JSIDynamic.h>

#include <utility>

namespace reanimated::css {

CSSPlatformTransitionProxy::CSSPlatformTransitionProxy(
    CSSCanRoutePropertyFunction canRoute,
    CSSApplyTransitionFunction applyTransition,
    CSSRemoveTransitionFunction removeTransition)
    : canRoute_(std::move(canRoute)),
      applyTransition_(std::move(applyTransition)),
      removeTransition_(std::move(removeTransition)) {}

bool CSSPlatformTransitionProxy::canRoute(const std::string &propertyName) const {
  return canRoute_ && canRoute_(propertyName);
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

// Splits the new config into loop/platform buckets. result.routing starts as
// a copy of the previous call's routing and is updated as we route each prop;
// erasing from the *other* side's set returns nonzero exactly when the prop
// is migrating sides - that's how we emit cancels.
CSSPlatformTransitionProxy::ProcessedConfig CSSPlatformTransitionProxy::processConfig(
    jsi::Runtime &rt,
    const Tag viewTag,
    CSSTransitionConfig &&config,
    const CSSTransitionRouting &previousRouting) const {
  ProcessedConfig result;
  result.routing = previousRouting;

  // extract() preserves move-only PropertySettings (jsi::Value).
  while (!config.changedProperties.empty()) {
    auto node = config.changedProperties.extract(config.changedProperties.begin());
    const auto &propertyName = node.key();

    if (canRoute(propertyName)) {
      // loop -> platform migration: cancel on loop.
      if (result.routing.loop.erase(propertyName) > 0) {
        result.loop.removedProperties.push_back(propertyName);
      }
      result.routing.platform.insert(propertyName);
      result.platform.changedProperties.push_back(buildPropertyConfig(rt, viewTag, propertyName, node.mapped()));
    } else {
      // platform -> loop migration: cancel on platform.
      if (result.routing.platform.erase(propertyName) > 0) {
        result.platform.removedProperties.push_back(propertyName);
      }
      result.routing.loop.insert(propertyName);
      result.loop.changedProperties.insert(std::move(node));
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

CSSPlatformTransitionPropertyConfig CSSPlatformTransitionProxy::buildPropertyConfig(
    jsi::Runtime &rt,
    const Tag viewTag,
    const std::string &propertyName,
    const CSSTransitionPropertySettings &propertySettings) const {
  return CSSPlatformTransitionPropertyConfig{
      viewTag,
      propertyName,
      jsi::dynamicFromValue(rt, propertySettings.value.second),
      propertySettings.duration,
      propertySettings.delay,
      propertySettings.easingConfig};
}

} // namespace reanimated::css
