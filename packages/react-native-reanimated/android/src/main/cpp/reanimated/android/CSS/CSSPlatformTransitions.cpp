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

constexpr size_t kMaxInternedEasings = 256;

} // namespace

std::size_t CSSPlatformTransitions::EasingKeyHash::operator()(const EasingKey &key) const {
  std::size_t seed = std::hash<int>{}(key.type);
  const auto combine = [&seed](const float value) {
    seed ^= std::hash<float>{}(value) + 0x9e3779b9 + (seed << 6) + (seed >> 2);
  };
  for (const float value : key.pointsX) {
    combine(value);
  }
  for (const float value : key.pointsY) {
    combine(value);
  }
  return seed;
}

CSSPlatformTransitions::CSSPlatformTransitions(
    AnimateFunction animate,
    RemoveFunction remove,
    DefineEasingFunction defineEasing)
    : animate_(std::move(animate)), remove_(std::move(remove)), defineEasing_(std::move(defineEasing)) {}

std::optional<int> CSSPlatformTransitions::easingIdFor(const PlatformEasing &easing) {
  EasingKey key{static_cast<std::uint8_t>(easing.type), easing.pointsX, easing.pointsY};
  const auto it = easingIds_.find(key);
  if (it != easingIds_.end()) {
    return it->second;
  }
  if (easingIds_.size() >= kMaxInternedEasings) {
    return std::nullopt;
  }
  const int easingId = static_cast<int>(easingIds_.size());
  defineEasing_(easingId, static_cast<int>(easing.type), easing.pointsX, easing.pointsY);
  easingIds_.emplace(std::move(key), easingId);
  return easingId;
}

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

  const auto propertyId = platformPropertyId(propertyName);
  if (!propertyId) {
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

  const auto easingId = easingIdFor(toPlatformEasing(resolvedSettings.easingConfig));
  if (!easingId) {
    return false;
  }

  if (!animate_(
          static_cast<int>(viewTag),
          *propertyId,
          *from,
          *to,
          reversing.duration,
          reversing.startTimestamp,
          *easingId,
          settings == nullptr)) {
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
  // A property without an id was never routed, so there is nothing to remove.
  if (const auto propertyId = platformPropertyId(propertyName)) {
    remove_(static_cast<int>(viewTag), *propertyId);
  }
}

} // namespace reanimated
