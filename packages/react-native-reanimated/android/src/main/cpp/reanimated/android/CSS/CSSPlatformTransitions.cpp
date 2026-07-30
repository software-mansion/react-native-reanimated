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

} // namespace

CSSPlatformTransitions::CSSPlatformTransitions(AnimateFunction animate, RemoveFunction remove)
    : animate_(std::move(animate)), remove_(std::move(remove)) {}

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
    const double timestamp) {
  // Only scalars are routed today (opacity); anything else stays on the loop.
  const auto *from = std::get_if<double>(&fromValue);
  const auto *to = std::get_if<double>(&toValue);
  if (from == nullptr || to == nullptr) {
    return false;
  }

  const ActiveTransition *active = activeTransitionFor(viewTag, propertyName);

  if (settings == nullptr && active == nullptr) {
    return false;
  }
  // Copy: the active entry is re-assigned below.
  const css::CSSTransitionPropertySettings resolvedSettings = settings == nullptr ? active->settings : *settings;

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

  // https://drafts.csswg.org/css-transitions/#reversing
  std::optional<css::PlatformValue> adjustedStart;
  if (isReversal) {
    adjustedStart = active->adjustedEnd;
  } else if (active == nullptr) {
    adjustedStart = fromValue;
  } else if (timestamp >= active->reversing.startTimestamp + active->reversing.duration) {
    adjustedStart = active->adjustedEnd;
  }

  if (!animate_(
          static_cast<int>(viewTag),
          propertyName,
          *from,
          *to,
          reversing.duration,
          reversing.startTimestamp,
          toPlatformEasing(resolvedSettings.easingConfig))) {
    return false;
  }

  active_[viewTag][propertyName] = ActiveTransition{adjustedStart, toValue, std::move(reversing), resolvedSettings};
  return true;
}

void CSSPlatformTransitions::removeTransition(const Tag viewTag, const std::string &propertyName) {
  const auto propertiesIt = active_.find(viewTag);
  if (propertiesIt != active_.end()) {
    propertiesIt->second.erase(propertyName);
    if (propertiesIt->second.empty()) {
      active_.erase(propertiesIt);
    }
  }
  remove_(static_cast<int>(viewTag), propertyName);
}

} // namespace reanimated
