#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

#include <react/debug/react_native_assert.h>

#include <jsi/JSIDynamic.h>

#include <utility>

namespace reanimated::css {

CSSPlatformTransitionProxy::CSSPlatformTransitionProxy(
    CSSCanRoutePropertyFunction canRoute,
    CSSApplyTransitionJSIFunction applyJSI,
    CSSApplyTransitionDynamicFunction applyDynamic,
    CSSRemoveTransitionFunction removeTransition,
    CSSAnimateTransformFunction animateTransform)
    : canRoute_(std::move(canRoute)),
      applyJSI_(std::move(applyJSI)),
      applyDynamic_(std::move(applyDynamic)),
      removeTransition_(std::move(removeTransition)),
      animateTransform_(std::move(animateTransform)) {}

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

bool CSSPlatformTransitionProxy::applyTransform(
    const Tag viewTag,
    const folly::dynamic &fromValue,
    const folly::dynamic &toValue,
    const CSSTransitionPropertySettings &settings,
    const double timestamp,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const folly::dynamic &lastUpdates) const {
  if (!animateTransform_ || !isTransformRoutable(fromValue, toValue)) {
    return false;
  }

  const std::string propertyName = "transform";
  const std::string componentName = shadowNode->getComponentName();

  TransformTransitionState *active = findTransformState(viewTag, propertyName);

  // Declared endpoints (reversal-bookkeeping values), materialized once.
  auto [declaredFrom, declaredTo] =
      resolveTransformEndpoints(shadowNode, componentName, viewStylesRepository, fromValue, toValue);

  // Sampling-from value on a retarget: continue an in-flight transition from its
  // exact current value computed with the loop's interpolation (a presentation
  // matrix would collapse rotation count); otherwise prefer the loop's last
  // written frame (a transition migrating loop -> platform mid-flight). The guard
  // uses linear progress - overshooting easings can exceed 1 mid-flight.
  folly::dynamic samplingFrom = declaredFrom;
  const double linearProgress =
      active != nullptr && !active->fromDynamic.isNull() ? linearProgressAt(active->reversing, timestamp) : 1.0;
  if (linearProgress < 1.0) {
    samplingFrom = interpolateTransformValueAt(
        shadowNode,
        componentName,
        viewStylesRepository,
        active->fromDynamic,
        active->toDynamic,
        getEasingFunctionFromConfig(active->reversing.easing)(linearProgress));
  } else if (lastUpdates.isObject()) {
    const auto lastIt = lastUpdates.find(propertyName);
    if (lastIt != lastUpdates.items().end() && !lastIt->second.isNull()) {
      samplingFrom = lastIt->second;
    }
  }

  // Targeting the in-flight transition's start value means this is a reversal.
  TransformTransitionState *previous =
      (active != nullptr && declaredTo == active->adjustedStart) ? active : nullptr;
  ReversingState reversing = previous
      ? reverseShorten(previous->reversing, timestamp, settings.duration, settings.delay, settings.easingConfig)
      : makeReversingState(timestamp, settings.duration, settings.delay, settings.easingConfig);

  folly::dynamic adjustedStart = previous ? previous->toDynamic : declaredFrom;

  const auto plan =
      buildTransformAnimationPlan(shadowNode, componentName, viewStylesRepository, samplingFrom, declaredTo);

  animateTransform_(viewTag, plan, reversing.duration, reversing.startTimestamp, settings.easingConfig);

  TransformTransitionState entry;
  entry.adjustedStart = std::move(adjustedStart);
  entry.fromDynamic = std::move(samplingFrom);
  entry.toDynamic = std::move(declaredTo);
  entry.reversing = std::move(reversing);
  entry.settings = settings;
  entry.componentName = componentName;
  transformStates_[viewTag][propertyName] = std::move(entry);
  return true;
}

CSSPlatformTransitionProxy::TransformTransitionState *CSSPlatformTransitionProxy::findTransformState(
    const Tag viewTag,
    const std::string &propertyName) const {
  const auto statesIt = transformStates_.find(viewTag);
  if (statesIt == transformStates_.end()) {
    return nullptr;
  }
  const auto stateIt = statesIt->second.find(propertyName);
  return stateIt != statesIt->second.end() ? &stateIt->second : nullptr;
}

void CSSPlatformTransitionProxy::remove(const Tag viewTag, const std::string &propertyName) const {
  const auto statesIt = transformStates_.find(viewTag);
  if (statesIt != transformStates_.end()) {
    statesIt->second.erase(propertyName);
    if (statesIt->second.empty()) {
      transformStates_.erase(statesIt);
    }
  }
  if (removeTransition_) {
    removeTransition_(viewTag, propertyName);
  }
}

folly::dynamic CSSPlatformTransitionProxy::getTargetValue(const Tag viewTag, const std::string &propertyName) const {
  // Only transform carries a common-side target; scalars return null (they are
  // distinguished by the platform's CALayer model, not by a recorded value).
  const auto *state = findTransformState(viewTag, propertyName);
  return state != nullptr ? state->toDynamic : folly::dynamic();
}

void CSSPlatformTransitionProxy::migrateToLoop(
    const Tag viewTag,
    const std::string &propertyName,
    const double timestamp,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    folly::dynamic &lastUpdates) const {
  // Read the exact in-flight value before cancelling so the loop continues from
  // it (mirrors the loop reading its last written frame on retarget). Only
  // transform supplies a value here; scalars rely on the presentation layer.
  // The reversing snapshot drives the re-derivation; the presentation-layer
  // matrix would collapse rotation count and so can't be used.
  const auto *state = findTransformState(viewTag, propertyName);
  if (state != nullptr && !state->fromDynamic.isNull()) {
    auto currentValue = interpolateTransformValueAt(
        shadowNode,
        state->componentName,
        viewStylesRepository,
        state->fromDynamic,
        state->toDynamic,
        easedProgressAt(state->reversing, timestamp));
    if (!currentValue.isNull()) {
      if (!lastUpdates.isObject()) {
        lastUpdates = folly::dynamic::object();
      }
      lastUpdates[propertyName] = std::move(currentValue);
    }
  }
  remove(viewTag, propertyName);
}

CSSTransitionConfig CSSPlatformTransitionProxy::processConfig(
    jsi::Runtime &rt,
    const Tag viewTag,
    const CSSTransitionConfig &config,
    CSSTransitionRouting &routing,
    const double timestamp,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    folly::dynamic &lastUpdates) const {
  CSSTransitionConfig loopConfig;
  size_t matchedValues = 0;

  for (const auto &[propertyName, settings] : config.changedPropertiesSettings) {
    const auto valueIt = config.changedProperties.find(propertyName);
    const bool hasValue = valueIt != config.changedProperties.end();
    if (hasValue) {
      ++matchedValues;
    }

    bool routable = canRoute(propertyName, settings.easingConfig);
    if (routable && hasValue) {
      if (propertyName == "transform") {
        routable = applyTransform(
            viewTag,
            jsi::dynamicFromValue(rt, valueIt->second.first),
            jsi::dynamicFromValue(rt, valueIt->second.second),
            settings,
            timestamp,
            shadowNode,
            viewStylesRepository,
            lastUpdates);
      } else {
        routable = apply(rt, viewTag, propertyName, valueIt->second.first, valueIt->second.second, settings, timestamp);
      }
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
      // platform -> loop migration cancels on the platform side, after capturing
      // the in-flight value so the loop run picks it up as the from value.
      if (routing.platform.erase(propertyName) > 0) {
        migrateToLoop(viewTag, propertyName, timestamp, shadowNode, viewStylesRepository, lastUpdates);
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
    const double timestamp,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    folly::dynamic &lastUpdates) const {
  PropertyValueDynamicDiffsMap loopDiffs;
  for (const auto &[propertyName, propertyDiff] : propertyDiffs) {
    // A platform-routed property keeps animating natively while the platform can
    // still express the toggled value; otherwise it migrates to the loop.
    if (routing.platform.contains(propertyName)) {
      bool applied = false;
      if (propertyName == "transform") {
        // The toggle path carries no settings of its own; reuse the ones the
        // config apply stored on the transform state. No stored state means no
        // config apply ran, so there is nothing to toggle natively.
        const auto *state = findTransformState(viewTag, propertyName);
        if (state != nullptr) {
          applied = applyTransform(
              viewTag,
              propertyDiff.first,
              propertyDiff.second,
              state->settings,
              timestamp,
              shadowNode,
              viewStylesRepository,
              lastUpdates);
        }
      } else {
        applied = apply(viewTag, propertyName, propertyDiff.first, propertyDiff.second, timestamp);
      }
      if (applied) {
        continue;
      }
      routing.platform.erase(propertyName);
      migrateToLoop(viewTag, propertyName, timestamp, shadowNode, viewStylesRepository, lastUpdates);
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
