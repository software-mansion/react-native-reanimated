#include <reanimated/android/CSS/CSSPlatformTransitions.h>

#include <reanimated/CSS/easing/EasingConfigs.h>

#include <variant>
#include <vector>

#include <utility>

namespace reanimated {

namespace {

std::vector<float> toFloats(const std::vector<double> &values) {
  return {values.begin(), values.end()};
}

PlatformEasing toPlatformEasing(const css::EasingConfig &easingConfig) {
  if (const auto *bezier = std::get_if<css::CubicBezierEasing>(&easingConfig)) {
    return {
        PlatformEasing::Type::CubicBezier,
        {static_cast<float>(bezier->x1), static_cast<float>(bezier->x2)},
        {static_cast<float>(bezier->y1), static_cast<float>(bezier->y2)}};
  }
  if (const auto *steps = std::get_if<css::StepsEasing>(&easingConfig)) {
    return {PlatformEasing::Type::Steps, toFloats(steps->pointsX), toFloats(steps->pointsY)};
  }
  if (const auto *stops = std::get_if<css::LinearStopsEasing>(&easingConfig)) {
    return {PlatformEasing::Type::LinearStops, toFloats(stops->pointsX), toFloats(stops->pointsY)};
  }
  return {PlatformEasing::Type::Linear, {}, {}};
}

/// Must match cssPropertyWriterFor on the Kotlin side.
std::optional<int> platformPropertyId(const std::string &propertyName) {
  if (propertyName == "opacity") {
    return 0;
  }
  return std::nullopt;
}

} // namespace

CSSPlatformTransitions::CSSPlatformTransitions(
    AnimateFunction animate,
    RemoveFunction remove,
    std::shared_ptr<CSSPlatformEasings> easings)
    : easings_(std::move(easings)), animate_(std::move(animate)), remove_(std::move(remove)) {}

const CSSPlatformTransitions::ActiveTransition *CSSPlatformTransitions::activeTransitionFor(
    const Tag viewTag,
    const std::string &propertyName) const {
  const auto propertiesIt = active_.find(viewTag);
  if (propertiesIt == active_.end()) {
    return nullptr;
  }
  const auto activeIt = propertiesIt->second.find(propertyName);
  return activeIt != propertiesIt->second.end() ? &activeIt->second : nullptr;
}

bool CSSPlatformTransitions::applyTransition(
    const Tag viewTag,
    const std::string &propertyName,
    const css::PlatformValue &fromValue,
    const css::PlatformValue &toValue,
    const css::CSSTransitionPropertySettings *settings,
    const bool persistent,
    const double timestamp) {
  // Only scalars are routed today (opacity); anything else stays on the loop.
  const auto *from = std::get_if<double>(&fromValue);
  const auto *to = std::get_if<double>(&toValue);
  if (from == nullptr || to == nullptr) {
    return false;
  }

  // has_value(), not a truthiness test: opacity's id is 0.
  const auto propertyId = platformPropertyId(propertyName);
  if (!propertyId.has_value()) {
    return false;
  }

  const ActiveTransition *active = activeTransitionFor(viewTag, propertyName);

  if (settings == nullptr && active == nullptr) {
    return false;
  }
  // Copy: the active entry is re-assigned below.
  const css::CSSTransitionPropertySettings resolvedSettings = settings == nullptr ? active->settings : *settings;
  const int replacedEasingId = active != nullptr ? active->easingId : -1;

  // Targeting the in-flight transition's start value means this is a reversal.
  const bool isReversal = active != nullptr && active->adjustedStart && toValue == *active->adjustedStart;
  css::ReversingState reversing = isReversal
      ? css::reverseShorten(
            active->reversing,
            timestamp,
            resolvedSettings.duration,
            resolvedSettings.delay,
            resolvedSettings.easingConfig)
      : css::makeReversingState(
            timestamp, resolvedSettings.duration, resolvedSettings.delay, resolvedSettings.easingConfig);

  std::optional<css::PlatformValue> adjustedStart;
  std::optional<css::PlatformValue> startValue;
  if (active == nullptr) {
    adjustedStart = startValue = fromValue;
  } else {
    // An interruption starts from the value on screen, which the outgoing timeline
    // still describes; active_ is only re-assigned below. A finished transition
    // retraces to its own end, so this covers that case too.
    startValue = getCurrentValue(viewTag, propertyName, timestamp);
    // https://drafts.csswg.org/css-transitions/#reversing: a reversal has to target
    // where the interrupted one began, anything else starts its own reversing run.
    adjustedStart = isReversal ? active->adjustedEnd : startValue;
  }

  const int easingId = easings_->acquire(toPlatformEasing(resolvedSettings.easingConfig));

  if (!animate_(
          static_cast<int>(viewTag),
          *propertyId,
          *from,
          *to,
          reversing.duration,
          reversing.startTimestamp,
          easingId,
          persistent)) {
    easings_->release(easingId);
    return false;
  }

  // After the acquire above: a retrigger with the same curve would otherwise drop it to zero
  // and rebuild the interpolator.
  if (replacedEasingId >= 0) {
    easings_->release(replacedEasingId);
  }

  active_[viewTag][propertyName] =
      ActiveTransition{adjustedStart, startValue, toValue, std::move(reversing), resolvedSettings, easingId};
  return true;
}

std::optional<css::PlatformValue> CSSPlatformTransitions::getCurrentValue(
    const Tag viewTag,
    const std::string &propertyName,
    const double timestamp) const {
  const auto *active = activeTransitionFor(viewTag, propertyName);
  if (active == nullptr || !active->startValue) {
    return std::nullopt;
  }
  const auto &reversing = active->reversing;
  const double progress =
      reversing.duration > 0 ? std::clamp((timestamp - reversing.startTimestamp) / reversing.duration, 0.0, 1.0) : 1.0;
  return css::lerpPlatformValues(
      *active->startValue, active->adjustedEnd, css::getEasingFunctionFromConfig(reversing.easing)(progress));
}

void CSSPlatformTransitions::removeTransition(const Tag viewTag, const std::string &propertyName) {
  const auto propertiesIt = active_.find(viewTag);
  if (propertiesIt != active_.end()) {
    const auto activeIt = propertiesIt->second.find(propertyName);
    if (activeIt != propertiesIt->second.end()) {
      easings_->release(activeIt->second.easingId);
      propertiesIt->second.erase(activeIt);
    }
    if (propertiesIt->second.empty()) {
      active_.erase(propertiesIt);
    }
  }
  // A property without an id was never routed, so there is nothing to remove.
  if (const auto propertyId = platformPropertyId(propertyName); propertyId.has_value()) {
    remove_(static_cast<int>(viewTag), *propertyId);
  }
}

} // namespace reanimated
