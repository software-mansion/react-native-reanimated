#include <reanimated/CSS/core/transition/CSSPlatformTransitionRouter.h>

#include <react/debug/react_native_assert.h>

#include <utility>

namespace reanimated::css {

CSSPlatformTransitionRouter::CSSPlatformTransitionRouter(
    CSSApplyPlatformTransitionFunction applyTransition,
    CSSRemoveTransitionFunction removeTransition)
    : applyTransition_(std::move(applyTransition)), removeTransition_(std::move(removeTransition)) {}

void CSSPlatformTransitionRouter::applyPlatform(
    const Tag viewTag,
    const std::string &propertyName,
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    const CSSTransitionPropertySettings &settings,
    const double timestamp) const {
  auto &properties = activeTransitions_[viewTag];
  const auto activeIt = properties.find(propertyName);
  // Targeting the in-flight transition's start value means this is a reversal.
  const ActiveTransition *previous =
      (activeIt != properties.end() && toValue == activeIt->second.adjustedStart) ? &activeIt->second : nullptr;
  ReversingState reversing = previous
      ? reverseShorten(previous->reversing, timestamp, settings.duration, settings.delay, settings.easingConfig)
      : makeReversingState(timestamp, settings.duration, settings.delay, settings.easingConfig);

  const PlatformValue adjustedStart = previous ? previous->adjustedEnd : fromValue;
  if (applyTransition_) {
    applyTransition_(
        viewTag, propertyName, fromValue, toValue, reversing.duration, reversing.startTimestamp, settings.easingConfig);
  }
  properties[propertyName] = ActiveTransition{adjustedStart, toValue, std::move(reversing), settings};
}

void CSSPlatformTransitionRouter::remove(const Tag viewTag, const std::string &propertyName) const {
  if (removeTransition_) {
    removeTransition_(viewTag, propertyName);
  }
  const auto tagIt = activeTransitions_.find(viewTag);
  if (tagIt != activeTransitions_.end()) {
    tagIt->second.erase(propertyName);
    if (tagIt->second.empty()) {
      activeTransitions_.erase(tagIt);
    }
  }
}

CSSTransitionConfig CSSPlatformTransitionRouter::processConfig(
    jsi::Runtime &rt,
    const Tag viewTag,
    const CSSTransitionConfig &config,
    CSSTransitionRouting &routing,
    const double timestamp) const {
  CSSTransitionConfig loopConfig;
  size_t matchedValues = 0;

  for (const auto &[propertyName, settings] : config.changedPropertiesSettings) {
    const auto valueIt = config.changedProperties.find(propertyName);
    const bool hasValue = valueIt != config.changedProperties.end();
    if (hasValue) {
      ++matchedValues;
    }

    bool routable = canRouteCSSProperty(propertyName, settings.easingConfig);
    if (routable && hasValue) {
      const auto from = parsePlatformValue(rt, propertyName, valueIt->second.first);
      const auto to = parsePlatformValue(rt, propertyName, valueIt->second.second);
      if (from && to) {
        applyPlatform(viewTag, propertyName, *from, *to, settings, timestamp);
      } else {
        // Can't be expressed natively, so it runs on the loop instead.
        routable = false;
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

PropertyValueDynamicDiffsMap CSSPlatformTransitionRouter::processDynamicDiffs(
    const Tag viewTag,
    const PropertyValueDynamicDiffsMap &propertyDiffs,
    CSSTransitionRouting &routing,
    const double timestamp) const {
  PropertyValueDynamicDiffsMap loopDiffs;
  for (const auto &[propertyName, propertyDiff] : propertyDiffs) {
    // A platform-routed property keeps animating natively while the platform can
    // still express the toggled value; otherwise it migrates to the loop.
    if (routing.platform.contains(propertyName)) {
      const ActiveTransition *active = nullptr;
      if (const auto tagIt = activeTransitions_.find(viewTag); tagIt != activeTransitions_.end()) {
        if (const auto activeIt = tagIt->second.find(propertyName); activeIt != tagIt->second.end()) {
          active = &activeIt->second;
        }
      }
      if (active != nullptr) {
        const auto from = parsePlatformValue(propertyName, propertyDiff.first);
        const auto to = parsePlatformValue(propertyName, propertyDiff.second);
        if (from && to) {
          // Copy: applyPlatform re-assigns this property's active entry below. The
          // toggle diff carries no settings of its own, so reuse the stored ones.
          const CSSTransitionPropertySettings settings = active->settings;
          applyPlatform(viewTag, propertyName, *from, *to, settings, timestamp);
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

void CSSPlatformTransitionRouter::cancelAll(const Tag viewTag, const TransitionProperties &properties) const {
  for (const auto &propertyName : properties) {
    remove(viewTag, propertyName);
  }
}

} // namespace reanimated::css
