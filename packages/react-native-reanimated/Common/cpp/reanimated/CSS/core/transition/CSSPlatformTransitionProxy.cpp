#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

#include <react/debug/react_native_assert.h>

#include <utility>

namespace reanimated::css {

CSSPlatformTransitionProxy::CSSPlatformTransitionProxy(
    CSSCanRoutePropertyFunction canRoute,
    CSSApplyTransitionJSIFunction applyJSI,
    CSSApplyTransitionDynamicFunction applyDynamic,
    CSSRemoveTransitionFunction removeTransition)
    : canRoute_(std::move(canRoute)),
      applyJSI_(std::move(applyJSI)),
      applyDynamic_(std::move(applyDynamic)),
      removeTransition_(std::move(removeTransition)) {}

bool CSSPlatformTransitionProxy::canRoute(const std::string &propertyName, const EasingConfig &easing) const {
  return canRoute_ && canRoute_(propertyName, easing);
}

bool CSSPlatformTransitionProxy::apply(
    jsi::Runtime &rt,
    const Tag viewTag,
    const std::string &propertyName,
    const jsi::Value &fromValue,
    const jsi::Value &toValue,
    const CSSTransitionPropertySettings &settings,
    const double timestamp) const {
  return applyJSI_ && applyJSI_(rt, viewTag, propertyName, fromValue, toValue, settings, timestamp);
}

bool CSSPlatformTransitionProxy::apply(
    const Tag viewTag,
    const std::string &propertyName,
    const folly::dynamic &fromValue,
    const folly::dynamic &toValue,
    const double timestamp) const {
  return applyDynamic_ && applyDynamic_(viewTag, propertyName, fromValue, toValue, timestamp);
}

void CSSPlatformTransitionProxy::remove(const Tag viewTag, const std::string &propertyName) const {
  if (removeTransition_) {
    removeTransition_(viewTag, propertyName);
  }
}

CSSTransitionConfig CSSPlatformTransitionProxy::processConfig(
    jsi::Runtime &rt,
    const Tag viewTag,
    const CSSTransitionConfig &config,
    CSSTransitionRouting &routing,
    const double timestamp) const {
  CSSTransitionConfig loopConfig;
#ifndef NDEBUG
  size_t matchedValues = 0;
#endif // NDEBUG

  for (const auto &[propertyName, settings] : config.changedPropertiesSettings) {
    const auto valueIt = config.changedProperties.find(propertyName);
    const bool hasValue = valueIt != config.changedProperties.end();
#ifndef NDEBUG
    if (hasValue) {
      ++matchedValues;
    }
#endif // NDEBUG

    bool routable = canRoute(propertyName, settings.easingConfig);
    if (routable && hasValue) {
      routable = apply(rt, viewTag, propertyName, valueIt->second.first, valueIt->second.second, settings, timestamp);
    } else if (routable) {
      // Settings-only: stay on the platform only if already animating there.
      routable = routing.platform.contains(propertyName);
    }

    if (routable) {
      // loop -> platform migration cancels on the loop side.
      if (routing.loop.erase(propertyName) > 0) {
        loopConfig.removedProperties.push_back(propertyName);
      }
      routing.platform.insert(propertyName);
    } else {
      // platform -> loop migration cancels on the platform side.
      if (routing.platform.erase(propertyName) > 0) {
        remove(viewTag, propertyName);
      }
      routing.loop.insert(propertyName);
      if (hasValue) {
        loopConfig.changedProperties.emplace(
            propertyName,
            std::make_pair(jsi::Value(rt, valueIt->second.first), jsi::Value(rt, valueIt->second.second)));
      }
      loopConfig.changedPropertiesSettings.emplace(propertyName, settings);
    }
  }

  // The parser pairs every value diff with settings, so all must have matched one.
  react_native_assert(
      matchedValues == config.changedProperties.size() && "[Reanimated] CSS transition value diff without settings");

  for (const auto &propertyName : config.removedProperties) {
    if (routing.platform.erase(propertyName) > 0) {
      remove(viewTag, propertyName);
    } else if (routing.loop.erase(propertyName) > 0) {
      loopConfig.removedProperties.push_back(propertyName);
    }
  }

  return loopConfig;
}

PropertyValueDynamicDiffsMap CSSPlatformTransitionProxy::processDynamicDiffs(
    const Tag viewTag,
    const PropertyValueDynamicDiffsMap &propertyDiffs,
    CSSTransitionRouting &routing,
    const double timestamp) const {
  PropertyValueDynamicDiffsMap loopDiffs;
  for (const auto &[propertyName, propertyDiff] : propertyDiffs) {
    // A platform-routed property keeps animating natively while the platform can
    // still express the toggled value; otherwise it migrates to the loop.
    if (routing.platform.contains(propertyName)) {
      if (apply(viewTag, propertyName, propertyDiff.first, propertyDiff.second, timestamp)) {
        continue;
      }
      routing.platform.erase(propertyName);
      remove(viewTag, propertyName);
      routing.loop.insert(propertyName);
    }
    loopDiffs.emplace(propertyName, propertyDiff);
  }
  return loopDiffs;
}

void CSSPlatformTransitionProxy::cancelAll(const Tag viewTag, const TransitionProperties &properties) const {
  for (const auto &propertyName : properties) {
    remove(viewTag, propertyName);
  }
}

} // namespace reanimated::css
