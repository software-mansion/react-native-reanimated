#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

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

CSSPlatformTransitionProxy::ProcessedConfig CSSPlatformTransitionProxy::processConfig(
    CSSTransitionConfig &&config,
    const CSSTransitionRouting &previousRouting) const {
  ProcessedConfig result;
  result.routing = previousRouting;

  // Drain via extract() so move-only PropertySettings (jsi::Value) can be
  // moved into the matching bucket.
  while (!config.changedProperties.empty()) {
    auto node = config.changedProperties.extract(config.changedProperties.begin());
    const auto &propertyName = node.key();

    if (canRoute(propertyName, node.mapped().easingConfig)) {
      if (result.routing.loop.erase(propertyName) > 0) {
        result.loop.removedProperties.push_back(propertyName);
      }
      result.routing.platform.insert(propertyName);
      result.platform.changedProperties.insert(std::move(node));
    } else {
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

} // namespace reanimated::css
