#include <reanimated/android/CSS/CSSPlatformTransitions.h>

#include <optional>
#include <string>
#include <utility>
#include <variant>
#include <vector>

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

bool CSSPlatformTransitions::startTransition(
    const Tag viewTag,
    const std::string &propertyName,
    const css::PlatformValue &fromValue,
    const css::PlatformValue &toValue,
    const double durationMs,
    const double startTimestampMs,
    const css::EasingConfig &easing,
    const bool persistent) {
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

  const int easingId = easings_->acquire(toPlatformEasing(easing));
  if (!animate_(
          static_cast<int>(viewTag), *propertyId, *from, *to, durationMs, startTimestampMs, easingId, persistent)) {
    easings_->release(easingId);
    return false;
  }

  replaceEasingId(viewTag, propertyName, easingId);
  return true;
}

void CSSPlatformTransitions::replaceEasingId(const Tag viewTag, const std::string &propertyName, const int easingId) {
  auto &propertyIds = easingIds_[viewTag];
  const auto it = propertyIds.find(propertyName);
  if (it == propertyIds.end()) {
    propertyIds.emplace(propertyName, easingId);
    return;
  }
  easings_->release(it->second);
  it->second = easingId;
}

void CSSPlatformTransitions::stopTransition(const Tag viewTag, const std::string &propertyName) {
  const auto propertyIdsIt = easingIds_.find(viewTag);
  if (propertyIdsIt != easingIds_.end()) {
    const auto it = propertyIdsIt->second.find(propertyName);
    if (it != propertyIdsIt->second.end()) {
      easings_->release(it->second);
      propertyIdsIt->second.erase(it);
    }
    if (propertyIdsIt->second.empty()) {
      easingIds_.erase(propertyIdsIt);
    }
  }
  // A property without an id was never routed, so there is nothing to remove.
  if (const auto propertyId = platformPropertyId(propertyName); propertyId.has_value()) {
    remove_(static_cast<int>(viewTag), *propertyId);
  }
}

} // namespace reanimated
