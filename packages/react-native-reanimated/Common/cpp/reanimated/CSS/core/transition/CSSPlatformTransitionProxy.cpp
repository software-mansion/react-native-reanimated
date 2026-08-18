#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

#include <react/debug/react_native_assert.h>

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

bool CSSPlatformTransitionProxy::apply(
    const Tag viewTag,
    const std::string &propertyName,
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    const CSSTransitionPropertySettings *settings,
    const bool persistent,
    const double timestamp) const {
  return applyTransition_ &&
      applyTransition_(viewTag, propertyName, fromValue, toValue, settings, persistent, timestamp);
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
    const bool allowPlatform,
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

    bool routable = allowPlatform && canRoute(propertyName, settings.easingConfig);
    if (routable && hasValue) {
      const auto values = parsePlatformValues(rt, propertyName, valueIt->second.first, valueIt->second.second);
      // React commits the config path's target, so there is nothing to hold afterwards.
      routable = values && apply(viewTag, propertyName, values->first, values->second, &settings, false, timestamp);
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
    const TransitionProperties &pseudoLockedProperties,
    CSSTransitionRouting &routing,
    const bool allowPlatform,
    const double timestamp) const {
  PropertyValueDynamicDiffsMap loopDiffs;
  for (const auto &[propertyName, propertyDiff] : propertyDiffs) {
    // A platform-routed property keeps animating natively while the platform can
    // still express the toggled value; otherwise it migrates to the loop.
    if (routing.platform.contains(propertyName)) {
      if (allowPlatform) {
        const auto values = parsePlatformValues(propertyName, propertyDiff.first, propertyDiff.second);
        // Releasing the last selector targets the committed style, which needs no hold.
        const bool persistent = pseudoLockedProperties.contains(propertyName);
        if (values && apply(viewTag, propertyName, values->first, values->second, nullptr, persistent, timestamp)) {
          continue;
        }
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
