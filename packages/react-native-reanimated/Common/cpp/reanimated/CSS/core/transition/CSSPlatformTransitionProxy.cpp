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

CSSPlatformTransitionProxy::ProcessedConfig
CSSPlatformTransitionProxy::processConfig(jsi::Runtime &rt, const Tag viewTag, CSSTransitionConfig &&config) const {
  ProcessedConfig result;

  // Drain changedProperties by extracting nodes - preserves the move-only
  // CSSTransitionPropertySettings (which holds non-copyable jsi::Value).
  while (!config.changedProperties.empty()) {
    auto node = config.changedProperties.extract(config.changedProperties.begin());
    if (canRoute(node.key())) {
      result.platform.changedProperties.push_back(buildPropertyConfig(rt, viewTag, node.key(), node.mapped()));
    } else {
      result.loop.changedProperties.insert(std::move(node));
    }
  }

  for (auto &propertyName : config.removedProperties) {
    if (canRoute(propertyName)) {
      result.platform.removedProperties.push_back(std::move(propertyName));
    } else {
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
