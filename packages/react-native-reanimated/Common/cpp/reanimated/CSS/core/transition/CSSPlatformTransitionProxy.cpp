#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

#include <react/debug/react_native_assert.h>

#include <utility>

namespace reanimated::css {

CSSPlatformTransitionProxy::CSSPlatformTransitionProxy(std::shared_ptr<CSSPlatformTransitionBackend> backend)
    : backend_(std::move(backend)) {}

bool CSSPlatformTransitionProxy::canRoute(const std::string &propertyName, const EasingConfig &easing) const {
  return backend_ && backend_->canRoute(propertyName, easing);
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
    const SurfaceId surfaceId,
    const Tag viewTag,
    const std::string &propertyName,
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    const CSSTransitionPropertySettings *settings,
    const bool holdsEndValue,
    const double timestamp) {
  const ActiveTransition *active = activeTransitionFor(viewTag, propertyName);

  const bool reusesStoredSettings = settings == nullptr;
  if (reusesStoredSettings && active == nullptr) {
    return false;
  }
  // Copy: the active entry is re-assigned below.
  const CSSTransitionPropertySettings resolvedSettings = reusesStoredSettings ? active->settings : *settings;

  // https://drafts.csswg.org/css-transitions/#reversing
  const bool isReversal = active != nullptr && active->adjustedStart && toValue == *active->adjustedStart;
  TransitionTiming timing = isReversal
      ? reverseTiming(
            active->timing, timestamp, resolvedSettings.duration, resolvedSettings.delay, resolvedSettings.easingConfig)
      : makeTiming(timestamp, resolvedSettings.duration, resolvedSettings.delay, resolvedSettings.easingConfig);

  std::optional<PlatformValue> adjustedStart;
  std::optional<PlatformValue> startValue;
  if (active == nullptr) {
    adjustedStart = startValue = fromValue;
  } else {
    startValue = getCurrentValue(viewTag, propertyName, timestamp);
    adjustedStart = isReversal ? active->adjustedEnd : startValue;
  }

  if (!backend_) {
    return false;
  }
  // The backend gets fromValue, not startValue: on interruption it continues from
  // what is on screen itself.
  const auto runId = backend_->startTransition({
      surfaceId,
      viewTag,
      propertyName,
      fromValue,
      toValue,
      timing.duration,
      timing.startTimestamp,
      resolvedSettings.easingConfig,
      holdsEndValue,
  });
  if (!runId) {
    return false;
  }

  active_[viewTag][propertyName] =
      ActiveTransition{adjustedStart, startValue, toValue, std::move(timing), resolvedSettings, *runId};
  return true;
}

void CSSPlatformTransitionProxy::forget(const Tag viewTag, const std::string &propertyName) {
  const auto propertiesIt = active_.find(viewTag);
  if (propertiesIt != active_.end()) {
    propertiesIt->second.erase(propertyName);
    if (propertiesIt->second.empty()) {
      active_.erase(propertiesIt);
    }
  }
}

void CSSPlatformTransitionProxy::remove(const SurfaceId surfaceId, const Tag viewTag, const std::string &propertyName) {
  forget(viewTag, propertyName);
  if (backend_) {
    backend_->stopTransition(surfaceId, viewTag, propertyName);
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
  return lerpPlatformValues(*active->startValue, active->adjustedEnd, easedProgressAt(active->timing, timestamp));
}

CSSTransitionConfig CSSPlatformTransitionProxy::processConfig(
    jsi::Runtime &rt,
    const SurfaceId surfaceId,
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
      // React commits the config path's target, so there is nothing to hold afterwards.
      routable =
          values && apply(surfaceId, viewTag, propertyName, values->first, values->second, &settings, false, timestamp);
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
      // Sampled before remove() drops the run this resumes from; nullopt keeps the
      // diff's own from-value, which the animation has painted past.
      std::optional<PlatformValue> resumeFrom;
      if (routing.platform.erase(propertyName) > 0) {
        if (hasValue) {
          resumeFrom = getCurrentValue(viewTag, propertyName, timestamp);
        }
        remove(surfaceId, viewTag, propertyName);
      }
      routing.loop.insert(propertyName);
      if (hasValue) {
        auto fromValue = resumeFrom ? platformValueToJSI(rt, *resumeFrom) : jsi::Value(rt, valueIt->second.first);
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
      remove(surfaceId, viewTag, propertyName);
    } else if (routing.loop.erase(propertyName) > 0) {
      loopConfig.removedProperties.push_back(propertyName);
    }
  }

  return loopConfig;
}

PropertyValueDynamicDiffsMap CSSPlatformTransitionProxy::processDynamicDiffs(
    const SurfaceId surfaceId,
    const Tag viewTag,
    const PropertyValueDynamicDiffsMap &propertyDiffs,
    const TransitionProperties &pseudoLockedProperties,
    CSSTransitionRouting &routing,
    const bool allowPlatform,
    const double timestamp) {
  PropertyValueDynamicDiffsMap loopDiffs;
  for (const auto &[propertyName, propertyDiff] : propertyDiffs) {
    // A platform-routed property keeps animating natively while the platform can
    // still express the toggled value; otherwise it migrates to the loop.
    if (routing.platform.contains(propertyName)) {
      if (allowPlatform) {
        const auto values = parsePlatformValues(propertyName, propertyDiff.first, propertyDiff.second);
        // Releasing the last selector targets the committed style, which needs no hold.
        const bool holdsEndValue = pseudoLockedProperties.contains(propertyName);
        if (values &&
            apply(surfaceId, viewTag, propertyName, values->first, values->second, nullptr, holdsEndValue, timestamp)) {
          continue;
        }
      }
      routing.platform.erase(propertyName);
      // Read before remove() drops the run this resumes from.
      const auto resumeFrom = getCurrentValue(viewTag, propertyName, timestamp);
      remove(surfaceId, viewTag, propertyName);
      routing.loop.insert(propertyName);
      if (resumeFrom) {
        loopDiffs.emplace(propertyName, std::make_pair(platformValueToDynamic(*resumeFrom), propertyDiff.second));
        continue;
      }
    }
    loopDiffs.emplace(propertyName, propertyDiff);
  }
  return loopDiffs;
}

std::optional<CSSPlatformTransitionProxy::EndedRun> CSSPlatformTransitionProxy::takeEndedRun(
    const Tag viewTag,
    const std::string &propertyName,
    const CSSPlatformTransitionRunId runId) {
  const ActiveTransition *active = activeTransitionFor(viewTag, propertyName);
  if (active == nullptr || active->runId != runId) {
    return std::nullopt;
  }
  EndedRun endedRun{
      active->startValue.value_or(active->adjustedEnd), active->adjustedEnd, active->timing, active->settings};
  forget(viewTag, propertyName);
  return endedRun;
}

void CSSPlatformTransitionProxy::cancelAll(
    const SurfaceId surfaceId,
    const Tag viewTag,
    const TransitionProperties &properties) {
  for (const auto &propertyName : properties) {
    remove(surfaceId, viewTag, propertyName);
  }
}

} // namespace reanimated::css
