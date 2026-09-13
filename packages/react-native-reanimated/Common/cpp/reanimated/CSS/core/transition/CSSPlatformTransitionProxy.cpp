#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

#include <react/debug/react_native_assert.h>

#include <algorithm>
#include <utility>

namespace reanimated::css {

CSSPlatformTransitionProxy::CSSPlatformTransitionProxy(
    CSSStartTransitionFunction startTransition,
    CSSStopTransitionFunction stopTransition)
    : startTransition_(std::move(startTransition)), stopTransition_(std::move(stopTransition)) {}

bool CSSPlatformTransitionProxy::canRoute(const std::string &propertyName, const EasingConfig &easing) const {
  return startTransition_ && canRouteCSSProperty(propertyName, easing);
}

const CSSPlatformTransitionProxy::ActiveTransition *CSSPlatformTransitionProxy::activeTransitionFor(
    const Tag viewTag,
    const std::string &propertyName) const {
  const auto propertiesIt = active_.find(viewTag);
  if (propertiesIt == active_.end()) {
    return nullptr;
  }
  const auto activeIt = propertiesIt->second.find(propertyName);
  return activeIt != propertiesIt->second.end() ? &activeIt->second : nullptr;
}

bool CSSPlatformTransitionProxy::apply(
    const Tag viewTag,
    const std::string &propertyName,
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    const CSSTransitionPropertySettings *settings,
    const bool persistent,
    const double timestamp) {
  const ActiveTransition *active = activeTransitionFor(viewTag, propertyName);

  // The toggle path has no settings of its own, so it reuses the stored ones.
  const bool reusesStoredSettings = settings == nullptr;
  if (reusesStoredSettings && active == nullptr) {
    return false;
  }
  const CSSTransitionPropertySettings resolvedSettings = reusesStoredSettings ? active->settings : *settings;

  const bool isReversal = active != nullptr && active->adjustedStart && toValue == *active->adjustedStart;
  ReversingState reversing = isReversal
      ? reverseShorten(
            active->reversing,
            timestamp,
            resolvedSettings.duration,
            resolvedSettings.delay,
            resolvedSettings.easingConfig)
      : makeReversingState(timestamp, resolvedSettings.duration, resolvedSettings.delay, resolvedSettings.easingConfig);

  std::optional<PlatformValue> adjustedStart;
  std::optional<PlatformValue> startValue;
  if (active == nullptr) {
    adjustedStart = startValue = fromValue;
  } else {
    // Interruptions resume from the value on the outgoing timeline.
    startValue = getCurrentValue(viewTag, propertyName, timestamp);
    // CSS reversals target the interrupted transition's adjusted start value.
    adjustedStart = isReversal ? active->adjustedEnd : startValue;
  }

  if (!startTransition_ ||
      !startTransition_(
          viewTag,
          propertyName,
          fromValue,
          toValue,
          reversing.duration,
          reversing.startTimestamp,
          resolvedSettings.easingConfig,
          persistent)) {
    return false;
  }

  active_[viewTag][propertyName] =
      ActiveTransition{adjustedStart, startValue, toValue, std::move(reversing), resolvedSettings};
  return true;
}

void CSSPlatformTransitionProxy::remove(const Tag viewTag, const std::string &propertyName) {
  const auto propertiesIt = active_.find(viewTag);
  if (propertiesIt != active_.end()) {
    propertiesIt->second.erase(propertyName);
    if (propertiesIt->second.empty()) {
      active_.erase(propertiesIt);
    }
  }

  if (stopTransition_) {
    stopTransition_(viewTag, propertyName);
  }
}

std::optional<PlatformValue> CSSPlatformTransitionProxy::getCurrentValue(
    const Tag viewTag,
    const std::string &propertyName,
    const double timestamp) const {
  const ActiveTransition *active = activeTransitionFor(viewTag, propertyName);
  if (active == nullptr || !active->startValue) {
    return std::nullopt;
  }
  const auto &reversing = active->reversing;
  const double progress =
      reversing.duration > 0 ? std::clamp((timestamp - reversing.startTimestamp) / reversing.duration, 0.0, 1.0) : 1.0;
  return lerpPlatformValues(
      *active->startValue, active->adjustedEnd, getEasingFunctionFromConfig(reversing.easing)(progress));
}

CSSTransitionConfig CSSPlatformTransitionProxy::processConfig(
    jsi::Runtime &rt,
    const Tag viewTag,
    const CSSTransitionConfig &config,
    CSSTransitionRouting &routing,
    const bool allowPlatform,
    const double timestamp) {
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
      routable = values && apply(viewTag, propertyName, values->first, values->second, &settings, false, timestamp);
    } else if (routable) {
      routable = routing.platform.contains(propertyName);
    }

    if (routable) {
      if (routing.loop.erase(propertyName) > 0) {
        loopConfig.removedProperties.push_back(propertyName);
      }
      routing.platform.insert(propertyName);
    } else {
      std::optional<double> resumeFrom;
      if (routing.platform.erase(propertyName) > 0) {
        if (hasValue) {
          resumeFrom = getResumeValue(viewTag, propertyName, timestamp);
        }
        remove(viewTag, propertyName);
      }
      routing.loop.insert(propertyName);
      if (hasValue) {
        auto fromValue = resumeFrom ? jsi::Value(*resumeFrom) : jsi::Value(rt, valueIt->second.first);
        loopConfig.changedProperties.emplace(
            propertyName, std::make_pair(std::move(fromValue), jsi::Value(rt, valueIt->second.second)));
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
    const double timestamp) {
  PropertyValueDynamicDiffsMap loopDiffs;
  for (const auto &[propertyName, propertyDiff] : propertyDiffs) {
    if (routing.platform.contains(propertyName)) {
      if (allowPlatform) {
        const auto values = parsePlatformValues(propertyName, propertyDiff.first, propertyDiff.second);
        const bool persistent = pseudoLockedProperties.contains(propertyName);
        if (values && apply(viewTag, propertyName, values->first, values->second, nullptr, persistent, timestamp)) {
          continue;
        }
      }
      routing.platform.erase(propertyName);
      // Read before remove(): it drops the timeline this resumes from.
      const auto resumeFrom = getResumeValue(viewTag, propertyName, timestamp);
      remove(viewTag, propertyName);
      routing.loop.insert(propertyName);
      if (resumeFrom) {
        loopDiffs.emplace(propertyName, std::make_pair(folly::dynamic(*resumeFrom), propertyDiff.second));
        continue;
      }
    }
    loopDiffs.emplace(propertyName, propertyDiff);
  }
  return loopDiffs;
}

std::optional<double> CSSPlatformTransitionProxy::getResumeValue(
    const Tag viewTag,
    const std::string &propertyName,
    const double timestamp) const {
  const auto value = getCurrentValue(viewTag, propertyName, timestamp);
  if (!value) {
    return std::nullopt;
  }
  const auto *scalar = std::get_if<double>(&*value);
  return scalar != nullptr ? std::optional(*scalar) : std::nullopt;
}

void CSSPlatformTransitionProxy::cancelAll(const Tag viewTag, const TransitionProperties &properties) {
  for (const auto &propertyName : properties) {
    remove(viewTag, propertyName);
  }
}

} // namespace reanimated::css
